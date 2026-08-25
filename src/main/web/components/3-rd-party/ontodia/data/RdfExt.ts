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
import { uniqWith } from 'lodash';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';

/**
 * Returns graph to build diagram by sparql query
 * Will run on default context
 */
export function getRdfGraphBySparqlQuery(query: string, repositories: string[]): Promise<Rdf.Triple[]> {
  return Kefir.combine(repositories.map((repository) => SparqlClient.construct(query, { context: { repository } })))
    .map(tripleGroups => {
      const triples: Rdf.Triple[] = [];
      for (const group of tripleGroups) {
        for (const triple of group) {
          triples.push(triple);
        }
      }
      // dedup: the same triple from multiple repositories would duplicate links
      return tripleGroups.length > 1
        ? uniqWith(triples, (a, b) => a.s.equals(b.s) && a.p.equals(b.p) && a.o.equals(b.o))
        : triples;
    })
    .toPromise();
}
