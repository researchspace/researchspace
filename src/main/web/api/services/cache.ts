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

const POST_INVALIDATE_ALL = '/rest/cache/all/invalidate';

/**
 * Invalidate all caches.
 */
export function invalidateAllCaches() {
  return sendRequest(POST_INVALIDATE_ALL);
}

/**
 * Invalidate all caches for the specific resource.
 */
export function invalidateCacheForResource(resource: Rdf.Iri) {
  const url = POST_INVALIDATE_ALL + '/' + encodeURIComponent(resource.value);
  return sendRequest(url);
}

function sendRequest(url: string): Kefir.Property<string> {
  const req = request.post(url);
  return Kefir.fromNodeCallback<string>((cb) => req.end((err, res) => cb(err, res.text))).toProperty();
}
