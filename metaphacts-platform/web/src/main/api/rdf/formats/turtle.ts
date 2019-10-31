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

import * as N3 from 'n3';
import * as Kefir from 'kefir';
import * as _ from 'lodash';

import * as Rdf from '../core/Rdf';
import { rdf as rdfVocab } from '../vocabularies/vocabularies';

const N3Util = N3.Util;

/**
 * Provides functions for RDF serialization into Turtle.
 * As well as converters beetwen {@link ../core/Rdf} and {@link n3}
 */
export module serialize {

  export const Format = {
    Turtle: 'turtle',
    NTriples: 'N-Triples',
    Trig: 'application/trig',
    NQuads: 'N-Quads',
  };

  /**
   * Serialize {@link Rdf.Graph} into Turtle format.
   */
  export function serializeGraph(
    graph: Rdf.Graph, format: string = Format.Turtle
  ): Kefir.Property<string> {
    const writer = N3.Writer({format: format});
    graph.triples.forEach(
      triple => writer.addTriple(tripleToN3(triple))
    );
    return Kefir.fromNodeCallback<string>(
      writer.end.bind(writer)
    ).toProperty();
  }

  /**
   * Convert {@link Rdf.Triple} into N3 Triple representation.
   *
   * @see https://github.com/RubenVerborgh/N3.js#triple-representation
   */
  export function tripleToN3(triple: Rdf.Triple): N3.Triple {
    const nTriple: N3.Triple = {
      subject: nodeToN3(triple.s),
      predicate: nodeToN3(triple.p),
      object: nodeToN3(triple.o),
    };

    if (!_.isUndefined(triple.g) && !triple.g.equals(Rdf.DEFAULT_GRAPH)) {
      nTriple.graph = nodeToN3(triple.g);
    }

    return nTriple;
  }

  /**
   * Convert {@link Rdf.Node} into N3 value.
   *
   * @see https://github.com/RubenVerborgh/N3.js#triple-representation
   */
  export function nodeToN3(value: Rdf.Node): string {
    return value.cata(
      iri => iri.value,
      literal => literalToN3(literal),
      bnode => bnode.value
    );
  }

  /**
   * Convert {@link Rdf.Literal} into N3 value.
   *
   * @see https://github.com/RubenVerborgh/N3.js#triple-representation
   */
  export function literalToN3(literal: Rdf.Literal): string {
    if (literal.language) {
      return `"${literal.value}"@${literal.language}`;
    } else {
      return `"${literal.value}"^^${literal.datatype.value}`;
    }
  }
}

/**
 * Provides functions for RDF de-serialization from Turtle.
 * As well as converters beetwen {@link ../core/Rdf} and {@link n3}
 */
export module deserialize {

  /**
   * Deserialize Turtle string as {@link Rdf.Graph}.
   */
  export function turtleToGraph(turtle: string): Kefir.Property<Rdf.Graph> {
    return turtleToTriples(turtle).map(Rdf.graph);
  }

  /**
   * Deserialize Turtle string as array of {@link Rdf.Triple}
   */
  export function turtleToTriples(turtle: string): Kefir.Property<Rdf.Triple[]> {
    return Kefir.stream(emitter => {
      initN3Parser(emitter, turtle);
    }).scan(
      (acc: Rdf.Triple[], x: Rdf.Triple) => {
        acc.push(x);
        return acc;
      }, <Rdf.Triple []>[]
    ).last();
  }

  /**
   * Converts N3.js representation of the RDF triple into {@link Rdf.Triple}.
   */
  export function n3TripleToRdf(triple: N3.Triple): Rdf.Triple {
    return Rdf.triple(
      n3ValueToRdf(
        triple.subject
      ),
      <Rdf.Iri>n3ValueToRdf(
        triple.predicate
      ),
      n3ValueToRdf(
        triple.object
      )
    );
  }

  /**
   * Converts N3.js representation of the RDF value into {@link Rdf.Node}.
   */
  export function n3ValueToRdf(value: string): Rdf.Node {
    // TODO seems to be a bug with N3Util.isIRI in n3.js, need to revise this later
    if (N3Util.isIRI(value) || value === '') {
      return Rdf.iri(value);
    } else if (N3Util.isLiteral(value)) {
      return n3LiteralToRdf(value);
    } else if (N3Util.isBlank(value)) {
      return Rdf.bnode(value);
    } else {
      throw new Error(`Invalid rdf value: ${value}`);
    }
  }

  /**
   * Converts N3.js RDF literal representation into the internal {@link Rdf.Literal}.
   */
  export function n3LiteralToRdf(literal: string): Rdf.Literal {
    switch (N3Util.getLiteralType(literal)) {
    case rdfVocab.langString.value:
      return Rdf.langLiteral(
        N3Util.getLiteralValue(literal), N3Util.getLiteralLanguage(literal)
      );
    default:
      return Rdf.literal(
        N3Util.getLiteralValue(literal), Rdf.iri(N3Util.getLiteralType(literal))
      );
    }
  }

  /**
   * Create streaming Turtle parser.
   */
  export function initN3Parser(emitter: Kefir.Emitter<Rdf.Triple>, turtle: string): N3.Parser {
    const parser = N3.Parser();
    parser.parse(turtle, (error, triple, prefixes) => {
      if (error) {
        emitter.error(error);
      }
      if (triple != null) {
        emitter.emit(
          n3TripleToRdf(triple)
        );
      } else {
        emitter.end();
      }
    });
    return parser;
  }
}
