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

import * as _ from 'lodash';

import { Rdf } from 'platform/api/rdf';
import { rdf, xsd, persist } from 'platform/api/rdf/vocabularies';

const {JsonUndefined, JsonNull} = persist;

export function propertyKeyToIriDefault(
  keyOrIndex: string | number,
  propertyNamespace: Rdf.Iri,
): Rdf.Iri {
  const encodedKey = typeof keyOrIndex === 'number'
    ? `_item/${keyOrIndex}`
    : encodeURIComponent(keyOrIndex);
  return Rdf.iri(`${propertyNamespace.value}/${encodedKey}`);
}

export function iriToPropertyKeyDefault(iri: Rdf.Iri): string {
  const encodedKey = iri.value.substr(iri.value.lastIndexOf('/') + 1);
  return decodeURIComponent(encodedKey);
}

/**
 * Converts JSON-like Javascript object into Rdf.PointedGraph similar to AST of JSON.
 *
 * Arrays are represented as RDF lists:
 * ```
 *   [] -> rdf:nil
 *   [x:xs] -> root rdf:first x ; rdf:rest xs .
 * ```
 *
 * Plain objects are represented by IRIs `<[propertyNamespace] / [path from root] / [key name]>`
 * ```
 *   {"foo": bar} -> root <[propertyNamespace]/foo> bar .
 *   [{"foo": bar}] -> root
 *     rdf:first [ <[propertyNamespace]/_item/0/foo> bar ] ;
 *     rdf:rest rdf:nil .
 * ```
 *
 * `string`, `boolean` values are represented by literals with corresponding XSD datatype
 * (e.g. numbers by `xsd:double`, `xsd:integer`, etc).
 *
 * `null` value is represented by `persistedComponent:json/null`;
 * `undefined` value is represented by `persistedComponent:json/undefined`.
 *
 * Non-plain objects and functions are treated as if they're undefined.
 * Extra (non-index) array keys and object entries with `undefined` values are discarded.
 */
export function serialize(
  value: any,
  propertyNamespace: Rdf.Iri,
  propertyKeyToIri = propertyKeyToIriDefault,
): Rdf.PointedGraph {
  if (typeof value === undefined) {
    return Rdf.pg(JsonUndefined, Rdf.EMPTY_GRAPH);
  } else if (value === null) {
    return Rdf.pg(JsonNull, Rdf.EMPTY_GRAPH);
  } else if (typeof value === 'string') {
    return Rdf.pg(Rdf.literal(value, xsd._string), Rdf.EMPTY_GRAPH);
  } else if (typeof value === 'boolean') {
    return Rdf.pg(Rdf.literal(value, xsd.boolean), Rdf.EMPTY_GRAPH);
  } else if (typeof value === 'number') {
    if (Math.round(value) === value) {
      return Rdf.pg(Rdf.literal(value.toString(), xsd.integer), Rdf.EMPTY_GRAPH);
    } else {
      return Rdf.pg(Rdf.literal(value.toString(), xsd.double), Rdf.EMPTY_GRAPH);
    }
  } else if (Array.isArray(value)) {
    return serializeArray(value, (item, index) =>
      serialize(item, propertyKeyToIri(index, propertyNamespace))
    );
  } else if (_.isPlainObject(value)) {
    const root = Rdf.bnode();
    const result: Rdf.Triple[] = [];
    for (const key in value) {
      if (!value.hasOwnProperty(key)) { continue; }
      const nestedNamespace = propertyKeyToIri(key, propertyNamespace);
      const {graph, pointer} = serialize(value[key], nestedNamespace, propertyKeyToIri);
      // ignore undefined values in objects
      if (!pointer.equals(JsonUndefined)) {
        result.push(...graph.triples.toArray());
        result.push(Rdf.triple(root, nestedNamespace, pointer));
      }
    }
    return Rdf.pg(root, Rdf.graph(result));
  } else {
    // return JsonUndefined for functions and non-plain objects
    return Rdf.pg(JsonUndefined, Rdf.EMPTY_GRAPH);
  }
}

export function serializeArray<T>(
  array: T[], mapper: (item: T, index: number) => Rdf.PointedGraph
): Rdf.PointedGraph {
  if (array.length === 0) {
    return Rdf.pg(rdf.nil, Rdf.EMPTY_GRAPH);
  }

  let rest: Rdf.Node = rdf.nil;
  let triples: Rdf.Triple[] = [];

  for (let i = array.length - 1; i >= 0; i--) {
    const node = Rdf.bnode();
    const {pointer, graph} = mapper(array[i], i);
    triples.push(Rdf.triple(node, rdf.first, pointer));
    triples.push(Rdf.triple(node, rdf.rest, rest));
    graph.triples.forEach(triple => triples.push(triple));
    rest = node;
  }

  return Rdf.pg(rest, Rdf.graph(triples));
}

function deserializeObjectHelper(
  root: Rdf.Node, graph: Rdf.Graph, iriToPropertyKey: (iri: Rdf.Iri) => string
): object {
  const isArray = graph.triples.some(t => t.s.equals(root) && t.p.equals(rdf.first));
  if (isArray) {
    return deserializeArray(root, graph, pointer => deserialize(pointer, graph, iriToPropertyKey));
  } else {
    const result: { [key: string]: any } = {};
    const outgoing = graph.triples.filter(t => t.s.equals(root));
    outgoing.forEach(t => {
      const key = iriToPropertyKey(t.p);
      if (key) {
        result[key] = deserialize(t.o, graph, iriToPropertyKey);
      }
    });
    return result;
  }
}

/**
 * Converts Rdf.PointedGraph generated by `serialize()` back to JSON-like object.
 */
export function deserialize(
  root: Rdf.Node, graph: Rdf.Graph, iriToPropertyKey = iriToPropertyKeyDefault,
): any {
  return root.cata<any>(
    iri => {
      if (iri.equals(rdf.nil)) {
        return [];
      } else if (iri.equals(JsonUndefined)) {
        return undefined;
      } else if (iri.equals(JsonNull)) {
        return null;
      } else {
        return deserializeObjectHelper(iri, graph, iriToPropertyKey);
      }
    },
    literal => {
      if (literal.datatype.equals(xsd._string)) {
        return literal.value;
      } else if (literal.datatype.equals(xsd.boolean)) {
        return literal.value === 'true';
      } else if (literal.datatype.equals(xsd.double)) {
        return parseFloat(literal.value);
      } else if (literal.datatype.equals(xsd.integer)) {
        return parseInt(literal.value);
      }
    },
    bnode => {
      return deserializeObjectHelper(bnode, graph, iriToPropertyKey);
    }
  );
}

export function deserializeArray<T>(
  root: Rdf.Node,
  graph: Rdf.Graph,
  mapper: (pointer: Rdf.Node) => T
): T[] {
  if (root.equals(rdf.nil)) {
    return [];
  }

  const {triples} = graph;
  const items: T[] = [];

  let node = root;
  while (!node.equals(rdf.nil)) {
    const first = triples.filter(t => t.s.equals(node) && t.p.equals(rdf.first)).first();
    const rest = triples.filter(t => t.s.equals(node) && t.p.equals(rdf.rest)).first();
    if (!first) {
      throw new Error(`Missing rdf:first triple for array ${root} at node ${node}`);
    }
    const item = mapper(first.o);
    items.push(item);
    node = rest ? rest.o : rdf.nil;
  }

  return items;
}
