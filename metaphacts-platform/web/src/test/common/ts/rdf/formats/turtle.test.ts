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

import { expect, assert } from 'chai';

import { Rdf, turtle, vocabularies } from 'platform/api/rdf';

describe('turtle writer/parser', () => {
  it('conversion beetwen RDF typed literal and N3 literal', () => {
    const literal = Rdf.literal('example');
    const expectedN3Literal = '"example"^^http://www.w3.org/2001/XMLSchema#string';
    const n3Literal = turtle.serialize.nodeToN3(literal);

    expect(n3Literal).to.be.equal(expectedN3Literal);
    expect(
      turtle.deserialize.n3ValueToRdf(n3Literal)
    ).to.be.deep.equal(literal);
  });

  it('conversion beetwen RDF lang literal and N3 literal', () => {
    const literal = Rdf.langLiteral('example', 'en');
    const expectedN3Literal = '"example"@en';
    const n3Literal = turtle.serialize.nodeToN3(literal);

    expect(n3Literal).to.be.equal(expectedN3Literal);
    expect(
      turtle.deserialize.n3ValueToRdf(n3Literal)
    ).to.be.deep.equal(literal);
  });


  it('conversion beetwen RDF Iri and N3 value', () => {
    const iri = Rdf.iri('http://example.com');
    const expectedN3Value = 'http://example.com';
    const n3Value = turtle.serialize.nodeToN3(iri);

    expect(n3Value).to.be.equal(expectedN3Value);
    expect(
      turtle.deserialize.n3ValueToRdf(n3Value)
    ).to.be.deep.equal(iri);
  });


  it('conversion beetwen RDF Bnode and N3 value', () => {
    const bnode = Rdf.bnode('_:node');
    const expectedN3Value = '_:node';
    const n3Value = turtle.serialize.nodeToN3(bnode);

    expect(n3Value).to.be.equal(expectedN3Value);
    expect(
      turtle.deserialize.n3ValueToRdf(n3Value)
    ).to.be.deep.equal(bnode);
  });

  it('conversion beetwen RDF Triple and N3 Triple', () => {
    const triple =
        Rdf.triple(
          Rdf.bnode('_:node'), Rdf.iri('http://example.com'), Rdf.literal('5', vocabularies.xsd.integer)
        );
    const expectedN3Triple = {
     subject: '_:node',
     predicate: 'http://example.com',
     object: '"5"^^http://www.w3.org/2001/XMLSchema#integer',
    };
    const n3Triple = turtle.serialize.tripleToN3(triple);

    expect(n3Triple).to.be.deep.equal(expectedN3Triple);
    expect(
      turtle.deserialize.n3TripleToRdf(n3Triple)
    ).to.be.deep.equal(triple);
  });


  // it('conversion beetwen RDF Graph and Turtle', () => {
  //   const graph =
  //       Rdf.graph(
  //         Rdf.triple(
  //           Rdf.iri('http://ex.com'), Rdf.iri('http://example.com'), Rdf.langLiteral('hello', 'en')
  //         ),
  //         Rdf.triple(
  //           Rdf.bnode('_:node'), Rdf.iri('http://example.com'), Rdf.literal('5', xsd.integer)
  //         )
  //       );

  //   turtle.serialize.graphToTurtle(graph).onValue(
  //     ttl => {
  //       turtle.deserialize.turtleToGraph(ttl).onValue(
  //         res => expect(res).to.be.deep.equal(graph)
  //       )
  //     }
  //   )
  // });
});
