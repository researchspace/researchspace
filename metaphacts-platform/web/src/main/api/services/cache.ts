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
  return Kefir.fromNodeCallback<string>(
    cb => req.end((err, res) => cb(err, res.text))
  ).toProperty();
}
