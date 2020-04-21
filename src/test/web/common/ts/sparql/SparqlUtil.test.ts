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

import { use, expect } from 'chai';
import * as chaiString from 'chai-string';
use(chaiString);

import * as SparqlJs from 'sparqljs';

import { SparqlUtil } from 'platform/api/sparql';
const { Sparql, serializeQuery } = SparqlUtil;

describe('SparqlUtil', function () {
  it('Use Sparql string template function to parse the query', function () {
    SparqlUtil.init({
      foaf: 'http://xmlns.com/foaf/0.1/',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    });
    const query: SparqlJs.SparqlQuery = Sparql`
          PREFIX foaf: <http://xmlns.com/foaf/0.1/>
          PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
          SELECT ?s WHERE {
            ?s a foaf:Person ;
               rdfs:label ?label .
          }
        `;

    const expected = [
      'PREFIX foaf: <http://xmlns.com/foaf/0.1/>',
      'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
      'SELECT ?s WHERE {',
      '  ?s <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> foaf:Person;',
      '    rdfs:label ?label.',
      '}',
    ].join('\n');

    expect(serializeQuery(query)).to.be.equal(expected);
  });
});
