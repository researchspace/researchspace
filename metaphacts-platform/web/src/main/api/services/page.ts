/*
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

import * as request from 'platform/api/http';
import * as Kefir from 'kefir';
import { pick } from 'lodash';

import { requestAsProperty } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';

import { getPreferredUserLanguage } from './language';
import { purgeTemplateCache } from './template';

export interface TemplateContent {
  appId: string | null;
  revision: string | null;
  source: string;
  definedByApps: ReadonlyArray<string>;
  applicableTemplates: string[];
  appliedTemplate: string;
  includes: string[];
}

interface RenderedTemplate {
  jsurls: string[];
  templateHtml: string;
}

export interface RevisionInfo {
  appId: string;
  iri: string;
  revision: string | undefined;
}

const REVISION_INFO_TEMPLATE: { [K in keyof RevisionInfo]: null } = {
  appId: null,
  iri: null,
  revision: null,
};
/** Compiler-enforced array with all the keys of revision info */
const REVISION_INFO_KEYS = Object.keys(REVISION_INFO_TEMPLATE);

export interface TemplateInfo extends RevisionInfo {
  author: string;
  date?: string;
}

export interface TemplateStorageStatus {
  appId: string;
  writable: boolean;
}

export module PageService {
  const GET_SOURCE = '/rest/template/source';
  const GET_PAGE_HTML = '/rest/template/pageHtml';
  const GET_HTML = '/rest/template/html';
  const PUT_SOURCE = '/rest/template/source';
  const GET_ALL_INFO = '/rest/template/getAllInfo';
  const POST_EXPORT_REVISIONS = '/rest/template/exportRevisions';
  const DELETE_REVISIONS = '/rest/template/deleteRevisions';
  const GET_STORAGE_STATUS = '/rest/template/storageStatus';

  export function loadTemplateSource(iri: string): Kefir.Property<TemplateContent> {
    const req = request
        .get(GET_SOURCE)
        .query({iri: iri})
        .type('application/json')
        .accept('application/json');

    return requestAsProperty(req)
      .mapErrors(err => err.status)
      .map(res => JSON.parse(res.text) as TemplateContent);
  }

  export function loadPageTemplateHtml(iri: Rdf.Iri): Kefir.Property<{ templateHtml: string }> {
    const req = request
      .get(GET_PAGE_HTML)
      .query({
        iri: iri.value,
        preferredLanguage: getPreferredUserLanguage(),
      })
      .type('application/json')
      .accept('application/json');

    return requestAsProperty(req)
      .map(res => JSON.parse(res.text));
  }

  export function loadRenderedTemplate(
    iri: Rdf.Iri, contextIri?: Rdf.Iri, params?: { [index: string]: string }
  ): Kefir.Property<RenderedTemplate> {
    const req = request
        .get(GET_HTML)
        .query({
          iri: iri.value,
          preferredLanguage: getPreferredUserLanguage(),
        })
        .query(params)
        .type('application/json')
        .accept('application/json');

    if (contextIri) {
      req.query({context: contextIri.value});
    }

    return requestAsProperty(req)
      .mapErrors(err => err.rawResponse)
      .map(res => JSON.parse(res.text) as RenderedTemplate);
  }

  export function save(params: {
    iri: string;
    targetAppId: string;
    sourceAppId?: string;
    sourceRevision?: string;
    rawContent: string;
  }): Kefir.Property<boolean> {
    const {iri, targetAppId, sourceAppId, sourceRevision, rawContent} = params;
    purgeTemplateCache();
    const req = request
        .put(PUT_SOURCE)
      .query({
        iri,
        targetAppId,
        sourceAppId,
        sourceRevision,
      })
        .send(rawContent)
        .type('text/html')
        .accept('application/json');

    return requestAsProperty(req)
      .mapErrors(err => err.rawResponse)
      .map(res => res.status === 201);
  }

  export function getAllTemplateInfos(): Kefir.Property<TemplateInfo[]> {
    const req = request
        .get(GET_ALL_INFO)
        .type('application/json')
        .accept('application/json');

    return requestAsProperty(req)
      .mapErrors(err => err.response.statusText)
      .map(res => JSON.parse(res.text));
  }

  export function deleteTemplateRevisions(
    selected: ReadonlyArray<RevisionInfo>
  ): Kefir.Property<boolean> {
    const req = request
        .del(DELETE_REVISIONS)
        .type('application/json')
        .send(selected.map(cleanRevisionInfo));

    return requestAsProperty(req)
      .map(res => true);
  }

  export function exportTemplateRevisions(
    selected: ReadonlyArray<RevisionInfo>
  ): Kefir.Property<request.Response> {
    const req = request
        .post(POST_EXPORT_REVISIONS)
        .type('application/json')
        .accept('application/zip' )
        .on('request', function (re) {
          re.xhr.responseType = 'arraybuffer'; // or blob
        })
        .send(selected.map(cleanRevisionInfo));

    return requestAsProperty(req)
      .mapErrors(err => err.response.statusText);
  }

  export function getStorageStatus(): Kefir.Property<TemplateStorageStatus[]> {
    const req = request
      .get(GET_STORAGE_STATUS)
      .accept('application/json');

    return requestAsProperty(req)
      .mapErrors(err => err.response.statusText)
      .map(res => JSON.parse(res.text) as TemplateStorageStatus[]);
  }
}

/**
 * Removes extra properties from template revision info to
 * avoid server error when trying to deserialize object.
 */
function cleanRevisionInfo(info: RevisionInfo): RevisionInfo {
  return pick(info, REVISION_INFO_KEYS);
}
