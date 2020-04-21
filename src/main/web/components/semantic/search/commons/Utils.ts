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

import * as maybe from 'data.maybe';

import { Rdf } from 'platform/api/rdf';
import { InitialQueryContext } from '../web-components/SemanticSearchApi';

/**
 * Set base query domain if it is defined
 */
export function setSearchDomain(domain: string | undefined, context: InitialQueryContext) {
  return context.searchProfileStore
    .chain((profileStore) =>
      maybe
        .fromNullable(domain)
        .map(Rdf.fullIri)
        .chain((iri) => maybe.fromNullable(profileStore.categories.get(iri)))
    )
    .map(context.setDomain);
}
