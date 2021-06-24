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

import { expect, assert } from 'chai';
import { createElement } from 'react';
import * as sinon from 'sinon';
import * as Kefir from 'kefir';

import { Rdf, vocabularies } from 'platform/api/rdf';
import * as NamespaceService from 'platform/api/services/namespace';
import { SemanticGraph, SemanticGraphProps, SemanticGraphState, Graph } from 'platform/components/semantic/graph';

import { mount, ReactWrapper } from 'platform-tests/configuredEnzyme';
import { mockConfig } from 'platform-tests/mocks';
import { mockLabelsService } from 'platform-tests/mocks/LabelService';
import { mockConstructQuery } from 'platform-tests/mocks/SparqlClient';
import { mockThumbnailService } from 'platform-tests/mocks/ThumbnailService';

import { foaf, person } from './TestData';

mockConfig();

sinon.stub(NamespaceService, 'getRegisteredPrefixes').callsFake(function () {
  return Kefir.constant({});
});

const QUERY = `
        prefix vocabularies.rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        prefix person: <http://example.com/person/>
        prefix foaf: <http://xmlns.com/foaf/0.1/>

        CONSTRUCT {
          ?s ?p ?o
        } WHERE {
         {
           SELECT ?s ?p ?o WHERE {
             VALUES (?s ?p ?o)
             {
               (person:alice foaf:knows person:bob)
               (person:alice vocabularies.rdfs:label "Alice")
               (person:alice foaf:knows person:carol)
               (person:carol foaf:knows person:mike)
               (person:mike foaf:knows person:carol)
               (person:bob foaf:knows person:carol)
               (person:alice foaf:knows person:mike)
               (person:alice foaf:member person:W3C)
               (person:mike foaf:member person:W3C)
             }
           }
         }
       }
`;

const DATA = `
@prefix vocabularies.rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix person: <http://example.com/person/> .

person:alice
  vocabularies.rdfs:label "Alice" ;
  foaf:knows person:bob ;
  foaf:knows person:carol ;
  foaf:knows person:mike ;
  foaf:member person:W3C .

person:mike foaf:member person:W3C ;
  foaf:knows person:carol .

person:carol foaf:knows person:mike .
person:bob foaf:knows person:carol .
`;

const LABELS = `
{
  "http://xmlns.com/foaf/0.1/knows":"foaf:knows",
  "http://www.w3.org/2000/01/rdf-schema#label":"label",
  "http://xmlns.com/foaf/0.1/member":"foaf:member",
  "http://example.com/person/W3C":"W3C",
  "http://example.com/person/alice":"alice",
  "http://example.com/person/bob":"bob",
  "http://example.com/person/carol":"carol",
  "http://example.com/person/mike":"mike"
}
`;

const W3C_THUMBNAIL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/W3C%C2%AE_Icon.svg/210px-W3C%C2%AE_Icon.svg.png';
const DEFAULT_THUMBNAIL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const THUMBNAILS = `
{
  "http://example.com/person/W3C": "${W3C_THUMBNAIL}",
  "http://example.com/person/alice": null,
  "http://example.com/person/bob": null,
  "http://example.com/person/carol": null,
  "http://example.com/person/mike": null
}
`;

describe('graph-widget', () => {
  let server: sinon.SinonFakeServer;

  before(function () {
    server = sinon.fakeServer.create();
    server.respondImmediately = true;
    mockConstructQuery(server, DATA);
    mockLabelsService(server, LABELS);
    mockThumbnailService(server, THUMBNAILS);
  });

  after(function () {
    server.restore();
  });

  describe('rendering with default graph-widget configuration', () => {
    let graphWidget: ReactWrapper<SemanticGraphProps, SemanticGraphState>;

    before(function (done: MochaDone) {
      graphWidget = mount<SemanticGraphProps, SemanticGraphState>(
        createElement(SemanticGraph, {
          query: QUERY,
          height: 0,
        })
      );

      // because we asynchronously fetch data in the graph-widget, we need to wait until
      // all mocked asynchronous calls are resolved.
      setTimeout(() => {
        graphWidget.update();
        done();
      }, 1000);
    });

    it('default stylesheet is applied if no styles are provided in props', () => {
      const cytoscapeComponent = graphWidget.find(Graph);
      expect(cytoscapeComponent.props().graphStyle).to.be.deep.equal(SemanticGraph.DEFAULT_STYLE);
    });

    it('query executed and result is properly translated to Cytotscape format', () => {
      const expectedGraphData = [
        {
          group: 'edges',
          data: {
            id: person.alice.toString() + foaf.knows.toString() + person.bob.toString(),
            label: 'foaf:knows',
            node: foaf.knows,
            resource: foaf.knows.toString(),
            source: person.alice.toString(),
            target: person.bob.toString(),
            thumbnail: DEFAULT_THUMBNAIL,
          },
        },
        {
          group: 'edges',
          data: {
            id: person.alice.toString() + foaf.knows.toString() + person.carol.toString(),
            label: 'foaf:knows',
            node: foaf.knows,
            resource: foaf.knows.toString(),
            source: person.alice.toString(),
            target: person.carol.toString(),
            thumbnail: DEFAULT_THUMBNAIL,
          },
        },
        {
          group: 'edges',
          data: {
            id: person.alice.toString() + foaf.knows.toString() + person.mike.toString(),
            label: 'foaf:knows',
            node: foaf.knows,
            resource: foaf.knows.toString(),
            source: person.alice.toString(),
            target: person.mike.toString(),
            thumbnail: DEFAULT_THUMBNAIL,
          },
        },
        {
          group: 'edges',
          data: {
            id: person.alice.toString() + foaf.member.toString() + person.W3C.toString(),
            label: 'foaf:member',
            node: foaf.member,
            resource: foaf.member.toString(),
            source: person.alice.toString(),
            target: person.W3C.toString(),
            thumbnail: DEFAULT_THUMBNAIL,
          },
        },
        {
          group: 'edges',
          data: {
            id: person.mike.toString() + foaf.member.toString() + person.W3C.toString(),
            label: 'foaf:member',
            node: foaf.member,
            resource: foaf.member.toString(),
            source: person.mike.toString(),
            target: person.W3C.toString(),
            thumbnail: DEFAULT_THUMBNAIL,
          },
        },
        {
          group: 'edges',
          data: {
            id: person.mike.toString() + foaf.knows.toString() + person.carol.toString(),
            label: 'foaf:knows',
            node: foaf.knows,
            resource: foaf.knows.toString(),
            source: person.mike.toString(),
            target: person.carol.toString(),
            thumbnail: DEFAULT_THUMBNAIL,
          },
        },
        {
          group: 'edges',
          data: {
            id: person.carol.toString() + foaf.knows.toString() + person.mike.toString(),
            label: 'foaf:knows',
            node: foaf.knows,
            resource: foaf.knows.toString(),
            source: person.carol.toString(),
            target: person.mike.toString(),
            thumbnail: DEFAULT_THUMBNAIL,
          },
        },
        {
          group: 'edges',
          data: {
            id: person.bob.toString() + foaf.knows.toString() + person.carol.toString(),
            label: 'foaf:knows',
            node: foaf.knows,
            resource: foaf.knows.toString(),
            source: person.bob.toString(),
            target: person.carol.toString(),
            thumbnail: DEFAULT_THUMBNAIL,
          },
        },
        {
          group: 'nodes',
          data: {
            id: person.alice.toString(),
            label: 'alice',
            node: person.alice,
            resource: person.alice.toString(),
            parent: undefined,
            isIri: true,
            isLiteral: false,
            isBnode: false,
            [`->${vocabularies.rdfs.label}`]: Rdf.literal('Alice').toString(),
            [`->${foaf.knows}`]: `${person.bob} ${person.carol} ${person.mike}`,
            [`->${foaf.member}`]: person.W3C.toString(),

            [`${vocabularies.rdfs.label}`]: [Rdf.literal('Alice')],
            [`${foaf.knows}`]: [person.bob, person.carol, person.mike],
            [`${foaf.member}`]: [person.W3C],
            thumbnail: DEFAULT_THUMBNAIL,
          },
        },
        {
          group: 'nodes',
          data: {
            id: person.bob.toString(),
            label: 'bob',
            node: person.bob,
            resource: person.bob.toString(),
            parent: undefined,
            isIri: true,
            isLiteral: false,
            isBnode: false,
            [`->${foaf.knows}`]: person.carol.toString(),
            [`${foaf.knows}`]: [person.carol],
            thumbnail: DEFAULT_THUMBNAIL,
          },
        },
        {
          group: 'nodes',
          data: {
            id: person.carol.toString(),
            label: 'carol',
            node: person.carol,
            resource: person.carol.toString(),
            parent: undefined,
            isIri: true,
            isLiteral: false,
            isBnode: false,
            [`->${foaf.knows}`]: person.mike.toString(),
            [`${foaf.knows}`]: [person.mike],
            thumbnail: DEFAULT_THUMBNAIL,
          },
        },
        {
          group: 'nodes',
          data: {
            id: person.mike.toString(),
            label: 'mike',
            node: person.mike,
            resource: person.mike.toString(),
            parent: undefined,
            isIri: true,
            isLiteral: false,
            isBnode: false,
            [`->${foaf.knows}`]: person.carol.toString(),
            [`->${foaf.member}`]: person.W3C.toString(),
            [`${foaf.knows}`]: [person.carol],
            [`${foaf.member}`]: [person.W3C],
            thumbnail: DEFAULT_THUMBNAIL,
          },
        },
        {
          group: 'nodes',
          data: {
            id: person.W3C.toString(),
            label: 'W3C',
            node: person.W3C,
            resource: person.W3C.toString(),
            parent: undefined,
            isIri: true,
            isLiteral: false,
            isBnode: false,
            thumbnail: W3C_THUMBNAIL,
          },
        },
      ];

      const cytoscapeComponent = graphWidget.find(Graph);
      assert.sameDeepMembers(cytoscapeComponent.props().elements, expectedGraphData);
    });
  });
});
