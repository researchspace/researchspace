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

import { expect } from 'chai';

import { Rdf } from 'platform/api/rdf';
import { xsd, rdf, persist } from 'platform/api/rdf/vocabularies';
import { ObjectGraph } from 'platform/api/rdf';

const { JsonUndefined } = persist;

const EXAMPLE_JS = [
  {
    abc: [123, 3.14, 'str'],
    def: 'abc',
  },
  {
    '123': [3.14, {}],
    def: true,
  },
];

const BASE_NAMESPACE = Rdf.iri('http://example.com');

function propertyKey(key: string) {
  return ObjectGraph.propertyKeyToIriDefault(key, BASE_NAMESPACE);
}

const exampleGraph = Rdf.graph([
  Rdf.triple(Rdf.iri('http://example.com/root'), rdf.first, Rdf.bnode('0')),
  Rdf.triple(Rdf.iri('http://example.com/root'), rdf.rest, Rdf.bnode('0rest')),
  Rdf.triple(Rdf.bnode('0rest'), rdf.first, Rdf.bnode('1')),
  Rdf.triple(Rdf.bnode('0rest'), rdf.rest, rdf.nil),

  Rdf.triple(Rdf.bnode('0'), propertyKey('abc'), Rdf.bnode('0_abc')),
  Rdf.triple(Rdf.bnode('0'), propertyKey('def'), Rdf.literal('abc')),
  Rdf.triple(Rdf.bnode('1'), propertyKey('123'), Rdf.bnode('1_123')),
  Rdf.triple(Rdf.bnode('1'), propertyKey('def'), Rdf.literal(true)),

  Rdf.triple(Rdf.bnode('0_abc'), rdf.first, Rdf.literal('123', xsd.integer)),
  Rdf.triple(Rdf.bnode('0_abc'), rdf.rest, Rdf.bnode('0_abc_0rest')),
  Rdf.triple(Rdf.bnode('0_abc_0rest'), rdf.first, Rdf.literal('3.14', xsd.double)),
  Rdf.triple(Rdf.bnode('0_abc_0rest'), rdf.rest, Rdf.bnode('0_abc_1rest')),
  Rdf.triple(Rdf.bnode('0_abc_1rest'), rdf.first, Rdf.literal('str')),
  Rdf.triple(Rdf.bnode('0_abc_1rest'), rdf.rest, rdf.nil),

  Rdf.triple(Rdf.bnode('1_123'), rdf.first, Rdf.literal('3.14', xsd.double)),
  Rdf.triple(Rdf.bnode('1_123'), rdf.rest, Rdf.bnode('1_123_0rest')),
  Rdf.triple(Rdf.bnode('1_123_0rest'), rdf.first, Rdf.bnode('1_123_1')),
  Rdf.triple(Rdf.bnode('1_123_0rest'), rdf.rest, rdf.nil),
]);

function checkObjectToGraphAndBack(example) {
  const graph = ObjectGraph.serialize(example, BASE_NAMESPACE);
  /* Comment this line with // for tests update
  turtle.serialize.serializeGraph(graph.graph).onValue(value => {
    console.log('serialized graph for ' + JSON.stringify(example) + ':\n' +
      'Size: ' + graph.graph.triples.toArray().length + '\n' +
      'Root: ' + graph.pointer.value + '\n' + value);
    return true;
  }).observe({end: () => { }});
  // */
  const obj = ObjectGraph.deserialize(graph.pointer, graph.graph);
  expect(obj).to.be.deep.equals(example);
}

describe('JsObjectGraph', () => {
  it('converts JS object to RDF graph and back', () => {
    checkObjectToGraphAndBack(EXAMPLE_JS);
  });

  it('converts RDF graph to JS object', () => {
    const obj = ObjectGraph.deserialize(Rdf.iri('http://example.com/root'), exampleGraph);
    expect(obj).to.be.deep.equal(EXAMPLE_JS);
  });

  it('converts JS object with nulls to RDF graph and back', () => {
    checkObjectToGraphAndBack(null);
    checkObjectToGraphAndBack([null]);
    checkObjectToGraphAndBack([[]]);
    checkObjectToGraphAndBack({ k: null });
    checkObjectToGraphAndBack({ k: [] });
    checkObjectToGraphAndBack({ k: {} });
    checkObjectToGraphAndBack({ k: [{}, null, [], [true, false], { key: null, key2: 123 }] });
  });

  it('converts JS object with nulls to RDF graph and back', () => {
    checkObjectToGraphAndBack(undefined);
    checkObjectToGraphAndBack([undefined]);
    checkObjectToGraphAndBack({ k: [{}, undefined, [], [true, false], { key: null, key2: 123 }] });
  });

  it('serializes functions as undefined', () => {
    const functionGraph = ObjectGraph.serialize((x: number) => x + 1, BASE_NAMESPACE);
    expect(functionGraph.pointer).to.be.equal(JsonUndefined);
    expect(functionGraph.graph.triples.toArray()).to.be.empty;
  });

  it('serializes non-plain objects as undefined', () => {
    const nonPlainObjectGraph = ObjectGraph.serialize(Rdf.iri('http://example.com'), BASE_NAMESPACE);
    expect(nonPlainObjectGraph.pointer).to.be.equal(JsonUndefined);
    expect(nonPlainObjectGraph.graph.triples.toArray()).to.be.empty;
  });

  it('omits entries with undefined values from plain objects', () => {
    const data = {
      bar: {
        k1: 'A',
        k2: null,
        k3: undefined,
      },
      qux: undefined,
    };
    const expected = {
      bar: {
        k1: 'A',
        k2: null,
      },
    };
    const { graph, pointer } = ObjectGraph.serialize(data, BASE_NAMESPACE);
    const result = ObjectGraph.deserialize(pointer, graph);
    expect(result).to.be.deep.equal(expected);
  });
});
