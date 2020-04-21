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
import * as Immutable from 'immutable';
import * as _ from 'lodash';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';

module RdfService {
  export function getRdfTypes(resource: Rdf.Iri): Kefir.Property<Immutable.List<Rdf.Iri>> {
    const bindingName = 'type';
    const query = 'SELECT ?type WHERE { <' + resource.value + '> a ?type}';
    return SparqlClient.select(query).map((r: SparqlClient.SparqlSelectResult) => {
      var list = _.reduce<SparqlClient.Dictionary<Rdf.Node>, Rdf.Iri[]>(
        r.results.bindings,
        (total, b) => {
          total.push(<Rdf.Iri>b[bindingName]);
          return total;
        },
        []
      );
      return Immutable.List<Rdf.Iri>(list);
    });
  }
}

export = RdfService;
