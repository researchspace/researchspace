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

import * as Kefir from 'kefir';
import { flatten, isEqual, uniqWith } from 'lodash';
import { createGraph, createNamedNode, createLiteral } from 'rdf-ext';

import { SparqlClient } from 'platform/api/sparql';

export interface RawNode {
  type: 'uri' | 'literal';
  value: string;
}

export interface RawTriple {
  subject: RawNode;
  predicate: RawNode;
  object: RawNode;
}

/**
 * Returns graph to build diagram by sparql query
 * Will run on default context
 */
export function getRdfExtGraphBySparqlQuery(
  query: string, repositories: string[]
): Promise<RawTriple[]> {
  return Kefir.combine(
    repositories.map(repository => SparqlClient.construct(query, {context: {repository}}))
  ).map(triples => {
    const graph: RawTriple[] = [];

    flatten(triples).forEach(function (triple) {
      graph.push({
        subject: {
          'type': triple.s.isIri() ? 'uri' : 'literal',
          'value': triple.s.value,
        },
        predicate: {
          'type': triple.p.isIri() ? 'uri' : 'literal',
          'value': triple.p.value,
        },
        object: {
          'type': triple.o.isIri() ? 'uri' : 'literal',
          'value': triple.o.value,
        },
      });
    });

    const uniqueGraph = uniqWith(graph, isEqual);
    return uniqueGraph;
  }).toPromise();
}

export function makeRdfExtGraph(graph: RawTriple[]): unknown {
  const triples = graph.map(({subject, predicate, object}) => ({
    subject: makeRdfExtNode(subject),
    predicate: makeRdfExtNode(predicate),
    object: makeRdfExtNode(object),
  }));

  return createGraph(triples);
}

function makeRdfExtNode(node: RawNode): unknown {
  const {type, value} = node;
  return type === 'uri' ? createNamedNode(value) : createLiteral(value);
}
