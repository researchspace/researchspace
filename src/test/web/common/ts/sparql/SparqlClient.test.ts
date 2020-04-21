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
import { use, expect, assert } from 'chai';
import * as sinon from 'sinon';
import * as chaiString from 'chai-string';
use(chaiString);

import * as NamespaceService from 'platform/api/services/namespace';
sinon.stub(NamespaceService, 'getRegisteredPrefixes').callsFake(function () {
  return Kefir.constant({});
});

import { Rdf, vocabularies } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';

import { mockRequest } from 'platform-tests/mocks';

describe('SparqlClient', function () {
  mockRequest();

  it('SPARQL select query', function (done) {
    const rawResponse = JSON.stringify({
      head: {
        vars: ['x', 'y'],
      },
      results: {
        bindings: [
          {
            x: {
              type: 'uri',
              value: 'http://example.com/1',
            },
            y: {
              type: 'literal',
              value: 'Example1',
            },
          },
          {
            x: {
              type: 'uri',
              value: 'http://example.com/2',
            },
            y: {
              type: 'literal',
              datatype: 'http://www.w3.org/2001/XMLSchema#integer',
              value: '2',
            },
          },
          {
            x: {
              type: 'uri',
              value: 'http://example.com/3',
            },
            y: {
              type: 'literal',
              'xml:lang': 'en',
              value: 'Example3',
            },
          },
        ],
      },
    });

    const expectedResponse = {
      head: {
        vars: ['x', 'y'],
      },
      results: {
        distinct: undefined,
        ordered: undefined,
        bindings: [
          {
            x: Rdf.iri('http://example.com/1'),
            y: Rdf.literal('Example1'),
          },
          {
            x: Rdf.iri('http://example.com/2'),
            y: Rdf.literal('2', vocabularies.xsd.integer),
          },
          {
            x: Rdf.iri('http://example.com/3'),
            y: Rdf.langLiteral('Example3', 'en'),
          },
        ],
      },
    };

    const query = 'SELECT ?x ?y WHERE {?x ?p ?y.}';
    SparqlClient.select(query)
      .onValue((res) => {
        expect(res).to.be.deep.equal(expectedResponse);
        done();
      })
      .onError(done);

    expect(this.request.requestBody).to.be.equalIgnoreSpaces(query);
    expect(this.request.requestHeaders).to.be.deep.equal({
      'Content-Type': 'application/sparql-query;charset=utf-8',
      Accept: 'application/sparql-results+json',
    });

    this.request.respond(200, { 'Content-Type': 'application/sparql-results+json' }, rawResponse);
  });

  it('SPARQL construct query', function (done) {
    const rawResponse = `
        <http://example.com/1>  <http://example.com/p> "Example1".
        <http://example.com/2>  <http://example.com/p> "2"^^<http://www.w3.org/2001/XMLSchema#integer>.
        <http://example.com/3>  <http://example.com/p> "Example3"@en.
    `;

    const expectedResponse = [
      Rdf.triple(Rdf.iri('http://example.com/1'), Rdf.iri('http://example.com/p'), Rdf.literal('Example1')),
      Rdf.triple(
        Rdf.iri('http://example.com/2'),
        Rdf.iri('http://example.com/p'),
        Rdf.literal('2', vocabularies.xsd.integer)
      ),
      Rdf.triple(Rdf.iri('http://example.com/3'), Rdf.iri('http://example.com/p'), Rdf.langLiteral('Example3', 'en')),
    ];

    const query = 'CONSTRUCT {?s ?p ?o.} WHERE {?s ?p ?o.}';
    SparqlClient.construct(query)
      .onValue((res) => {
        expect(res).to.be.deep.equal(expectedResponse);
        done();
      })
      .onError(done);

    expect(this.request.requestBody).to.be.equalIgnoreSpaces(query);
    expect(this.request.requestHeaders).to.be.deep.equal({
      'Content-Type': 'application/sparql-query;charset=utf-8',
      Accept: 'text/turtle',
    });

    this.request.respond(200, { 'Content-Type': 'text/turtle' }, rawResponse);
  });

  it('SPARQL ask query', function (done) {
    const rawResponse = JSON.stringify({
      head: [],
      boolean: true,
    });

    const query = 'ASK WHERE {?s ?p ?o.}';
    SparqlClient.ask(query)
      .onValue((res) => {
        expect(res).to.be.equal(true);
        done();
      })
      .onError(done);

    expect(this.request.requestBody).to.be.equalIgnoreSpaces(query);
    expect(this.request.requestHeaders).to.be.deep.equal({
      'Content-Type': 'application/sparql-query;charset=utf-8',
      Accept: 'application/sparql-results+json',
    });

    this.request.respond(200, { 'Content-Type': 'application/sparql-results+json' }, rawResponse);
  });

  it('should add query parameter as VALUES clause', function (done) {
    const query = `
      SELECT * WHERE {
        ?s ?p ?o.
      }
    `;

    const expectedQuery = `
      SELECT * WHERE {
        VALUES (?s) {
          (<http://example.com>)
        }
        ?s ?p ?o.
      }`;

    const parametrizedQuery = SparqlClient.prepareQuery(query, [{ s: Rdf.iri('http://example.com') }]);

    parametrizedQuery
      .onValue((preparedQuery) => {
        expect(SparqlUtil.serializeQuery(preparedQuery)).to.be.equalIgnoreSpaces(expectedQuery);
        done();
      })
      .onError((error) => assert.fail(error));
  });

  it('should add multiple query parameters as VALUES clause', function (done) {
    const query = `
      SELECT * WHERE {
        ?s ?p ?o.
      }
    `;

    const expectedQuery = `
      SELECT * WHERE {
        VALUES (?s ?p) {
          (<http://example.com/1> "example1"^^<http://www.w3.org/2001/XMLSchema#string>)
          (<http://example.com/2> "example2"^^<http://www.w3.org/2001/XMLSchema#string>)
        }
        ?s ?p ?o.
      }`;

    const parametrizedQuery = SparqlClient.prepareQuery(query, [
      {
        s: Rdf.iri('http://example.com/1'),
        p: Rdf.literal('example1'),
      },
      {
        s: Rdf.iri('http://example.com/2'),
        p: Rdf.literal('example2'),
      },
    ]);

    parametrizedQuery
      .onValue((preparedQuery) => {
        expect(SparqlUtil.serializeQuery(preparedQuery)).to.be.equalIgnoreSpaces(expectedQuery);
        done();
      })
      .onError((error) => assert.fail(error));
  });
});
