/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

import * as _ from 'lodash';
import * as Maybe from 'data.maybe';
import * as Immutable from 'immutable';

import { serializer, deserializer } from 'platform/api/json';

module Rdf {
  export abstract class Node {
    private _value: string;

    constructor(value: string) {
      this._value = value;
    }

    get value(): string {
      return this._value;
    }

    public static cata<T>(
      onIri: (iri: Iri) => T,
      onLiteral: (literal: Literal) => T,
      onBnode: (bnode: BNode) => T
    ) {
      return (node: Node) => {
        if (node.isIri()) {
          return onIri(<Iri> node);
        } else if (node.isLiteral()) {
          return onLiteral(<Literal> node);
        } else {
          return onBnode(<BNode> node);
        }
      };
    }

    public hashCode() {
      return hashString(this.value);
    }

    public equals(other: Node) {
      if (!other || typeof other !== 'object') {
        return false;
      } else {
        return this.value === other.value;
      }
    }

    public cata<T>(
      onIri: (iri: Iri) => T,
      onLiteral: (literal: Literal) => T,
      onBnode: (bnode: BNode) => T
    ) {
      return Node.cata(onIri, onLiteral, onBnode)(this);
    }

    public isIri(): this is Rdf.Iri {
      return this instanceof Iri;
    }

    public isLiteral(): this is Rdf.Literal {
      return this instanceof Literal;
    }

    public isBnode(): this is BNode {
      return this instanceof BNode;
    }

    public toString(): string { throw Error('Node.toString() is not implemented'); }
  }

  export class Iri extends Node {
    // prevent assignment from other node types to IRI due to structural typing
    // tslint:disable-next-line:no-unused-variable
    private _rdfIriBrand: string;

    public equals(other: Node) {
      return super.equals(other) && other instanceof Rdf.Iri;
    }

    public toString() {
      return `<${this.value}>`;
    }

    @serializer
    public toJSON() {
      return {
        'value': this.value,
      };
    }

    @deserializer
    public static fromJSON(str: {value: string}) {
      return new Iri(str.value);
    }
  }
  export function iri(value: string) {
    return new Iri(value);
  }

  /**
   * Convert <> enclosed Iri into [Rdf.Iri];
   * @param value full iri enclosed in <>
   */
  export function fullIri(value: string): Rdf.Iri {
    if (_.startsWith(value, '<') && _.endsWith(value, '>')) {
      // remove '<' and '>' form iri string
      return iri(value.slice(1, -1));
    } else {
      throw new Error('Expected IRI to be enclosed in <>, for ' + value);
    }
  }

  export const BASE_IRI = iri('');

  export class Literal extends Node {
    private _dataType: Iri;

    constructor(value: string, dataType: Iri) {
      super(value);
      this._dataType = dataType;
    }

    get dataType(): Iri {
      return this._dataType;
    }

    public toString() {
      return `"${this.value}"^^${this.dataType.toString()}`;
    }

    public equals(other: Node) {
      if (!other || typeof other !== 'object') {
        return false;
      } else {
        return other instanceof Literal && !(other instanceof LangLiteral)
          && this.value === other.value
          && this.dataType.equals(other.dataType);
      }
    }

    @serializer
    public toJSON() {
      return {
        'value': this.value,
        'dataType': this._dataType,
      };
    }

    @deserializer
    public static fromJSON (obj: {value: string; dataType: Rdf.Iri}): Literal {
      return new Literal(obj.value, obj.dataType);
    }
  }

  export function literal(value: string | boolean, dataType?: Iri) {
    if (typeof value === 'boolean') {
      return new Literal(value.toString(), iri('http://www.w3.org/2001/XMLSchema#boolean'));
    } else {
      if (dataType === undefined) {
        return new Literal(value, iri('http://www.w3.org/2001/XMLSchema#string'));
      } else {
        return new Literal(value, dataType);
      }
    }
  }

  export class LangLiteral extends Literal {
    private _lang: string;

    constructor(value: string, lang: string) {
      super(value, iri('http://www.w3.org/1999/02/22-rdf-syntax-ns#langString'));
      this._lang = lang;
    }

    get lang(): string {
      return this._lang;
    }

    public equals(other: Node) {
      if (!other || typeof other !== 'object') {
        return false;
      } else {
        return other instanceof LangLiteral
          && this.value === other.value
          && this.dataType.equals(other.dataType)
          && this.lang === other.lang;
      }
    }

    public toString() {
      return `"${this.value}"@${this.lang}`;
    }

    @serializer
    public toJSON() {
      return {
        'value': this.value,
        'dataType': this.dataType,
        'lang': this.lang,
      };
    }

    @deserializer
    public static fromJSON(obj: {value: string; dataType: Rdf.Iri; lang: string}): LangLiteral {
      return new LangLiteral(obj.value, obj.lang);
    }
  }
  export function langLiteral(value: string, lang: string): LangLiteral {
    return new LangLiteral(value, lang);
  }

  export class BNode extends Node {
    // tslint:disable-next-line:no-unused-variable
    private _rdfBlankBrand: string;

    public toString() {
      return `${this.value}`;
    }
  }

  export function bnode(value?: string) {
    if (_.isUndefined(value)) {
      return new BNode('_:' + Math.random().toString(36).substring(7));
    } else {
      return new BNode(value.startsWith('_:') ? value : '_:' + value);
    }
  }

  export class Triple {
    private _s: Node;
    private _p: Iri;
    private _o: Node;
    private _g: Iri;

    constructor(s: Node, p: Iri, o: Node, g: Iri = DEFAULT_GRAPH) {
      this._s = s;
      this._p = p;
      this._o = o;
      this._g = g;
    }

    get s(): Node {
      return this._s;
    }

    get p(): Iri {
      return this._p;
    }

    get o(): Node {
      return this._o;
    }

    get g(): Iri {
      return this._g;
    }

    public hashCode() {
      const prime = 31;
      let result = 1;
      result = prime * result + ((this.s == null) ? 0 : this.s.hashCode());
      result = prime * result + ((this.p == null) ? 0 : this.p.hashCode());
      result = prime * result + ((this.o == null) ? 0 : this.o.hashCode());
      result = prime * result + (_.isUndefined(this.g) ? 0 : this.g.hashCode());
      return result;
    }
  }

  export function triple(s: Node, p: Iri, o: Node, g?: Rdf.Iri) {
    return new Triple(s, p, o, g);
  }

  export class Graph {
    private _triples: Immutable.Set<Triple>;

    constructor(triples: Immutable.Set<Triple>) {
      this._triples = triples;
    }

    get triples(): Immutable.Set<Triple> {
      return this._triples;
    }
  }

  export function graph(triples: Triple[]): Rdf.Graph;
  export function graph(...triples: Triple[]): Rdf.Graph;
  export function graph(triples: Immutable.Set<Triple>): Rdf.Graph;
  export function graph(triples: any): Rdf.Graph {
    if (triples instanceof Immutable.Set) {
      return new Graph(triples);
    } else if (_.isArray(triples)) {
      return new Graph(Immutable.Set<Triple>(triples));
    } else {
      return new Graph(Immutable.Set<Triple>(arguments));
    }
  }

  export function union(...graphs: Graph[]): Rdf.Graph {
    return graph(
      <Immutable.Set<Triple>>Immutable.Set(graphs).map(g => g.triples).flatten()
    );
  }

  export class PointedGraph {
    private _pointer: Node;
    private _graph: Graph;

    constructor(pointer: Node, graph: Rdf.Graph) {
      this._pointer = pointer;
      this._graph = graph;
    }

    get pointer(): Node {
      return this._pointer;
    }

    get graph(): Rdf.Graph {
      return this._graph;
    }
  }
  export function pg(pointer: Node, graph: Graph) {
    return new PointedGraph(pointer, graph);
  }

  // http://jsperf.com/hashing-strings
  function hashString(string: string) {
    // This is the hash from JVM
    // The hash code for a string is computed as
    // s[0] * 31 ^ (n - 1) + s[1] * 31 ^ (n - 2) + ... + s[n - 1],
    // where s[i] is the ith character of the string and n is the length of
    // the string. We "mod" the result to make it between 0 (inclusive) and 2^31
    // (exclusive) by dropping high bits.
    let hash = 0;
    for (let ii = 0; ii < string.length; ii++) {
      hash = 31 * hash + string.charCodeAt(ii) | 0;
    }
    return smi(hash);
  }

  // v8 has an optimization for storing 31-bit signed numbers.
  // Values which have either 00 or 11 as the high order bits qualify.
  // This function drops the highest order bit in a signed number, maintaining
  // the sign bit.
  export function smi(i32: number) {
    return ((i32 >>> 1) & 0x40000000) | (i32 & 0xBFFFFFFF);
  }

  export const DEFAULT_GRAPH = new Iri('default');
  export const EMPTY_GRAPH = graph([]);

  export function getValueFromPropertyPath<T extends Rdf.Node = Rdf.Node>(
    propertyPath: Array<Rdf.Iri>, pg: Rdf.PointedGraph
  ): Data.Maybe<T> {
    const values = getValuesFromPropertyPath(propertyPath, pg);
    if (values.length > 1) {
      throw new Error('more than one value found in the graph for property path ' + propertyPath);
    }
    return Maybe.fromNullable(
      getValuesFromPropertyPath(propertyPath, pg)[0]
    ) as Data.Maybe<T>;
  }

  export function getValuesFromPropertyPath<T extends Rdf.Node = Rdf.Node>(
    propertyPath: Array<Rdf.Iri>, pg: Rdf.PointedGraph
  ): Array<T> {
    // reduce property path from left to right traversing the graph
    const nodes =
      _.reduce(
        propertyPath,
        (ss, p) =>
          _.flatMap(
            ss, iri => pg.graph.triples.filter(t => t.s.equals(iri) && t.p.equals(p)).toArray()
          ).map(t => t.o),
        [pg.pointer]
      );
    return _.uniqBy(nodes, node => node.value) as Array<T>;
  }
}

export = Rdf;
