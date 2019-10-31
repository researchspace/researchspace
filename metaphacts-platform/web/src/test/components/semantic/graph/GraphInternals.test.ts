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

import { assert } from 'chai';

import { Rdf, vocabularies } from 'platform/api/rdf';
import * as GraphInternals from 'platform/components/semantic/graph/GraphInternals';
import { foaf, person } from './TestData';

const SPARQL_CONSTRUCT_RESPONSE = [
  Rdf.triple(person.alice, vocabularies.rdfs.label, Rdf.literal('Alice')),
  Rdf.triple(person.alice, foaf.knows, person.bob),
  Rdf.triple(person.alice, foaf.knows, person.carol),
  Rdf.triple(person.alice, foaf.knows, person.mike),
  Rdf.triple(person.alice, foaf.member, person.W3C),
  Rdf.triple(person.mike, foaf.member, person.W3C),
  Rdf.triple(person.mike, foaf.knows, person.carol),
  Rdf.triple(person.carol, foaf.knows, person.mike),
  Rdf.triple(person.bob, foaf.knows, person.carol),
];

describe('GraphInternals', () => {
  it('build data with default options', () => {
    // by default we show all edges/nodes that we can find in sparql query result

    const config = {
      query: '',
      height: 0,
    };
    const graphData =
      GraphInternals.prepareGraphData(config)(SPARQL_CONSTRUCT_RESPONSE);

    const expectedGraphData =
      [
        {
          'group': 'edges',
          'data': {
            'id': person.alice.toString() + vocabularies.rdfs.label.toString() + Rdf.literal('Alice').toString(),
            'node': vocabularies.rdfs.label,
            'resource': vocabularies.rdfs.label.toString(),
            'source': person.alice.toString(),
            'target': Rdf.literal('Alice').toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.alice.toString() + foaf.knows.toString() + person.bob.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.alice.toString(),
            'target': person.bob.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.alice.toString() + foaf.knows.toString() + person.carol.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.alice.toString(),
            'target': person.carol.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.alice.toString() + foaf.knows.toString() + person.mike.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.alice.toString(),
            'target': person.mike.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.alice.toString() + foaf.member.toString() + person.W3C.toString(),
            'node': foaf.member,
            'resource': foaf.member.toString(),
            'source': person.alice.toString(),
            'target': person.W3C.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.mike.toString() + foaf.member.toString() + person.W3C.toString(),
            'node': foaf.member,
            'resource': foaf.member.toString(),
            'source': person.mike.toString(),
            'target': person.W3C.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.mike.toString() + foaf.knows.toString() + person.carol.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.mike.toString(),
            'target': person.carol.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.carol.toString() + foaf.knows.toString() + person.mike.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.carol.toString(),
            'target': person.mike.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.bob.toString() + foaf.knows.toString() + person.carol.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.bob.toString(),
            'target': person.carol.toString(),
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.alice.toString(),
            'node': person.alice,
            'resource': person.alice.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${vocabularies.rdfs.label}`]: Rdf.literal('Alice').toString(),
            [`->${foaf.knows}`]: `${person.bob} ${person.carol} ${person.mike}`,
            [`->${foaf.member}`]: person.W3C.toString(),

            [`${vocabularies.rdfs.label}`]: [Rdf.literal('Alice')],
            [`${foaf.knows}`]: [
              person.bob, person.carol, person.mike,
            ],
            [`${foaf.member}`]: [person.W3C],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': Rdf.literal('Alice').toString(),
            'node': Rdf.literal('Alice'),
            'resource': Rdf.literal('Alice').toString(),
            'parent': undefined,
            'isIri': false,
            'isLiteral': true,
            'isBnode': false,
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.bob.toString(),
            'node': person.bob,
            'resource': person.bob.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${foaf.knows}`]: person.carol.toString(),
            [`${foaf.knows}`]: [person.carol],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.carol.toString(),
            'node': person.carol,
            'resource': person.carol.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${foaf.knows}`]: person.mike.toString(),
            [`${foaf.knows}`]: [person.mike],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.mike.toString(),
            'node': person.mike,
            'resource': person.mike.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${foaf.knows}`]: person.carol.toString(),
            [`->${foaf.member}`]: person.W3C.toString(),
            [`${foaf.knows}`]: [person.carol],
            [`${foaf.member}`]: [person.W3C],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.W3C.toString(),
            'node': person.W3C,
            'resource': person.W3C.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
          },
        },
      ];

    assert.sameDeepMembers<any>(graphData, expectedGraphData);
  });

  it('build data with hidden predicates', () => {
    // with hidePredicates it is possible to hide some edges/nodes from visualization

    const config = {
      query: '',
      height: 0,
      hidePredicates: [vocabularies.rdfs.label.toString(), foaf.member.toString()],
    };
    const graphData =
      GraphInternals.prepareGraphData(config)(SPARQL_CONSTRUCT_RESPONSE);

    const expectedGraphData =
      [
        {
          'group': 'edges',
          'data': {
            'id': person.alice.toString() + foaf.knows.toString() + person.bob.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.alice.toString(),
            'target': person.bob.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.alice.toString() + foaf.knows.toString() + person.carol.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.alice.toString(),
            'target': person.carol.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.alice.toString() + foaf.knows.toString() + person.mike.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.alice.toString(),
            'target': person.mike.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.mike.toString() + foaf.knows.toString() + person.carol.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.mike.toString(),
            'target': person.carol.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.carol.toString() + foaf.knows.toString() + person.mike.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.carol.toString(),
            'target': person.mike.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.bob.toString() + foaf.knows.toString() + person.carol.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.bob.toString(),
            'target': person.carol.toString(),
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.alice.toString(),
            'node': person.alice,
            'resource': person.alice.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${vocabularies.rdfs.label}`]: Rdf.literal('Alice').toString(),
            [`->${foaf.knows}`]: `${person.bob} ${person.carol} ${person.mike}`,
            [`->${foaf.member}`]: person.W3C.toString(),

            [`${vocabularies.rdfs.label}`]: [Rdf.literal('Alice')],
            [`${foaf.knows}`]: [
              person.bob, person.carol, person.mike,
            ],
            [`${foaf.member}`]: [person.W3C],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.bob.toString(),
            'node': person.bob,
            'resource': person.bob.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${foaf.knows}`]: person.carol.toString(),
            [`${foaf.knows}`]: [person.carol],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.carol.toString(),
            'node': person.carol,
            'resource': person.carol.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${foaf.knows}`]: person.mike.toString(),
            [`${foaf.knows}`]: [person.mike],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.mike.toString(),
            'node': person.mike,
            'resource': person.mike.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${foaf.knows}`]: person.carol.toString(),
            [`->${foaf.member}`]: person.W3C.toString(),
            [`${foaf.knows}`]: [person.carol],
            [`${foaf.member}`]: [person.W3C],
          },
        },
      ];

    assert.sameDeepMembers<any>(graphData, expectedGraphData);
  });

  it('build data with show predicates', () => {
    // with showPredicates it is possible to specify list of edges/nodes that need to be visualized

    const config = {
      query: '',
      height: 0,
      showPredicates: [vocabularies.rdfs.label.toString(), foaf.member.toString()],
    };
    const graphData =
      GraphInternals.prepareGraphData(config)(SPARQL_CONSTRUCT_RESPONSE);

    const expectedGraphData =
      [
        {
          'group': 'edges',
          'data': {
            'id': person.alice.toString() + vocabularies.rdfs.label.toString() + Rdf.literal('Alice').toString(),
            'node': vocabularies.rdfs.label,
            'resource': vocabularies.rdfs.label.toString(),
            'source': person.alice.toString(),
            'target': Rdf.literal('Alice').toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.alice.toString() + foaf.member.toString() + person.W3C.toString(),
            'node': foaf.member,
            'resource': foaf.member.toString(),
            'source': person.alice.toString(),
            'target': person.W3C.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.mike.toString() + foaf.member.toString() + person.W3C.toString(),
            'node': foaf.member,
            'resource': foaf.member.toString(),
            'source': person.mike.toString(),
            'target': person.W3C.toString(),
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.alice.toString(),
            'node': person.alice,
            'resource': person.alice.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${vocabularies.rdfs.label}`]: Rdf.literal('Alice').toString(),
            [`->${foaf.knows}`]: `${person.bob} ${person.carol} ${person.mike}`,
            [`->${foaf.member}`]: person.W3C.toString(),

            [`${vocabularies.rdfs.label}`]: [Rdf.literal('Alice')],
            [`${foaf.knows}`]: [
              person.bob, person.carol, person.mike,
            ],
            [`${foaf.member}`]: [person.W3C],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': Rdf.literal('Alice').toString(),
            'node': Rdf.literal('Alice'),
            'resource': Rdf.literal('Alice').toString(),
            'parent': undefined,
            'isIri': false,
            'isLiteral': true,
            'isBnode': false,
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.mike.toString(),
            'node': person.mike,
            'resource': person.mike.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${foaf.knows}`]: person.carol.toString(),
            [`->${foaf.member}`]: person.W3C.toString(),
            [`${foaf.knows}`]: [person.carol],
            [`${foaf.member}`]: [person.W3C],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.W3C.toString(),
            'node': person.W3C,
            'resource': person.W3C.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
          },
        },
      ];

    assert.sameDeepMembers<any>(graphData, expectedGraphData);
  });

  it('build data with group-by', () => {
    // group by adds parent to cytoscape node

    const config = {
      query: '',
      height: 0,
      groupBy: foaf.member.toString(),
    };
    const graphData =
      GraphInternals.prepareGraphData(config)(SPARQL_CONSTRUCT_RESPONSE);

    const expectedGraphData =
      [
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.alice.toString() +
              foaf.member.toString() + person.W3C.toString(),
            'node': foaf.member,
            'resource': foaf.member.toString(),
            'source': person.W3C.toString() + person.alice.toString(),
            'target': person.W3C.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.mike.toString() +
              foaf.member.toString() + person.W3C.toString(),
            'node': foaf.member,
            'resource': foaf.member.toString(),
            'source': person.W3C.toString() + person.mike.toString(),
            'target': person.W3C.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.alice.toString() +
            vocabularies.rdfs.label.toString() + Rdf.literal('Alice').toString(),
            'node': vocabularies.rdfs.label,
            'resource': vocabularies.rdfs.label.toString(),
            'source': person.W3C.toString() + person.alice.toString(),
            'target': Rdf.literal('Alice').toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.alice.toString() +
            foaf.knows.toString() + person.bob.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C.toString() + person.alice.toString(),
            'target': person.bob.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.alice.toString() +
            foaf.knows.toString() + person.carol.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C.toString() + person.alice.toString(),
            'target': person.carol.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.alice.toString() +
            foaf.knows.toString() + person.W3C.toString() + person.mike.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C.toString() + person.alice.toString(),
            'target': person.W3C.toString() + person.mike.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.mike.toString() +
            foaf.knows.toString() + person.carol.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C.toString() + person.mike.toString(),
            'target': person.carol.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.carol.toString() + foaf.knows.toString() +
            person.W3C.toString() + person.mike.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.carol.toString(),
            'target': person.W3C.toString() + person.mike.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.bob.toString() + foaf.knows.toString() + person.carol.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.bob.toString(),
            'target': person.carol.toString(),
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.W3C.toString() + person.alice.toString(),
            'node': person.alice,
            'resource': person.alice.toString(),
            'parent': person.W3C.toString(),
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${vocabularies.rdfs.label}`]: Rdf.literal('Alice').toString(),
            [`->${foaf.knows}`]: `${person.bob} ${person.carol} ${person.mike}`,
            [`->${foaf.member}`]: person.W3C.toString(),

            [`${vocabularies.rdfs.label}`]: [Rdf.literal('Alice')],
            [`${foaf.knows}`]: [
              person.bob, person.carol, person.mike,
            ],
            [`${foaf.member}`]: [person.W3C],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': Rdf.literal('Alice').toString(),
            'node': Rdf.literal('Alice'),
            'resource': Rdf.literal('Alice').toString(),
            'parent': undefined,
            'isIri': false,
            'isLiteral': true,
            'isBnode': false,
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.bob.toString(),
            'node': person.bob,
            'resource': person.bob.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${foaf.knows}`]: person.carol.toString(),
            [`${foaf.knows}`]: [person.carol],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.carol.toString(),
            'node': person.carol,
            'resource': person.carol.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${foaf.knows}`]: person.mike.toString(),
            [`${foaf.knows}`]: [person.mike],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.W3C.toString() + person.mike.toString(),
            'node': person.mike,
            'resource': person.mike.toString(),
            'parent': person.W3C.toString(),
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${foaf.knows}`]: person.carol.toString(),
            [`->${foaf.member}`]: person.W3C.toString(),
            [`${foaf.knows}`]: [person.carol],
            [`${foaf.member}`]: [person.W3C],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.W3C.toString(),
            'node': person.W3C,
            'resource': person.W3C.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
          },
        },
      ];

    assert.sameDeepMembers<any>(graphData, expectedGraphData);
  });

  it('build data with group-by and hidden predicates', () => {
    // we can use hidden predicate in group-by, also hidden predicate are available on data objects

    const config = {
      query: '',
      height: 0,
      groupBy: foaf.member.toString(),
      hidePredicates: [vocabularies.rdfs.label.toString()],
    };
    const graphData =
      GraphInternals.prepareGraphData(config)(SPARQL_CONSTRUCT_RESPONSE);

    const expectedGraphData =
      [
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.alice.toString() +
              foaf.member.toString() + person.W3C.toString(),
            'node': foaf.member,
            'resource': foaf.member.toString(),
            'source': person.W3C.toString() + person.alice.toString(),
            'target': person.W3C.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.mike.toString() +
              foaf.member.toString() + person.W3C.toString(),
            'node': foaf.member,
            'resource': foaf.member.toString(),
            'source': person.W3C.toString() + person.mike.toString(),
            'target': person.W3C.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.alice.toString() +
            foaf.knows.toString() + person.bob.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C.toString() + person.alice.toString(),
            'target': person.bob.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.alice.toString() +
            foaf.knows.toString() + person.carol.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C.toString() + person.alice.toString(),
            'target': person.carol.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.alice.toString() +
            foaf.knows.toString() + person.W3C.toString() + person.mike.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C.toString() + person.alice.toString(),
            'target': person.W3C.toString() + person.mike.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.mike.toString() +
            foaf.knows.toString() + person.carol.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C.toString() + person.mike.toString(),
            'target': person.carol.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.carol.toString() + foaf.knows.toString() +
            person.W3C.toString() + person.mike.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.carol.toString(),
            'target': person.W3C.toString() + person.mike.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.bob.toString() + foaf.knows.toString() + person.carol.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.bob.toString(),
            'target': person.carol.toString(),
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.W3C.toString() + person.alice.toString(),
            'node': person.alice,
            'resource': person.alice.toString(),
            'parent': person.W3C.toString(),
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${vocabularies.rdfs.label}`]: Rdf.literal('Alice').toString(),
            [`->${foaf.knows}`]: `${person.bob} ${person.carol} ${person.mike}`,
            [`->${foaf.member}`]: person.W3C.toString(),

            [`${vocabularies.rdfs.label}`]: [Rdf.literal('Alice')],
            [`${foaf.knows}`]: [
              person.bob, person.carol, person.mike,
            ],
            [`${foaf.member}`]: [person.W3C],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.bob.toString(),
            'node': person.bob,
            'resource': person.bob.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${foaf.knows}`]: person.carol.toString(),
            [`${foaf.knows}`]: [person.carol],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.carol.toString(),
            'node': person.carol,
            'resource': person.carol.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${foaf.knows}`]: person.mike.toString(),
            [`${foaf.knows}`]: [person.mike],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.W3C.toString() + person.mike.toString(),
            'node': person.mike,
            'resource': person.mike.toString(),
            'parent': person.W3C.toString(),
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${foaf.knows}`]: person.carol.toString(),
            [`->${foaf.member}`]: person.W3C.toString(),
            [`${foaf.knows}`]: [person.carol],
            [`${foaf.member}`]: [person.W3C],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.W3C.toString(),
            'node': person.W3C,
            'resource': person.W3C.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
          },
        },
      ];

    assert.sameDeepMembers<any>(graphData, expectedGraphData);
  });

  it('build data with group-by and show predicates', () => {
    // with showPredicates it is possible to specify list of edges/nodes that need to be visualized
    // hidden properties can be used for group by

    const config = {
      query: '',
      height: 0,
      showPredicates: [foaf.knows.toString()],
      groupBy: foaf.member.toString(),
    };
    const graphData =
      GraphInternals.prepareGraphData(config)(SPARQL_CONSTRUCT_RESPONSE);

    const expectedGraphData =
      [
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.alice.toString() +
            foaf.knows.toString() + person.bob.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C.toString() + person.alice.toString(),
            'target': person.bob.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.alice.toString() +
            foaf.knows.toString() + person.carol.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C.toString() + person.alice.toString(),
            'target': person.carol.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.alice.toString() +
            foaf.knows.toString() + person.W3C.toString() + person.mike.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C.toString() + person.alice.toString(),
            'target': person.W3C.toString() + person.mike.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.mike.toString() +
            foaf.knows.toString() + person.carol.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C.toString() + person.mike.toString(),
            'target': person.carol.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.carol.toString() + foaf.knows.toString() +
            person.W3C.toString() + person.mike.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.carol.toString(),
            'target': person.W3C.toString() + person.mike.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.bob.toString() + foaf.knows.toString() + person.carol.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.bob.toString(),
            'target': person.carol.toString(),
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.W3C.toString() + person.alice.toString(),
            'node': person.alice,
            'resource': person.alice.toString(),
            'parent': person.W3C.toString(),
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${vocabularies.rdfs.label}`]: Rdf.literal('Alice').toString(),
            [`->${foaf.knows}`]: `${person.bob} ${person.carol} ${person.mike}`,
            [`->${foaf.member}`]: person.W3C.toString(),

            [`${vocabularies.rdfs.label}`]: [Rdf.literal('Alice')],
            [`${foaf.knows}`]: [
              person.bob, person.carol, person.mike,
            ],
            [`${foaf.member}`]: [person.W3C],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.bob.toString(),
            'node': person.bob,
            'resource': person.bob.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${foaf.knows}`]: person.carol.toString(),
            [`${foaf.knows}`]: [person.carol],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.carol.toString(),
            'node': person.carol,
            'resource': person.carol.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${foaf.knows}`]: person.mike.toString(),
            [`${foaf.knows}`]: [person.mike],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.W3C.toString() + person.mike.toString(),
            'node': person.mike,
            'resource': person.mike.toString(),
            'parent': person.W3C.toString(),
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${foaf.knows}`]: person.carol.toString(),
            [`->${foaf.member}`]: person.W3C.toString(),
            [`${foaf.knows}`]: [person.carol],
            [`${foaf.member}`]: [person.W3C],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.W3C.toString(),
            'node': person.W3C,
            'resource': person.W3C.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
          },
        },
      ];

    assert.sameDeepMembers<any>(graphData, expectedGraphData);
  });

  it('build data with group-by and node mirroring', () => {
    // create data for graph where node can be part of many groups

    const COMPLEX_GROUPED_DATA = [
      Rdf.triple(person.alice, vocabularies.rdfs.label, Rdf.literal('Alice')),
      Rdf.triple(person.alice, foaf.knows, person.bob),
      Rdf.triple(person.alice, foaf.knows, person.carol),
      Rdf.triple(person.alice, foaf.knows, person.mike),
      Rdf.triple(person.alice, foaf.member, person.W3C),
      Rdf.triple(person.mike, foaf.member, person.W3C),
      Rdf.triple(person.mike, foaf.knows, person.carol),
      Rdf.triple(person.carol, foaf.knows, person.mike),
      Rdf.triple(person.bob, foaf.knows, person.carol),

      Rdf.triple(person.carol, foaf.member, person.W3C2),
      Rdf.triple(person.bob, foaf.member, person.W3C2),
      Rdf.triple(person.mike, foaf.member, person.W3C2),

      Rdf.triple(person.alice, foaf.knows, person.sam),
      Rdf.triple(person.mike, foaf.knows, person.sam),
      Rdf.triple(person.bob, foaf.knows, person.sam),
    ];

    const config = {
      query: '',
      height: 0,
      groupBy: foaf.member.toString(),
      hidePredicates: [foaf.member.toString()],
    };
    const graphData =
      GraphInternals.prepareGraphData(config)(COMPLEX_GROUPED_DATA);

    const expectedGraphData =
      [
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.alice.toString() +
            vocabularies.rdfs.label.toString() + Rdf.literal('Alice').toString(),
            'node': vocabularies.rdfs.label,
            'resource': vocabularies.rdfs.label.toString(),
            'source': person.W3C.toString() + person.alice.toString(),
            'target': Rdf.literal('Alice').toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.alice.toString() +
              foaf.knows.toString() + person.W3C2.toString() + person.bob.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C.toString() + person.alice.toString(),
            'target': person.W3C2.toString() + person.bob.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.alice.toString() +
              foaf.knows.toString() + person.W3C2.toString() + person.carol.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C.toString() + person.alice.toString(),
            'target': person.W3C2.toString() + person.carol.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.alice.toString() +
            foaf.knows.toString() + person.W3C.toString() + person.mike.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C.toString() + person.alice.toString(),
            'target': person.W3C.toString() + person.mike.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C2.toString() + person.mike.toString() +
              foaf.knows.toString() + person.W3C2.toString() + person.carol.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C2.toString() + person.mike.toString(),
            'target': person.W3C2.toString() + person.carol.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.mike.toString() +
              foaf.knows.toString() + person.sam.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C.toString() + person.mike.toString(),
            'target': person.sam.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C.toString() + person.alice.toString() +
              foaf.knows.toString() + person.sam.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C.toString() + person.alice.toString(),
            'target': person.sam.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C2.toString() + person.mike.toString() +
              foaf.knows.toString() + person.sam.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C2.toString() + person.mike.toString(),
            'target': person.sam.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C2.toString() + person.bob.toString() +
              foaf.knows.toString() + person.sam.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C2.toString() + person.bob.toString(),
            'target': person.sam.toString(),
          },
        },

        {
          'group': 'edges',
          'data': {
            'id': person.W3C2.toString() + person.carol.toString() + foaf.knows.toString() +
              person.W3C2.toString() + person.mike.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C2.toString() + person.carol.toString(),
            'target': person.W3C2.toString() + person.mike.toString(),
          },
        },
        {
          'group': 'edges',
          'data': {
            'id': person.W3C2.toString() + person.bob.toString() +
              foaf.knows.toString() + person.W3C2.toString() + person.carol.toString(),
            'node': foaf.knows,
            'resource': foaf.knows.toString(),
            'source': person.W3C2.toString() + person.bob.toString(),
            'target': person.W3C2.toString() + person.carol.toString(),
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.W3C.toString() + person.alice.toString(),
            'node': person.alice,
            'resource': person.alice.toString(),
            'parent': person.W3C.toString(),
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${vocabularies.rdfs.label}`]: Rdf.literal('Alice').toString(),
            [`->${foaf.knows}`]: `${person.bob} ${person.carol} ${person.mike} ${person.sam}`,
            [`->${foaf.member}`]: person.W3C.toString(),

            [`${vocabularies.rdfs.label}`]: [Rdf.literal('Alice')],
            [`${foaf.knows}`]: [
              person.bob, person.carol, person.mike, person.sam,
            ],
            [`${foaf.member}`]: [person.W3C],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': Rdf.literal('Alice').toString(),
            'node': Rdf.literal('Alice'),
            'resource': Rdf.literal('Alice').toString(),
            'parent': undefined,
            'isIri': false,
            'isLiteral': true,
            'isBnode': false,
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.W3C2.toString() + person.bob.toString(),
            'node': person.bob,
            'resource': person.bob.toString(),
            'parent': person.W3C2.toString(),
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${foaf.knows}`]: `${person.carol} ${person.sam}`,
            [`->${foaf.member}`]: `${person.W3C2}`,
            [`${foaf.knows}`]: [person.carol, person.sam],
            [`${foaf.member}`]: [person.W3C2],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.sam.toString(),
            'node': person.sam,
            'resource': person.sam.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.W3C2.toString() + person.carol.toString(),
            'node': person.carol,
            'resource': person.carol.toString(),
            'parent': person.W3C2.toString(),
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${foaf.knows}`]: person.mike.toString(),
            [`->${foaf.member}`]: `${person.W3C2}`,
            [`${foaf.knows}`]: [person.mike],
            [`${foaf.member}`]: [person.W3C2],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.W3C.toString() + person.mike.toString(),
            'node': person.mike,
            'resource': person.mike.toString(),
            'parent': person.W3C.toString(),
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${foaf.knows}`]: `${person.carol} ${person.sam}`,
            [`->${foaf.member}`]: `${person.W3C} ${person.W3C2}`,
            [`${foaf.knows}`]: [person.carol, person.sam],
            [`${foaf.member}`]: [person.W3C, person.W3C2],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.W3C2.toString() + person.mike.toString(),
            'node': person.mike,
            'resource': person.mike.toString(),
            'parent': person.W3C2.toString(),
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
            [`->${foaf.knows}`]: `${person.carol} ${person.sam}`,
            [`->${foaf.member}`]: `${person.W3C} ${person.W3C2}`,
            [`${foaf.knows}`]: [person.carol, person.sam],
            [`${foaf.member}`]: [person.W3C, person.W3C2],
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.W3C.toString(),
            'node': person.W3C,
            'resource': person.W3C.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
          },
        },
        {
          'group': 'nodes',
          'data': {
            'id': person.W3C2.toString(),
            'node': person.W3C2,
            'resource': person.W3C2.toString(),
            'parent': undefined,
            'isIri': true,
            'isLiteral': false,
            'isBnode': false,
          },
        },
      ];

    assert.sameDeepMembers<any>(graphData, expectedGraphData);
  });
});
