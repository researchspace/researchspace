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

import { expect } from 'chai';
import * as SparqlJs from 'sparqljs';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';

describe('SparqlClient.setBindings', () => {
  const parser = new SparqlJs.Parser({
    'owl': 'http://www.w3.org/2002/07/owl#',
    'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
    'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  });

  const parameters = {
    testLiteral: Rdf.literal('test, literal!'),
    testLang: Rdf.langLiteral('Кириллица', 'ru'),
    testDate: Rdf.literal(
      '2016-06-21T18:50:36Z',
      Rdf.iri('http://www.w3.org/2001/XMLSchema#date')),
    testIri: Rdf.iri('http:some-generic-iri'),
  };

  it('parametrizes SELECT with projection expressions, FROM and BIND', () => {
    const selectQuery = parser.parse(`
      SELECT REDUCED ?foo (CONCAT("apple "@en, ?testLiteral) AS ?bar)
      FROM <http://example.org/dft.ttl>
      FROM NAMED <http://example.org/bob>
      WHERE {
        ?foo a ?testIri.
        BIND(STR(?testDate) AS ?bar)
      }
    `) as SparqlJs.SelectQuery;

    const result: SparqlJs.SelectQuery = parser.parse(`
      SELECT REDUCED ?foo (CONCAT("apple "@en, "test, literal!"^^<http://www.w3.org/2001/XMLSchema#string>) AS ?bar)
      FROM <http://example.org/dft.ttl>
      FROM NAMED <http://example.org/bob>
      WHERE {
        ?foo <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http:some-generic-iri>.
        BIND(STR("2016-06-21T18:50:36Z"^^<http://www.w3.org/2001/XMLSchema#date>) AS ?bar)
      }
    `) as SparqlJs.SelectQuery;

    expect(SparqlClient.setBindings(selectQuery, parameters)).to.be.deep.equal(result);
  });

  it('parametrizes SELECT with GROUP, HAVING and ORDER', () => {
    const selectQuery = parser.parse(`
      SELECT * WHERE { }
      GROUP BY ?anything
      HAVING(?foo = 42 && ?testDate = 33)
      ORDER BY DESC(?testLiteral)
    `) as SparqlJs.SelectQuery;

    const result = parser.parse(`
      SELECT * WHERE {  }
      GROUP BY ?anything
      HAVING ((?foo = 42) && ("2016-06-21T18:50:36Z"^^<http://www.w3.org/2001/XMLSchema#date> = 33))
      ORDER BY DESC("test, literal!"^^<http://www.w3.org/2001/XMLSchema#string>)
    `) as SparqlJs.SelectQuery;

    expect(SparqlClient.setBindings(selectQuery, parameters)).to.be.deep.equal(result);
  });

  it('parametrizes CONSTRUCT query with FILTER and EXISTS', () => {
    const constructQuery = parser.parse(`
      CONSTRUCT {
        ?foo a ?testIri
      } WHERE {
        <s:bar> ?testIri ?foo
        FILTER(EXISTS { ?foo <s:p> ?testLiteral . FILTER(?foo = ?testLiteral) })
      }
    `) as SparqlJs.ConstructQuery;

    const result = parser.parse(`
      CONSTRUCT { ?foo <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http:some-generic-iri>. }
      WHERE {
        <s:bar> <http:some-generic-iri> ?foo.
        FILTER(EXISTS {
          ?foo <s:p> "test, literal!"^^<http://www.w3.org/2001/XMLSchema#string>.
          FILTER(?foo = "test, literal!"^^<http://www.w3.org/2001/XMLSchema#string>)
        })
      }
    `) as SparqlJs.ConstructQuery;

    expect(SparqlClient.setBindings(constructQuery, parameters)).to.deep.equal(result);
  });

  it('parametrizes DELETE-INSERT query', () => {
    const query = parser.parse(`
      DELETE { ?foo ?testIri ?testLiteral }
      INSERT { ?foo ?testIri ?testDate }
      WHERE {
        ?bar a ?testIri .
        ?foo <s:p> ?bar
      }
    `) as SparqlJs.Update;

    const result = parser.parse(`
      DELETE { ?foo <http:some-generic-iri> "test, literal!"^^<http://www.w3.org/2001/XMLSchema#string>. }
      INSERT { ?foo <http:some-generic-iri> "2016-06-21T18:50:36Z"^^<http://www.w3.org/2001/XMLSchema#date>. }
      WHERE {
        ?bar a <http:some-generic-iri> .
        ?foo <s:p> ?bar.
      }
    `) as SparqlJs.Update;

    expect(SparqlClient.setBindings(query, parameters)).to.deep.equal(result);
  });

  it('parametrizes INSERT query with GRAPH pattern', () => {
    const query = parser.parse(`
      INSERT {
        GRAPH <s:g> { ?foo <s:p> ?testDate }
      } WHERE {}
    `) as SparqlJs.Update;

    const result = parser.parse(`
      INSERT {
        GRAPH <s:g> {
          ?foo <s:p> "2016-06-21T18:50:36Z"^^<http://www.w3.org/2001/XMLSchema#date>.
        }
      } WHERE {}
    `) as SparqlJs.Update;

    expect(SparqlClient.setBindings(query, parameters)).to.deep.equal(result);
  });

  it('parametrizes DESCRIBE query with UNION and subquery', () => {
    const query = parser.parse(`
      DESCRIBE ?foo WHERE {
        { ?foo <s:p1> ?testIri }
        UNION
        {
          SELECT ?s (CONCAT(MIN(?bar), ?testLang) AS ?minName)
          WHERE { ?s ?testIri ?bar }
          GROUP BY ?bar
        }
      }
    `) as SparqlJs.DescribeQuery;

    const result = parser.parse(`
      DESCRIBE ?foo WHERE {
        { ?foo <s:p1> <http:some-generic-iri> }
        UNION
        {
          SELECT ?s (CONCAT(MIN(?bar), "Кириллица"@ru) AS ?minName)
          WHERE { ?s <http:some-generic-iri> ?bar }
          GROUP BY ?bar
        }
      }
    `) as SparqlJs.DescribeQuery;

    expect(SparqlClient.setBindings(query, parameters)).to.deep.equal(result);
  });

  it('parametrize SELECT query with GRAPH and SERVICE', () => {
    const query = parser.parse(`
      SELECT * WHERE {
        GRAPH ?testIri { ?foo <s:p1> ?testLiteral }
        SERVICE ?testIri { ?testDate <s:p2> ?bar }
      }
    `) as SparqlJs.SelectQuery;

    const result = parser.parse(`
      SELECT * WHERE {
        GRAPH <http:some-generic-iri> {
          ?foo <s:p1> "test, literal!"^^<http://www.w3.org/2001/XMLSchema#string>
        }
        SERVICE <http:some-generic-iri> {
          "2016-06-21T18:50:36Z"^^<http://www.w3.org/2001/XMLSchema#date> <s:p2> ?bar
        }
      }
    `) as SparqlJs.SelectQuery;

    expect(SparqlClient.setBindings(query, parameters)).to.deep.equal(result);
  });

  it('fails to substitute ?variable for "literal" in VALUES pattern', () => {
    const query = parser.parse(`
      SELECT * WHERE { VALUES(?testDate) { (42) } }
    `) as SparqlJs.SelectQuery;

    expect(() => SparqlClient.setBindings(query, parameters)).to.throw();
  });
});
