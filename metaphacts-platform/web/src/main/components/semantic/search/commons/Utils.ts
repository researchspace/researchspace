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

import * as maybe from 'data.maybe';

import { Rdf } from 'platform/api/rdf';
import { InitialQueryContext } from '../web-components/SemanticSearchApi';

/**
 * Set base query domain if it is defined
 */
export function setSearchDomain(domain: string | undefined, context: InitialQueryContext) {
  return context.searchProfileStore.chain(
    profileStore =>
      maybe.fromNullable(domain).map(Rdf.fullIri).chain(
        iri => maybe.fromNullable(profileStore.categories.get(iri))
      )
  ).map(
    context.setDomain
  );
}
