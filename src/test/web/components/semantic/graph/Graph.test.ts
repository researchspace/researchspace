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

import { createElement } from 'react';
import { expect } from 'chai';

import { Rdf, vocabularies } from 'platform/api/rdf';
import { Graph, GraphProps, GraphState } from 'platform/components/semantic/graph';

import { mount } from 'platform-tests/configuredEnzyme';
import { mockConfig } from 'platform-tests/mocks';

import { foaf, person } from './TestData';

mockConfig();

const GRAPH_DATA: Cy.ElementDefinition[] = [
  {
    group: 'edges',
    data: {
      label: 'label',
      node: vocabularies.rdfs.label,
      resource: vocabularies.rdfs.label.toString(),
      source: person.alice.toString(),
      target: Rdf.literal('Alice').toString(),
    },
  },
  {
    group: 'edges',
    data: {
      label: 'foaf:knows',
      node: foaf.knows,
      resource: foaf.knows.toString(),
      source: person.alice.toString(),
      target: person.bob.toString(),
    },
  },
  {
    group: 'edges',
    data: {
      label: 'foaf:knows',
      node: foaf.knows,
      resource: foaf.knows.toString(),
      source: person.alice.toString(),
      target: person.carol.toString(),
    },
  },
  {
    group: 'edges',
    data: {
      label: 'foaf:knows',
      node: foaf.knows,
      resource: foaf.knows.toString(),
      source: person.alice.toString(),
      target: person.mike.toString(),
    },
  },
  {
    group: 'edges',
    data: {
      label: 'foaf:member',
      node: foaf.member,
      resource: foaf.member.toString(),
      source: person.alice.toString(),
      target: person.W3C.toString(),
    },
  },
  {
    group: 'edges',
    data: {
      label: 'foaf:member',
      node: foaf.member,
      resource: foaf.member.toString(),
      source: person.mike.toString(),
      target: person.W3C.toString(),
    },
  },
  {
    group: 'edges',
    data: {
      label: 'foaf:knows',
      node: foaf.knows,
      resource: foaf.knows.toString(),
      source: person.mike.toString(),
      target: person.carol.toString(),
    },
  },
  {
    group: 'edges',
    data: {
      label: 'foaf:knows',
      node: foaf.knows,
      resource: foaf.knows.toString(),
      source: person.carol.toString(),
      target: person.mike.toString(),
    },
  },
  {
    group: 'edges',
    data: {
      label: 'foaf:knows',
      node: foaf.knows,
      resource: foaf.knows.toString(),
      source: person.bob.toString(),
      target: person.carol.toString(),
    },
  },
  {
    group: 'edges',
    data: {
      label: 'count',
      node: Rdf.iri('http://example.com/count'),
      resource: Rdf.iri('http://example.com/count').toString(),
      source: person.bob.toString(),
      target: Rdf.literal('2', vocabularies.xsd.integer).toString(),
    },
  },
  {
    group: 'nodes',
    data: {
      id: person.alice.toString(),
      node: person.alice,
      resource: person.alice.toString(),
      parent: undefined,
      isIri: true,
      isLiteral: false,
      label: 'alice',
      isBnode: false,
      [`->${vocabularies.rdfs.label}`]: Rdf.literal('Alice').toString(),
      [`->${foaf.knows}`]: `${person.bob} ${person.carol} ${person.mike}`,
      [`->${foaf.member}`]: person.W3C.toString(),

      [`${vocabularies.rdfs.label}`]: [Rdf.literal('Alice')],
      [`${foaf.knows}`]: [person.bob, person.carol, person.mike],
      [`${foaf.member}`]: [person.W3C],
    },
  },
  {
    group: 'nodes',
    data: {
      id: Rdf.literal('Alice').toString(),
      node: Rdf.literal('Alice'),
      resource: Rdf.literal('Alice').toString(),
      parent: undefined,
      isIri: false,
      isLiteral: true,
      label: 'Alice',
      isBnode: false,
    },
  },
  {
    group: 'nodes',
    data: {
      id: Rdf.literal('2', vocabularies.xsd.integer).toString(),
      node: Rdf.literal('2', vocabularies.xsd.integer).toString(),
      resource: Rdf.literal('2', vocabularies.xsd.integer).toString(),
      parent: undefined,
      isIri: false,
      isLiteral: true,
      label: '2',
      isBnode: false,
    },
  },
  {
    group: 'nodes',
    data: {
      id: person.bob.toString(),
      node: person.bob,
      resource: person.bob.toString(),
      parent: undefined,
      isIri: true,
      isLiteral: false,
      label: 'bob',
      isBnode: false,
      [`->${foaf.knows}`]: person.carol.toString(),
      [`-><http://example.com/count>`]: Rdf.literal('2', vocabularies.xsd.integer).toString(),
      [`${foaf.knows}`]: [person.carol],
      '<http://example.com/count>': [Rdf.literal('2', vocabularies.xsd.integer).toString()],
    },
  },
  {
    group: 'nodes',
    data: {
      id: person.carol.toString(),
      node: person.carol,
      resource: person.carol.toString(),
      parent: undefined,
      isIri: true,
      isLiteral: false,
      label: 'carol',
      isBnode: false,
      [`->${foaf.knows}`]: person.mike.toString(),
      [`${foaf.knows}`]: [person.mike],
    },
  },
  {
    group: 'nodes',
    data: {
      id: person.mike.toString(),
      node: person.mike,
      resource: person.mike.toString(),
      parent: undefined,
      isIri: true,
      isLiteral: false,
      label: 'mike',
      isBnode: false,
      [`->${foaf.knows}`]: person.carol.toString(),
      [`->${foaf.member}`]: person.W3C.toString(),
      [`${foaf.knows}`]: [person.carol],
      [`${foaf.member}`]: [person.W3C],
    },
  },
  {
    group: 'nodes',
    data: {
      id: person.W3C.toString(),
      node: person.W3C,
      resource: person.W3C.toString(),
      parent: undefined,
      isIri: true,
      isLiteral: false,
      label: 'W3C',
      isBnode: false,
    },
  },
];

const GRAPH_STYLESHEET = [
  {
    selector: 'node[?isLiteral]',
    style: {
      'background-color': '#F2ED59',
    },
  },
  {
    selector: 'node[resource = iri(<http://example.com/person/alice>)]',
    style: {
      content: '{{[<http://www.w3.org/2000/01/rdf-schema#label>].[0].value}}',
    },
  },
  {
    selector: 'node[resource = literal(2, iri(<http://www.w3.org/2001/XMLSchema#integer>))]',
    style: {
      'background-color': 'yellow',
    },
  },
  {
    selector: 'node[resource = literal(Alice)]',
    style: {
      'background-color': 'green',
    },
  },
  {
    selector: 'node[resource = iri(<http://example.com/person/mike>)]',
    style: {
      'background-color': '#30698C',
    },
  },
  {
    selector: 'node[resource = iri(<http://example.com/org/W3C>)]',
    style: {
      'background-color': '#75b461',
    },
  },
  {
    selector: 'node[property(<http://xmlns.com/foaf/0.1/knows>) *= iri(<http://example.com/person/carol>)]',
    style: {
      'background-color': 'red',
    },
  },
  {
    selector:
      'node[property(<http://xmlns.com/foaf/0.1/knows>) *= iri(<http://example.com/person/carol>)][property(<http://www.w3.org/2000/01/rdf-schema#label>) *= literal(Alice)]',
    style: {
      'border-color': '#D95E52',
    },
  },
  {
    selector:
      'node[property(<http://xmlns.com/foaf/0.1/knows>) *= iri(<http://example.com/person/carol>)][property(<http://example.com/count>) *= literal(2, iri(<http://www.w3.org/2001/XMLSchema#integer>))]',
    style: {
      content: 'Node linking to literal',
    },
  },
  {
    selector: '[expanded-collapsed = literal(collapsed)]',
    style: {
      shape: 'rectangle' as 'rectangle',
    },
  },
];

describe('cytoscape', () => {
  let cytoscape: Cy.Instance;

  before(function (done) {
    this.timeout(10000);

    const cytoscapeComponent = mount<GraphProps, GraphState>(
      createElement(Graph, {
        elements: GRAPH_DATA,
        graphStyle: GRAPH_STYLESHEET,
        height: 0,
      })
    );

    // because we asynchronously fetch data in the graph-widget, we need to wait until
    // all mocked asynchronous calls are resolved.
    setTimeout(() => {
      cytoscapeComponent.update();
      cytoscapeComponent.state().cytoscape.map((cy) => (cytoscape = cy));
      done();
    }, 3000);
  });

  it('use handlebars templates to access node values in stylesheets', () => {
    /**
     * test exact match on resource selector and ability to use
     * handlebars templates to access node values in styleesheets, e.g:
     * {
     *  'selector': 'node[resource = iri(<http://example.com/person/alice>)]',
     *  'style': {
     *    'content': '{{[<http://www.w3.org/2000/01/rdf-schema#label>].[0].value}}',
     *  },
     * }
     */
    expect(cytoscape.getElementById(person.alice.toString()).renderedStyle()['label']).to.be.equal('Alice');
  });

  it('exact typed literal matching', () => {
    /**
     * test exact match on typed literal resource
     * {
     *    'selector': 'node[resource = literal("2", iri(<http://www.w3.org/2001/XMLSchema#integer>))]',
     *    'style': {
     *      'background-color': 'yellow',
     *    },
     * }
     */
    expect(
      cytoscape.getElementById(Rdf.literal('2', vocabularies.xsd.integer).toString()).renderedStyle()[
        'background-color'
      ]
    ).to.be.equal('yellow');
  });

  it('exact string literal matching', () => {
    /**
     * test exact match on string literal resource
     * {
     *    'selector': 'node[resource = literal(Alice)]',
     *    'style': {
     *      'background-color': 'green',
     *    },
     * }
     */
    expect(cytoscape.getElementById(Rdf.literal('Alice').toString()).renderedStyle()['background-color']).to.be.equal(
      'green'
    );
  });

  it('match node by outgoing property value', () => {
    /**
     * Test that we can apply styles based on value of some outgoing property.
     * {
     *   'selector': 'node[property(<http://xmlns.com/foaf/0.1/knows>) *= iri(<http://example.com/person/carol>)]',
     *   'style': {
     *     'background-color': 'red',
     *   },
     * }
     */
    [person.bob.toString(), person.mike.toString()].forEach((id) =>
      expect(cytoscape.getElementById(id).renderedStyle()['background-color']).to.be.equal('red')
    );
  });

  it('conjunctive property matching with typed literal', () => {
    /**
     * Match on node which has two outgoing edges one of which is integer literal.
     * {
     *  'selector': 'node[property(<http://xmlns.com/foaf/0.1/knows>) *= iri(<http://example.com/person/carol>)][property(<http://example.com/count>) *= literal(2, iri(<http://www.w3.org/2001/XMLSchema#integer>))]',
     *   'style': {
     *     'content': 'Node linking to literal',
     *   },
     * }
     */
    expect(cytoscape.getElementById(person.bob.toString()).renderedStyle()['label']).to.be.equal(
      'Node linking to literal'
    );
  });

  it('conjunctive property matching with string literal', () => {
    /**
     * Conjunctive complex match with simple literal as value.
     *
     *  {
     *    'selector': 'node[property(<http://xmlns.com/foaf/0.1/knows>) *= iri(<http://example.com/person/carol>)][property(<http://www.w3.org/2000/01/rdf-schema#label>) *= literal(Alice)]',
     *    'style': {
     *      'background-color': '#D95E52',
     *    },
     * }
     */
    expect(cytoscape.getElementById(person.alice.toString()).renderedStyle()['border-color']).to.be.equal('#D95E52');
  });
});
