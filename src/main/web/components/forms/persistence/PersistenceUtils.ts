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

import * as SparqlJs from 'sparqljs';

import { SparqlUtil } from 'platform/api/sparql';

/**
 * Util to parse and cast an queryString to an SparqlJs.Update object.
 * Emits an error otherwise.
 *
 * @param {string | undefined} queryString SPARQL update query.
 */
export function parseQueryStringAsUpdateOperation(queryString: string | undefined): SparqlJs.Update {
  if (!queryString) {
    return undefined;
  }
  const query = SparqlUtil.parseQuery(queryString);
  if (query.type === 'update') {
    return query;
  } else {
    throw new Error('Specified deletePattern or insertPattern is not an update query.');
  }
}

/**
 * Add WITH clause to UPDATE query to fully execute it on specific named graph.
 */
export function withNamedGraph(
  query: SparqlJs.Update, targetGraphIri?: string
): SparqlJs.Update {
  if (targetGraphIri) {
    // graph property on update opertian is missing is SparqlJs d.ts file
    query.updates.forEach(u => u['graph'] = targetGraphIri);
  }
  return query;
}

/**
 * Add GRAPH clause to INSERT part of the UPDATE query to fully execute it on specific named graph.
 */
export function addInsertIntoGraph(
  query: SparqlJs.Update, targetGraphIri?: string
): SparqlJs.Update {
  query.updates.forEach(u => {
    const insertOrDelete = u as SparqlJs.InsertDeleteOperation;
    if (insertOrDelete.updateType === 'insertdelete') {
      insertOrDelete.insert =
        [{
          type: 'graph',
          name: targetGraphIri as SparqlJs.Term,
          triples: insertOrDelete.insert[0].triples,
        }];
    }
  });
  return query;
}
