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

import * as Maybe from 'data.maybe';
import * as Kefir from 'kefir';
import * as request from 'superagent';
import * as _ from 'lodash';
import * as I from 'immutable';

import { Rdf } from 'platform/api/rdf';
import { BatchedPool } from 'platform/api/async';

module NamespaceService {
  const GET_FULL_URIS_URL = '/rest/data/rdf/namespace/getFullUris';
  const GET_PREFIXED_URIS_URL = '/rest/data/rdf/namespace/getPrefixedUris';
  export const GET_REGISTERED_PREFIXES = '/rest/data/rdf/namespace/getRegisteredPrefixes';
  const PUT_PREFIX = '/rest/data/rdf/namespace/setPrefix';
  const DELETE_PREFIX = '/rest/data/rdf/namespace/deletePrefix';

  const pool = new BatchedPool<Rdf.Iri, Data.Maybe<string>>({
    fetch: iris => getPrefixedIris(iris.toArray()),
  });

  export function getPrefixedUri(iri: Rdf.Iri): Kefir.Property<Data.Maybe<string>> {
    return pool.query(iri);
  }

  export function getPrefixedIris(
    iris: Rdf.Iri[]
  ): Kefir.Property<I.Map<Rdf.Iri, Data.Maybe<string>>> {
    return resolveIri(
      GET_PREFIXED_URIS_URL, _.map(iris, iri => iri.value)
    ).map(
      res => I.Map(res).mapEntries(
        entry => [Rdf.iri(entry[0]), Maybe.fromNullable<string>(entry[1])]
      )
    );
  }

  export function getFullIri(prefixedIri: string): Kefir.Property<Data.Maybe<Rdf.Iri>> {
    return getFullIris([prefixedIri]).map(
      res => res.get(prefixedIri)
    );
  }

  export function getFullIris(iris: string []): Kefir.Property<I.Map<string, Data.Maybe<Rdf.Iri>>> {
    return resolveIri(GET_FULL_URIS_URL, iris).map(
      res => I.Map(res).mapEntries(
        entry => [entry[0], Maybe.fromNullable<string>(entry[1]).map(Rdf.iri)]
      )
    );
  }

  export function getRegisteredPrefixes(): Kefir.Property<{[key: string]: string}> {
    const req = request
        .get(GET_REGISTERED_PREFIXES)
        .type('application/json')
        .accept('application/json');
    return Kefir.fromNodeCallback(
      (cb) => req.end((err, res) => cb(err, res.body))
    ).toProperty();
  }

  export function setPrefix(prefix: string, ns: string) {
    const req = request
        .put(PUT_PREFIX + '/' + prefix)
        .type('text/plain')
        .send(ns);

    return Kefir.fromNodeCallback(
      (cb) => req.end((err, res: request.Response) => {
        cb(err != null ? err.message : null, res.ok ? true : null);
      })
    );
  }

  export function deletePrefix(prefix: string) {
    const req = request
        .del(DELETE_PREFIX + '/' + prefix);

    return Kefir.fromNodeCallback(
        (cb) => req.end((err, res: request.Response) => {
          cb(err != null ? err.message : null, res.ok ? true : null);
        })
    );
  }

  function resolveIri(url: string, iris: string[]): Kefir.Property<{[key: string]: string}> {
    const req = request
        .post(url)
        .send(iris)
        .type('application/json')
        .accept('application/json');
    return Kefir.fromNodeCallback(
      (cb) => req.end((err, res) => cb(err, res.body))
    ).toProperty();
  }
}

export = NamespaceService;
