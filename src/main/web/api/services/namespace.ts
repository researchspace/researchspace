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

import * as Kefir from 'kefir';
import * as request from 'platform/api/http';
import * as I from 'immutable';

import { Rdf } from 'platform/api/rdf';
import { requestAsProperty } from 'platform/api/async';
import { namespaceService } from './NamespaceService';

export interface NamespaceRecord {
  prefix: string;
  iri: string;
  appId: string;
}

export const GET_REGISTERED_PREFIXES = '/rest/data/rdf/namespace/getRegisteredPrefixes';
const GET_RECORDS = '/rest/data/rdf/namespace/getRecords';
const PUT_PREFIX = '/rest/data/rdf/namespace/setPrefix';
const DELETE_PREFIX = '/rest/data/rdf/namespace/deletePrefix';

export function getPrefixedUri(iri: Rdf.Iri): Data.Maybe<string> {
  return namespaceService.getPrefixedIRI(iri);
}

export function getFullIri(prefixedIri: string): Data.Maybe<Rdf.Iri> {
  return namespaceService.resolveToIRI(prefixedIri);
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

export function isSystemNamespacePrefix(prefix: string) {
  // either empty or starts with uppercase letter
  return prefix.length === 0 || prefix[0] === prefix[0].toUpperCase();
}
