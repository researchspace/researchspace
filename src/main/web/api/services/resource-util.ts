/**
 * ResearchSpace
 * Copyright (C) 2025, © Kartography Community Interest Company
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

const RESOURCE_UTIL_SERVICE_URL = '/rest/data/rdf/utils';

export async function getPrimaryAppellation(
  iri: Rdf.Iri,
  repository?: string
): Promise<string> {
  const repositoryId = repository||"default";

  try {
    const response = await request
      .get(`${RESOURCE_UTIL_SERVICE_URL}/getPrimaryAppellation`)
      .query({ iri: iri.value, repository: repositoryId })
      .accept('text/plain');

    const value = response.text;
    return value;

  } catch (err) {
    console.error('Error fetching resource configuration for', iri.value, err);
    throw err;
  }
}

export async  function getObservedEntity(
  iri: Rdf.Iri,
  repository?: string
): Promise<string> {
  const repositoryId = repository||"default";

  try {
    const response = await request
      .get(`${RESOURCE_UTIL_SERVICE_URL}/getObservedEntity`)
      .query({ iri: iri.value, repository: repositoryId })
      .accept('text/plain');

    const value = response.text;
    return value;
  } catch (err) {
    console.error('Error fetching resource configuration for', iri.value, err);
    throw err;
  }
}
