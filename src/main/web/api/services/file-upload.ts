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

import * as request from 'platform/api/http';
import * as Kefir from 'kefir';

import { Rdf } from 'platform/api/rdf';

export const FILEUPLOAD_SERVICEURL = '/file-upload';

class FileUpload {
  public uploadFile(options: {
    createResourceQuery: string;
    generateIdQuery: string;
    storage: string;
    metadataExtractor: string;
    contextUri: string;
    file: File;
    contentType: string;
    onProgress: (percent: number) => void;
  }): Kefir.Property<Rdf.Iri> {
    const req = request
      .post(FILEUPLOAD_SERVICEURL)
      .field('createResourceQuery', options.createResourceQuery)
      .field('generateIdQuery', options.generateIdQuery)
      .field('storage', options.storage)
      .field('metadataExtractor', options.metadataExtractor || '')
      .field('contextUri', options.contextUri)
      // .type(options.contentType)
      .attach('image', options.file as any)
      .on('progress', (e) => options.onProgress(<number>e.percent));
    return Kefir.fromNodeCallback<Rdf.Iri>((cb) =>
      req.end((err, res: request.Response) => {
        cb(err != null ? err.message : null, res.ok ? Rdf.iri(res.header['location']) : null);
      })
    ).toProperty();
  }

  public getMimeType(file: File): string {
    const fileEnding = file.name.split('.').pop().toLowerCase().trim();
    switch (fileEnding) {
      case 'jpg':
        return 'image/jpeg';
      default:
        return 'application/octet-stream';
    }
  }
}

export const FileUploadService = new FileUpload();
