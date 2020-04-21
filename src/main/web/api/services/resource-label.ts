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

import { Rdf } from 'platform/api/rdf';
import { QueryContext } from 'platform/api/sparql';

import { getPreferredUserLanguage } from 'platform/api/services/language';

import { BaseResourceService } from './BaseResourceService';

const LABELS_SERVICE_URL = '/rest/data/rdf/utils/getLabelsForRdfValue';
const service = new (class extends BaseResourceService {
  constructor() {
    super(LABELS_SERVICE_URL);
  }

  createRequest(resources: string[], repository: string) {
    const request = super.createRequest(resources, repository);
    const preferredLanguage = getPreferredUserLanguage();
    request.query({ preferredLanguage });
    return request;
  }
})();

export function getLabel(iri: Rdf.Iri, options?: { context?: QueryContext }) {
  return service.getResource(iri, options ? options.context : undefined);
}

export function getLabels(iris: ReadonlyArray<Rdf.Iri>, options?: { context?: QueryContext }) {
  return service.getResources(iris, options ? options.context : undefined);
}
