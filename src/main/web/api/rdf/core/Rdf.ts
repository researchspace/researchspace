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

import type * as RdfJs from '@rdfjs/types';
import * as _ from 'lodash';
import * as Maybe from 'data.maybe';
import * as Immutable from 'immutable';

import { serializerFor, deserializerFor } from 'platform/api/json';

export type TermType = 'NamedNode' | 'BlankNode' | 'Literal' | 'Variable' | 'DefaultGraph';

export abstract class Node {
  private _value: string;

  constructor(value: string) {
    this._value = value;
  }

  abstract get termType(): TermType;

  get value(): string {
    return this._value;
  }

  public static cata<T>(onIri: (iri: Iri) => T, onLiteral: (literal: Literal) => T, onBnode: (bnode: BNode) => T) {
    return (node: Node) => {
      if (node.isIri()) {
        return onIri(<Iri>node);
      } else if (node.isLiteral()) {
        return onLiteral(<Literal>node);
      } else {
        return onBnode(<BNode>node);
      }
    };
  }

  public hashCode() {
    return hashString(this.value);
  }

  public equals(other: Node | RdfJs.Term) {
    if (!other || typeof other !== 'object') {
      return false;
    } else {
      return this.value === other.value;
    }
  }

  public cata<T>(onIri: (iri: Iri) => T, onLiteral: (literal: Literal) => T, onBnode: (bnode: BNode) => T) {
    return Node.cata(onIri, onLiteral, onBnode)(this);
  }

  public isIri(): this is Iri {
    return this instanceof Iri;
  }

  public isLiteral(): this is Literal {
    return this instanceof Literal;
  }

  public isBnode(): this is BNode {
    return this instanceof BNode;
  }

  abstract toJSON(): any;

  public toString(): string {
    throw Error('Node.toString() is not implemented');
  }
}

export class Iri extends Node implements RdfJs.NamedNode<string> {
  get termType(): 'NamedNode' {
    return 'NamedNode';
  }

  public equals(other: RdfJs.Term) {
    return super.equals(other) && other.termType === 'NamedNode';
  }

  public toString() {
    return `<${this.value}>`;
  }

  toJSON() {
    return {
      termType: 'NamedNode',
      value: this.value,
    };
  }

  static fromJSON(obj: Pick<Iri, 'value'>) {
    return new Iri(obj.value);
  }
}

serializerFor<Iri>({
  name: Iri.prototype.constructor.name,
  predicate: obj => obj instanceof Iri,
  serializer: obj => obj.toJSON(),
});

deserializerFor<Iri>({
  name: Iri.prototype.constructor.name,
  deserializer: Iri.fromJSON,
});

export function iri(value: string) {
  return new Iri(value);
}

/**
 * Convert <> enclosed Iri into [Rdf.Iri];
 * @param value full iri enclosed in <>
 */
export function fullIri(value: string): Iri {
  if (_.startsWith(value, '<') && _.endsWith(value, '>')) {
    // remove '<' and '>' form iri string
    return iri(value.slice(1, -1));
  } else {
    throw new Error('Expected IRI to be enclosed in <>, for ' + value);
  }
}

export const BASE_IRI = iri('');

const RDF_LANG_STRING = iri('http://www.w3.org/1999/02/22-rdf-syntax-ns#langString');
const XSD_STRING = iri('http://www.w3.org/2001/XMLSchema#string');
const XSD_BOOLEAN = iri('http://www.w3.org/2001/XMLSchema#boolean');

export class Literal extends Node implements RdfJs.Literal {
  private _datatype: Iri;
  private _lang: string;

  constructor(value: string, datatypeOrLanguage: Iri | string) {
    super(value);
    if (typeof datatypeOrLanguage === 'string') {
      this._datatype = RDF_LANG_STRING;
      this._lang = datatypeOrLanguage;
    } else {
      this._datatype = datatypeOrLanguage;
      this._lang = '';
    }
  }

  get termType(): 'Literal' {
    return 'Literal';
  }

  get datatype(): Iri {
    return this._datatype;
  }

  get language(): string {
    return this._lang;
  }

  public toString() {
    return this.language ? `"${this.value}"@${this.language}` : `"${this.value}"^^${this.datatype.toString()}`;
  }

  public equals(other: RdfJs.Term) {
    return (
      super.equals(other) &&
      other.termType === 'Literal' &&
      this.datatype.equals(other.datatype) &&
      this.language === other.language
    );
  }

  toJSON() {
    return {
      termType: 'Literal',
      value: this.value,
      datatype: this.datatype,
      language: this.language,
    };
  }

  static fromJSON(
    obj: Pick<Literal, 'value' | 'datatype' | 'language'> & { readonly dataType?: Iri; readonly lang?: string }
  ): Literal {
    // preserve backwards-compatibility with previous serialization
    const datatype = obj.datatype ? Iri.fromJSON(obj.datatype) : obj.dataType;
    const language = typeof obj.language === 'string' ? obj.language : obj.lang;
    return new Literal(obj.value, language ? language : datatype);
  }
}

serializerFor<Literal>({
  name: Literal.prototype.constructor.name,
  predicate: obj => obj instanceof Literal,
  serializer: obj => obj.toJSON(),
});

deserializerFor<Literal>({
  name: Literal.prototype.constructor.name,
  deserializer: Literal.fromJSON,
});

export function literal(value: string | boolean, dataType?: Iri) {
  if (typeof value === 'boolean') {
    return new Literal(value.toString(), XSD_BOOLEAN);
  } else {
    if (dataType === undefined) {
      return new Literal(value, XSD_STRING);
    } else {
      return new Literal(value, dataType);
    }
  }
}

export function langLiteral(value: string, lang: string): Literal {
  return new Literal(value, lang);
}

export class BNode extends Node implements RdfJs.BlankNode {
  get termType(): 'BlankNode' {
    return 'BlankNode';
  }

  public equals(other: RdfJs.Term) {
    return super.equals(other) && other.termType === 'BlankNode';
  }

  public toString() {
    return `${this.value}`;
  }

  public toJSON() {
    return {
      termType: 'BlankNode',
      value: this.value,
    };
  }

  static fromJSON(obj: Pick<BNode, 'value'>): BNode {
    return new BNode(obj.value);
  }
}

serializerFor<BNode>({
  name: BNode.prototype.constructor.name,
  predicate: obj => obj instanceof BNode,
  serializer: obj => obj.toJSON(),
});

deserializerFor<BNode>({
  name: BNode.prototype.constructor.name,
  deserializer: BNode.fromJSON,
});

export function bnode(value?: string) {
  if (_.isUndefined(value)) {
    return new BNode('_:' + Math.random().toString(36).substring(7));
  } else {
    return new BNode(value.startsWith('_:') ? value : '_:' + value);
  }
}

export class DefaultGraph extends Node implements RdfJs.DefaultGraph {
  static readonly singleton = new DefaultGraph();

  constructor() {
    super('');
  }

  get termType(): 'DefaultGraph' {
    return 'DefaultGraph';
  }

  get value(): '' {
    return '';
  }

  public equals(other: RdfJs.Term) {
    return super.equals(other) && other.termType === 'DefaultGraph';
  }

  public toString() {
    return `${this.value}`;
  }

  public toJSON() {
    return { termType: 'DefaultGraph' };
  }

  static fromJSON(obj: Pick<DefaultGraph, 'value'>): DefaultGraph {
    return DefaultGraph.singleton;
  }
}

serializerFor<DefaultGraph>({
  name: DefaultGraph.prototype.constructor.name,
  predicate: obj => obj instanceof DefaultGraph,
  serializer: obj => obj.toJSON(),
});

deserializerFor<DefaultGraph>({
  name: DefaultGraph.prototype.constructor.name,
  deserializer: DefaultGraph.fromJSON,
});

export class Variable extends Node implements RdfJs.Variable {
  get termType(): 'Variable' {
    return 'Variable';
  }

  public equals(other: RdfJs.Term) {
    return super.equals(other) && other.termType === 'Variable';
  }

  public toString() {
    return `?${this.value}`;
  }

  public toJSON() {
    return {
      termType: 'Variable',
      value: this.value,
    };
  }

  static fromJSON(obj: Pick<Variable, 'value'>): Variable {
    return new Variable(obj.value);
  }
}

serializerFor<Variable>({
  name: Variable.prototype.constructor.name,
  predicate: obj => obj instanceof Variable,
  serializer: obj => obj.toJSON(),
});

deserializerFor<Variable>({
  name: Variable.prototype.constructor.name,
  deserializer: Variable.fromJSON,
});

export class Triple implements RdfJs.Quad {
  private _s: Node;
  private _p: Iri;
  private _o: Node;
  private _g: Iri | DefaultGraph;

  constructor(s: Node, p: Iri, o: Node, g: Iri | DefaultGraph = DefaultGraph.singleton) {
    this._s = s;
    this._p = p;
    this._o = o;
    this._g = g;
  }

  get termType(): 'Quad' {
    return 'Quad';
  }

  get value(): '' {
    return '';
  }

  get s(): Node {
    return this._s;
  }

  get subject(): RdfJs.Quad_Subject {
    return this._s as RdfJs.Quad_Subject;
  }

  get p(): Iri {
    return this._p;
  }

  get predicate(): RdfJs.Quad_Predicate {
    return this._p as RdfJs.Quad_Predicate;
  }

  get o(): Node {
    return this._o;
  }

  get object(): RdfJs.Quad_Object {
    return this._o as RdfJs.Quad_Object;
  }

  get g(): Iri {
    return this._g.termType === 'DefaultGraph' ? DEFAULT_GRAPH : this._g;
  }

  get graph(): RdfJs.Quad_Graph {
    return this._g;
  }

  public equals(other: RdfJs.Term | null | undefined): boolean {
    if (!other || typeof other !== 'object') {
      return false;
    }
    return (
      other.termType === 'Quad' &&
      this.subject.equals(other.subject) &&
      this.predicate.equals(other.predicate) &&
      this.object.equals(other.object) &&
      this.graph.equals(other.graph)
    );
  }

  public hashCode() {
    const prime = 31;
    let result = 1;
    result = prime * result + (this.s == null ? 0 : this.s.hashCode());
    result = prime * result + (this.p == null ? 0 : this.p.hashCode());
    result = prime * result + (this.o == null ? 0 : this.o.hashCode());
    result = prime * result + (_.isUndefined(this.g) ? 0 : this.g.hashCode());
    return result;
  }
}

export function triple(s: Node, p: Iri, o: Node, g?: Iri | DefaultGraph) {
  return new Triple(s, p, o, g);
}

export const DataFactory: RdfJs.DataFactory = {
  namedNode: <Iri extends string>(value) =>
    iri(value) as RdfJs.NamedNode<string> as RdfJs.NamedNode<Iri>,
  literal: (value, languageOrDatatype) => {
    if (typeof languageOrDatatype === 'undefined') {
      return literal(value);
    } else if (typeof languageOrDatatype === 'string') {
      return langLiteral(value, languageOrDatatype);
    } else {
      return literal(value, iri(languageOrDatatype.value));
    }
  },
  blankNode: (value) => bnode(value),
  quad: (s, p, o, g) => triple(
    toNode(s) as Node,
    toNode(p) as Iri,
    toNode(o) as Node,
    toNode(g) as Iri | DefaultGraph
  ),
  defaultGraph: () => DefaultGraph.singleton,
  variable: (value) => new Variable(value),
};

export function toNode(term: RdfJs.Term): Node | Triple {
  switch (term.termType) {
    case 'NamedNode': {
      return iri(term.value);
    }
    case 'Literal': {
      return term.language
        ? langLiteral(term.value, term.language)
        : literal(term.value, iri(term.datatype.value));
    }
    case 'BlankNode': {
      return bnode(term.value);
    }
    case 'DefaultGraph': {
      return DefaultGraph.singleton;
    }
    case 'Quad': {
      return triple(
        toNode(term.subject) as Node,
        toNode(term.predicate) as Iri,
        toNode(term.object) as Node,
        toNode(term.graph) as Iri | DefaultGraph
      );
    }
    case 'Variable': {
      return new Variable(term.value);
    }
    default: {
      throw new Error(`Unexpected term type: ${(term as RdfJs.Term).termType}`);
    }
  }
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

export function graph(triples: ReadonlyArray<Triple> | Immutable.Set<Triple>): Graph {
  return new Graph(Immutable.Set<Triple>(triples));
}

export function union(...graphs: Graph[]): Graph {
  return graph(
    Immutable.Set(graphs)
      .map((g) => g.triples)
      .flatten() as Immutable.Set<Triple>
  );
}

export class PointedGraph {
  private _pointer: Node;
  private _graph: Graph;

  constructor(pointer: Node, graph: Graph) {
    this._pointer = pointer;
    this._graph = graph;
  }

  get pointer(): Node {
    return this._pointer;
  }

  get graph(): Graph {
    return this._graph;
  }
}
export function pg(pointer: Node, graph: Graph) {
  return new PointedGraph(pointer, graph);
}

// http://jsperf.com/hashing-strings
export function hashString(string: string) {
  // This is the hash from JVM
  // The hash code for a string is computed as
  // s[0] * 31 ^ (n - 1) + s[1] * 31 ^ (n - 2) + ... + s[n - 1],
  // where s[i] is the ith character of the string and n is the length of
  // the string. We "mod" the result to make it between 0 (inclusive) and 2^31
  // (exclusive) by dropping high bits.
  let hash = 0;
  for (let ii = 0; ii < string.length; ii++) {
    hash = (31 * hash + string.charCodeAt(ii)) | 0;
  }
  return smi(hash);
}

// v8 has an optimization for storing 31-bit signed numbers.
// Values which have either 00 or 11 as the high order bits qualify.
// This function drops the highest order bit in a signed number, maintaining
// the sign bit.
export function smi(i32: number) {
  return ((i32 >>> 1) & 0x40000000) | (i32 & 0xbfffffff);
}

export const DEFAULT_GRAPH = new Iri('default');
export const EMPTY_GRAPH = graph([]);

export function getValueFromPropertyPath<T extends Node = Node>(
  propertyPath: Array<Iri>,
  pg: PointedGraph
): Data.Maybe<T> {
  const values = getValuesFromPropertyPath(propertyPath, pg);
  if (values.length > 1) {
    throw new Error('more than one value found in the graph for property path ' + propertyPath);
  }
  return Maybe.fromNullable(getValuesFromPropertyPath(propertyPath, pg)[0]) as Data.Maybe<T>;
}

export function getValuesFromPropertyPath<T extends Node = Node>(
  propertyPath: Array<Iri>,
  pg: PointedGraph
): Array<T> {
  // reduce property path from left to right traversing the graph
  const nodes = _.reduce(
    propertyPath,
    (ss, p) =>
      _.flatMap(ss, (iri) => pg.graph.triples.filter((t) => t.s.equals(iri) && t.p.equals(p)).toArray()).map(
        (t) => t.o
      ),
    [pg.pointer]
  );
  return _.uniqBy(nodes, (node) => node.value) as Array<T>;
}

/**
 * Extracts local name for URI the same way as it's done in RDF4J.
 */
export function getLocalName(uri: string): string | undefined {
  let index = uri.indexOf('#');
  if (index < 0) {
    index = uri.lastIndexOf('/');
  }
  if (index < 0) {
    index = uri.lastIndexOf(':');
  }
  if (index < 0) {
    return undefined;
  }
  return uri.substring(index + 1);
}
