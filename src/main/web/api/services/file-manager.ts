/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { post, del, Response } from 'superagent';
import * as Kefir from 'kefir';
import * as URI from 'urijs';

import { LdpService } from 'platform/api/services/ldp';
import { Rdf, vocabularies } from 'platform/api/rdf';
import { requestAsProperty } from 'platform/api/async';

export const FILE_UPLOAD_SERVICE_URL = '/file';
export const FILE_LDP_CONTAINER_ID = 'http://www.researchspace.org/resource/system/fileContainer';

export const FILE_URL = '';
export const ADMIN_URL = '/direct';
export const TEMPORARY_STORAGE_URL = '/temporary';
export const MOVE_URL = '/move';

const { VocabPlatform } = vocabularies;

export const RESOURCE_QUERY = `
  CONSTRUCT {
    ?__resourceIri__ a <${VocabPlatform.File.value}>.
    ?__resourceIri__ <${VocabPlatform.fileName.value}> ?__fileName__.
    ?__resourceIri__ <${VocabPlatform.mediaType.value}> ?__mediaType__.
    ?__resourceIri__ <${VocabPlatform.fileContext.value}> ?__contextUri__.
  } WHERE {}
`;

export interface FileResource {
  iri: Rdf.Iri;
  fileName: string;
  mediaType: string;
}

export class FileManager {
  private readonly repository: string;
  private readonly ldp: LdpService;

  constructor(options: { repository: string }) {
    const { repository } = options;
    this.repository = repository;
    this.ldp = new LdpService(FILE_LDP_CONTAINER_ID, { repository });
  }

  /**
   * @returns file resource IRI
   */
  uploadFileAsResource(options: {
    file: File;
    storage: string;
    contextUri?: string;
    generateIriQuery?: string;
    resourceQuery?: string;
    onProgress?: (percent: number) => void;
    fileNameHack?: boolean;
  }): Kefir.Property<Rdf.Iri> {
    if (!options.storage) {
      return Kefir.constantError<any>(new Error('Storage is undefined!'));
    }

    const request = post(FILE_UPLOAD_SERVICE_URL + FILE_URL)
      .attach('file', options.file as any)
      .field('fileSize', `${options.file.size}`)
      .field('storage', options.storage)
      .field('repository', this.repository)
      .field('createResourceQuery', options.resourceQuery || RESOURCE_QUERY)
      .field('generateIriQuery', options.generateIriQuery || '')
      .field('contextUri', options.contextUri || '')
      .field('fileNameHack', options.fileNameHack ? 'true' : '')
      .on('progress', (e) => {
        if (options.onProgress) {
          options.onProgress(e.percent as number);
        }
      });

    return requestAsProperty(request).map((response) => {
      const fileIri = Rdf.iri(response.header.location);
      return fileIri;
    });
  }

  /**
   * @returns object ID of the uploaded file, including object kind prefix "file/"
   */
  uploadFileDirectlyToStorage(options: {
    file: File;
    storage: string;
    folder: string;
    fileName?: string;
    onProgress?: (percent: number) => void;
  }): Kefir.Property<string> {
    if (!options.storage) {
      return Kefir.constantError<any>(new Error('Storage is undefined!'));
    }
    if (!options.folder) {
      return Kefir.constantError<any>(new Error('Path is undefined!'));
    }

    const request = post(FILE_UPLOAD_SERVICE_URL + ADMIN_URL)
      .attach('file', options.file as any)
      .field('fileSize', `${options.file.size}`)
      .field('storage', options.storage)
      .field('folder', options.folder)
      .field('fileName', options.fileName || '')
      .on('progress', (e) => {
        if (options.onProgress) {
          options.onProgress(<number>e.percent);
        }
      });

    return requestAsProperty(request).map((response) => {
      return response.ok ? response.text : null;
    });
  }

  /**
   * Uploads file to temporary storage and returns its description.
   *
   * @returns file resource IRI
   */
  public uploadFileTemporary(options: {
    file: File;
    storage: string;
    onProgress?: (percent: number) => void;
  }): Kefir.Property<Rdf.Iri> {
    if (!options.storage) {
      return Kefir.constantError<any>(new Error('Storage is undefined!'));
    }

    const request = post(FILE_UPLOAD_SERVICE_URL + TEMPORARY_STORAGE_URL)
      .attach('file', options.file as any)
      .field('fileSize', `${options.file.size}`)
      .field('storage', options.storage)
      .on('progress', (e) => {
        if (options.onProgress) {
          options.onProgress(<number>e.percent);
        }
      });

    return requestAsProperty(request).map((response) =>
      TemporaryFileSchema.encodeAsIri(response.text, options.file.type)
    );
  }

  /**
   * @returns file resource IRI
   */
  createResourceFromTemporaryFile(options: {
    fileName: string;
    storage: string;
    temporaryStorage: string;
    contextUri?: string;
    mediaType: string;
    generateIriQuery?: string;
    resourceQuery?: string;
    onProgress?: (percent: number) => void;
  }): Kefir.Property<Rdf.Iri> {
    const request = post(FILE_UPLOAD_SERVICE_URL + MOVE_URL)
      .field('fileName', options.fileName)
      .field('storage', options.storage)
      .field('temporaryStorage', options.temporaryStorage)
      .field('repository', this.repository)
      .field('createResourceQuery', options.resourceQuery || RESOURCE_QUERY)
      .field('mediaType', options.mediaType)
      .field('generateIriQuery', options.generateIriQuery || '')
      .field('contextUri', options.contextUri || '')
      .on('progress', (e) => {
        if (options.onProgress) {
          options.onProgress(<number>e.percent);
        }
      });

    return requestAsProperty(request).map((response) => {
      const fileIri = Rdf.iri(response.header.location);
      return fileIri;
    });
  }

  deleteFileResource(
    resourceIri: Rdf.Iri,
    storage: string,
    options?: {
      namePredicateIri?: string;
      mediaTypePredicateIri?: string;
    },
  ): Kefir.Property<Response> {
    return this.getFileResource(resourceIri, options)
      .flatMap((resource) => {
        const request = del(FILE_UPLOAD_SERVICE_URL + FILE_URL)
          .field('fileName', resource.fileName)
          .field('storage', storage)
          .field('repository', this.repository)
          .field('resourceIri', resource.iri.value);

        return requestAsProperty(request);
      })
      .toProperty();
  }

  removeTemporaryResource(resourceIri: Rdf.Iri, storage: string): Kefir.Property<Response> {
    const { fileName } = TemporaryFileSchema.decodeFromIri(resourceIri);
    const request = del(FILE_UPLOAD_SERVICE_URL + TEMPORARY_STORAGE_URL)
      .field('fileName', fileName)
      .field('storage', storage);

    return requestAsProperty(request);
  }

  getFileResourceGraph(resourceIri: Rdf.Iri): Kefir.Property<Rdf.Graph> {
    return this.ldp.get(resourceIri);
  }

  getFileResource(
    resourceIri: Rdf.Iri,
    options?: {
      namePredicateIri?: string;
      mediaTypePredicateIri?: string;
    }
  ): Kefir.Property<FileResource> {
    if (TemporaryFileSchema.isEncodedIri(resourceIri)) {
      const { fileName, mediaType } = TemporaryFileSchema.decodeFromIri(resourceIri);
      return Kefir.constant({ iri: resourceIri, fileName, mediaType });
    } else {
      options = options || {};
      const namePredicateIri = options.namePredicateIri || VocabPlatform.fileName.value;
      const mediaTypePredicateIri = options.mediaTypePredicateIri || VocabPlatform.mediaType.value;

      return this.getFileResourceGraph(resourceIri)
        .flatMap((graph) => {
          const triples = graph.triples;
          const resource: FileResource = {
            iri: resourceIri,
            fileName: triples.find((tripple) => {
              return tripple.p.value === namePredicateIri;
            }).o.value,
            mediaType: triples.find((tripple) => {
              return tripple.p.value === mediaTypePredicateIri;
            }).o.value,
          };

          if (resource.fileName && resource.mediaType) {
            return Kefir.constant<FileResource>(resource);
          } else {
            return Kefir.constantError<any>(
              new Error(`Either 'fileName' or 'mediaType' properties not found in the file resource graph`)
            );
          }
        })
        .toProperty();
    }
  }

  static getFileUrl(fileName: string, storage: string): string {
    return new URI(FILE_UPLOAD_SERVICE_URL)
      .addQuery({
        fileName: fileName,
        storage: storage,
      })
      .toString();
  }

  static isTemporaryResource(resourceIri: Rdf.Iri): boolean {
    return TemporaryFileSchema.isEncodedIri(resourceIri);
  }
}

// These functions are used by FileInput and FileVisualizer component
// to store and visualize temporary state of FileInput component
function createTemporaryResource(fileName: string, mediaType: string): FileResource {
  return {
    iri: TemporaryFileSchema.encodeAsIri(fileName, mediaType),
    fileName,
    mediaType,
  };
}

/**
 * Represents temporary file description into an IRI with custom schema.
 * This IRIs are natively supported by FileInput and FileVizualizer components,
 * but should not be persisted anywhere and only stored in-memory.
 */
namespace TemporaryFileSchema {
  const SCHEMA_PREFIX = 'mp-temporary-file:';

  export function isEncodedIri(iri: Rdf.Iri): boolean {
    return iri.value.startsWith(SCHEMA_PREFIX);
  }

  export function encodeAsIri(fileName: string, mediaType: string): Rdf.Iri {
    const encodedMediaType = encodeURIComponent(mediaType);
    const encodedName = encodeURIComponent(fileName);
    return Rdf.iri(`${SCHEMA_PREFIX}${encodedMediaType}/${encodedName}`);
  }

  export function decodeFromIri(encoded: Rdf.Iri): { mediaType: string; fileName: string } {
    if (!isEncodedIri(encoded)) {
      throw new Error(`IRI is not an encoded temporary file: ${encoded}`);
    }
    const bufferString = encoded.value.substring(SCHEMA_PREFIX.length);
    const [encodedMediaType, encodedName] = bufferString.split('/');
    if (!(encodedMediaType && encodedName)) {
      throw new Error(`Failed to decode temporary file IRI: ${encoded}`);
    }
    return {
      mediaType: decodeURIComponent(encodedMediaType),
      fileName: decodeURIComponent(encodedName),
    };
  }
}
