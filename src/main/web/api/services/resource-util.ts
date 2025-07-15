/**
 * ResearchSpace
 * Copyright (C) 2022, © Kartography Community Interest Company
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as _ from 'lodash';
import { Rdf } from 'platform/api/rdf';
import * as request from 'platform/api/http';

import Basil = require('basil.js');
const RESOURCE_UTIL_SERVICE_URL = '/rest/data/rdf/utils';
const TTL_MS = 60 * 60 * 1000; // 1 hour

const storage = new Basil({
  storages: ['local', 'memory'],
  namespace: 'rs-resource-util',
});

interface CacheEntry {
  value: string;
  timestamp: number;
}

function cacheSet(key: string, value: string): void {
  const entry: CacheEntry = { value, timestamp: Date.now() };
  storage.set(key, JSON.stringify(entry));
}

function cacheGet(key: string, ttlMs: number): string | null {
  const raw = storage.get(key);
  if (!raw) return null;

  try {
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.timestamp > ttlMs) {
      storage.remove(key);
      console.log(`Cache expired for key: ${key}`);
      return null;
    }
    return entry.value;
  } catch {
    storage.remove(key);
    console.warn(`Invalid cache entry for key: ${key}, discarding`);
    return null;
  }
}

export function getPrimaryAppellation(
  iri: Rdf.Iri,
  repository?: string
): string {
  const hash = Rdf.hashString(iri.value)+"appellation";
  const repositoryId = repository||"default";

  // 1) Try TTL-checked cache
  const cached = cacheGet(hash.toString(), TTL_MS);
  if (cached !== null) {
    console.log('Returning cached configuration for', cached+" "+iri.value);
    return cached;
  }

  // 2) Cache miss → fetch from server
  try {
    const res = request
      .get(RESOURCE_UTIL_SERVICE_URL+"/getPrimaryAppellation")
      .query({ iri: iri.value, repository: repositoryId })
      .accept('text/plain').then(response => {

          const value = response.text;
          cacheSet(hash.toString(), value);
          console.log('Fetched & cached config for', iri.value);   
          return value;}
    );
  } catch (err) {
    console.error('Error fetching resource configuration for', iri.value, err);
    throw err;
  }
}

export function getObservedEntity(
  iri: Rdf.Iri,
  repository?: string
): string {
  const hash = Rdf.hashString(iri.value)+"observed";
  const repositoryId = repository||"default";

  // 1) Try TTL-checked cache
  const cached = cacheGet(hash.toString(), TTL_MS);
  if (cached !== null) {
    console.log('Returning cached configuration for', cached+" "+iri.value);
    return cached;
  }

  // 2) Cache miss → fetch from server
  try {
    const res = request
      .get(RESOURCE_UTIL_SERVICE_URL+"/getObservedEntity")
      .query({ iri: iri.value, repository: repositoryId })
      .accept('text/plain').then(response => {

          const value = response.text;
          cacheSet(hash.toString(), value);
          console.log('Fetched & cached config for', iri.value);   
          return value;}
    );
  } catch (err) {
    console.error('Error fetching resource configuration for', iri.value, err);
    throw err;
  }
}
