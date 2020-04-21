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

import * as Maybe from 'data.maybe';
import * as Kefir from 'kefir';
import * as request from 'platform/api/http';
import * as _ from 'lodash';
import * as I from 'immutable';

import { Rdf } from 'platform/api/rdf';
import { BatchedPool, requestAsProperty } from 'platform/api/async';

export interface NamespaceRecord {
  prefix: string;
  iri: string;
  appId: string;
}

const GET_FULL_URIS_URL = '/rest/data/rdf/namespace/getFullUris';
const GET_PREFIXED_URIS_URL = '/rest/data/rdf/namespace/getPrefixedUris';
export const GET_REGISTERED_PREFIXES = '/rest/data/rdf/namespace/getRegisteredPrefixes';
const GET_RECORDS = '/rest/data/rdf/namespace/getRecords';
const PUT_PREFIX = '/rest/data/rdf/namespace/setPrefix';
const DELETE_PREFIX = '/rest/data/rdf/namespace/deletePrefix';

const pool = new BatchedPool<Rdf.Iri, Data.Maybe<string>>({
  fetch: (iris) => getPrefixedIris(iris.toArray()),
});

export function getPrefixedUri(iri: Rdf.Iri): Kefir.Property<Data.Maybe<string>> {
  return pool.query(iri);
}

export function getPrefixedIris(iris: Rdf.Iri[]): Kefir.Property<I.Map<Rdf.Iri, Data.Maybe<string>>> {
  return resolveIri(
    GET_PREFIXED_URIS_URL,
    _.map(iris, (iri) => iri.value)
  ).map((res) =>
    I.Map(res)
      .mapEntries<Rdf.Iri, Data.Maybe<string>>((entry) => [Rdf.iri(entry[0]), Maybe.fromNullable<string>(entry[1])])
      .toMap()
  );
}

export function getFullIri(prefixedIri: string): Kefir.Property<Data.Maybe<Rdf.Iri>> {
  return getFullIris([prefixedIri]).map((res) => res.get(prefixedIri));
}

export function getFullIris(iris: string[]): Kefir.Property<I.Map<string, Data.Maybe<Rdf.Iri>>> {
  return resolveIri(GET_FULL_URIS_URL, iris).map((res) =>
    I.Map(res)
      .map((iri) => Maybe.fromNullable(iri).map(Rdf.iri))
      .toMap()
  );
}

export function getRegisteredPrefixes(): Kefir.Property<{ [key: string]: string }> {
  const req = request.get(GET_REGISTERED_PREFIXES).type('application/json').accept('application/json');
  return Kefir.fromNodeCallback<Record<string, string>>((cb) => req.end((err, res) => cb(err, res.body))).toProperty();
}

export function getNamespaceRecords(): Kefir.Property<NamespaceRecord[]> {
  const req = request.get(GET_RECORDS).type('application/json').accept('application/json');
  return requestAsProperty(req).map((res) => res.body);
}

export function setPrefix(prefix: string, ns: string, targetAppId: string): Kefir.Property<void> {
  const req = request
    .put(PUT_PREFIX + '/' + prefix)
    .query({ targetAppId })
    .type('text/plain')
    .send(ns);
  return requestAsProperty(req).map((res) => {});
}

export function deletePrefix(prefix: string, targetAppId: string): Kefir.Property<void> {
  const req = request.del(DELETE_PREFIX + '/' + prefix).query({ targetAppId });
  return requestAsProperty(req).map((res) => {});
}

function resolveIri(url: string, iris: string[]): Kefir.Property<{ [key: string]: string }> {
  const req = request.post(url).send(iris).type('application/json').accept('application/json');
  return Kefir.fromNodeCallback<Record<string, string>>((cb) =>
    req.end((err, res) => cb(err, res ? res.body : null))
  ).toProperty();
}

export function isSystemNamespacePrefix(prefix: string) {
  // either empty or starts with uppercase letter
  return prefix.length === 0 || prefix[0] === prefix[0].toUpperCase();
}
