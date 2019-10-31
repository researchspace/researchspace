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

import { use, expect } from 'chai';
import * as chaiString from 'chai-string';
use(chaiString);

import * as SparqlJs from 'sparqljs';

import { SparqlUtil } from 'platform/api/sparql';
const { Sparql, serializeQuery } = SparqlUtil;

describe('SparqlUtil', function() {

  it('Use Sparql string template function to parse the query', function() {
    SparqlUtil.init({
      foaf: 'http://xmlns.com/foaf/0.1/',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    });
    const query: SparqlJs.SparqlQuery =
        Sparql`
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
