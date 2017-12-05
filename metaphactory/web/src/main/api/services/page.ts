/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

import * as request from 'superagent';
import * as Kefir from 'kefir';

import { Rdf } from 'platform/api/rdf';

import { purgeTemplateCache } from './template';

export interface TemplateContent {
  sourceHash: number
  source: string;
  applicableTemplates: string[];
  appliedTemplate: string;
  includes: string[];
}

interface RenderedTemplate {
  jsurls: string[];
  templateHtml: string;
}

export module PageService {

  const GET_SOURCE = '/rest/template/source';
  const GET_PAGE_HTML = '/rest/template/pageHtml';
  const GET_HTML = '/rest/template/html';
  const PUT_SOURCE = '/rest/template/source';
  const GET_ALL_INFO = '/rest/template/getAllInfo';
  const POST_EXPORT_REVISIONS = '/rest/template/exportRevisions';
  const DELETE_REVISIONS = '/rest/template/deleteRevisions';

  export function loadTemplateSource(iri: string): Kefir.Property<TemplateContent> {
    const req = request
        .get(GET_SOURCE)
        .query({iri: iri})
        .type('application/json')
        .accept('application/json');

        return Kefir.fromNodeCallback<TemplateContent>(
          (cb) => req.end((err, res: request.Response) => {
            cb(
              err != null ? err.status : null,
              res.ok ? <TemplateContent>JSON.parse(res.text) : null
            );
          })
        ).toProperty();
  }

  export function loadPageTemplateHtml(iri: Rdf.Iri): Kefir.Property<{ templateHtml: string }> {
    const req = request
      .get(GET_PAGE_HTML)
      .query({iri: iri.value})
      .type('application/json')
      .accept('application/json');

    return Kefir.fromPromise(
      req.then(response => JSON.parse(response.text))
    ).toProperty();
  }

  export function loadRenderedTemplate(
    iri: Rdf.Iri, contextIri?: Rdf.Iri, params?: { [index: string]: string }
  ): Kefir.Property<RenderedTemplate> {
    const req = request
        .get(GET_HTML)
        .query({iri: iri.value})
        .query(params)
        .type('application/json')
        .accept('application/json');

    if (contextIri) {
      req.query({context: contextIri.value});
    }

    return Kefir.fromNodeCallback<RenderedTemplate>(
      (cb) => req.end((err, res: request.Response) => {
        cb(
          err != null ? err.rawResponse : null,
          err == null && res.ok ? <RenderedTemplate>JSON.parse(res.text) : null
        );
      })
    ).toProperty();
  }

  export function save(
    iri: string,
    rawContent: string,
    sourceHash: number,
  ): Kefir.Property<any>{
    purgeTemplateCache();
    const req = request
        .put(PUT_SOURCE)
        .query({iri: iri, beforeModificationHash: sourceHash})
        .send(rawContent)
        .type('text/html')
        .accept('application/json');
    return Kefir.fromNodeCallback(
      (cb) => req.end((err, res: request.Response) => {
        cb(
          err != null ? err.rawResponse : null,
          res && res.status === 201 ? true : null
        );
      })
    ).toProperty();
  }

  export function getAllTemplateInfos(): Kefir.Property<any> {
    const req = request
        .get(GET_ALL_INFO)
        .type('application/json')
        .accept('application/json');

        return Kefir.fromNodeCallback(
          (cb) => req.end((err, res: request.Response) => {
            cb(
              err != null ? err.response.statusText : null,
              res.ok ? JSON.parse(res.text) : null
            );
          })
        ).toProperty();
  }

  export function deleteTemplateRevisions(
    selected: { [index: string]: string; }
  ): Kefir.Property<boolean> {
    const req = request
        .del(DELETE_REVISIONS)
        .type('application/json')
        .send(selected);

        return Kefir.fromNodeCallback<boolean>(
          (cb) => req.end((err, res: request.Response) => {
            cb(err != null ? err.response.statusText  : null, res.ok ? true : null );
          })
        ).toProperty();
  }

  export function exportTemplateRevisions(
    selected: { [index: string]: string; }
  ): Kefir.Property<request.Response> {
    const req = request
        .post(POST_EXPORT_REVISIONS)
        .type('application/json')
        .accept('application/zip' )
        .on('request', function (re) {
          re.xhr.responseType = 'arraybuffer'; // or blob
        })
        .send(selected);

        return Kefir.fromNodeCallback<request.Response>(
          (cb) => req.end((err, res: request.Response) => {
            cb(err != null ? err.response.statusText : null, res.ok ? res : null );
          })
        ).toProperty();
  }
}
