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

import { Rdf } from 'platform/api/rdf';
import { QueryContext } from 'platform/api/sparql';

import { BaseResourceService } from './BaseResourceService';

const THUMBNAIL_SERVICE_URL = `/rest/data/rdf/utils/thumbnails/default`;
const service = new BaseResourceService(THUMBNAIL_SERVICE_URL);

export function getThumbnail(iri: Rdf.Iri, options?: { context?: QueryContext }) {
  return service.getResource(iri, options ? options.context : undefined);
}

export function getThumbnails(iris: ReadonlyArray<Rdf.Iri>, options?: { context?: QueryContext }) {
  return service.getResources(iris, options ? options.context : undefined);
}
