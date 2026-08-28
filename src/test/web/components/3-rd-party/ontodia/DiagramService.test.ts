/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { expect } from 'chai';
import * as Reactodia from '@reactodia/workspace';
import * as jsonld from 'jsonld';

import {
  OntodiaContextV1,
  JSONLD_DIAGRAM_FRAME,
  upgradeLegacyDiagram,
  addLegacyLayoutFields,
} from 'platform/components/3-rd-party/ontodia/data/DiagramService';

type LegacyElement = Reactodia.SerializedElement & {
  iri?: string;
  size?: { width: number; height: number };
  fixedSize?: boolean;
  isExpanded?: boolean;
};

function makeLegacyDiagram(elements: LegacyElement[]): Reactodia.SerializedDiagram {
  return {
    '@context': 'https://ontodia.org/context/v1.json',
    '@type': 'Diagram',
    layoutData: {
      '@type': 'Layout',
      elements,
      links: [],
    },
    linkTypeOptions: [],
  };
}

describe('DiagramService legacy layout compatibility', () => {
  describe('upgradeLegacyDiagram', () => {
    it('maps legacy fixedSize + size to TemplateProperties.ElementSize', () => {
      const diagram = makeLegacyDiagram([
        {
          '@type': 'Element', '@id': 'e1', iri: 'http://example.com/a',
          position: { x: 100, y: 200 },
          size: { width: 321, height: 123 },
          fixedSize: true,
        },
      ]);
      const upgraded = upgradeLegacyDiagram(diagram);
      const state = upgraded.layoutData.elements[0].elementState;
      expect(state[Reactodia.TemplateProperties.ElementSize]).to.deep.equal({ width: 321, height: 123 });
    });

    it('ignores size of elements without fixedSize', () => {
      const diagram = makeLegacyDiagram([
        {
          '@type': 'Element', '@id': 'e1', iri: 'http://example.com/a',
          position: { x: 0, y: 0 },
          size: { width: 150, height: 190 },
          fixedSize: false,
        },
      ]);
      const upgraded = upgradeLegacyDiagram(diagram);
      expect(upgraded).to.equal(diagram);
    });

    it('keeps an already present ElementSize state over the legacy fields', () => {
      const existing = { width: 10, height: 20 };
      const diagram = makeLegacyDiagram([
        {
          '@type': 'Element', '@id': 'e1', iri: 'http://example.com/a',
          position: { x: 0, y: 0 },
          size: { width: 300, height: 400 },
          fixedSize: true,
          elementState: { [Reactodia.TemplateProperties.ElementSize]: existing },
        },
      ]);
      const upgraded = upgradeLegacyDiagram(diagram);
      const state = upgraded.layoutData.elements[0].elementState;
      expect(state[Reactodia.TemplateProperties.ElementSize]).to.deep.equal(existing);
    });

    it('renames legacy pinned properties state key', () => {
      const pinned = { 'http://example.com/p': true };
      const diagram = makeLegacyDiagram([
        {
          '@type': 'Element', '@id': 'e1', iri: 'http://example.com/a',
          position: { x: 0, y: 0 },
          elementState: { 'ontodia:pinnedProperties': pinned },
        },
      ]);
      const upgraded = upgradeLegacyDiagram(diagram);
      const state = upgraded.layoutData.elements[0].elementState;
      expect(state[Reactodia.TemplateProperties.PinnedProperties]).to.deep.equal(pinned);
      expect(state['ontodia:pinnedProperties']).to.equal(undefined);
    });

    it('lets Reactodia restore size and expanded state from an upgraded diagram', () => {
      const diagram = makeLegacyDiagram([
        {
          '@type': 'Element', '@id': 'e1', iri: 'http://example.com/a',
          position: { x: 100, y: 200 },
          size: { width: 321, height: 123 },
          fixedSize: true,
          isExpanded: true,
        },
      ]);
      const upgraded = upgradeLegacyDiagram(diagram);
      const element = Reactodia.EntityElement.fromJSON(
        upgraded.layoutData.elements[0] as any,
        { getInitialData: () => undefined, mapTemplateState: (s) => s }
      );
      expect(element.isExpanded).to.equal(true);
      expect(element.elementState.get(Reactodia.TemplateProperties.ElementSize))
        .to.deep.equal({ width: 321, height: 123 });
    });
  });

  describe('addLegacyLayoutFields', () => {
    it('mirrors ElementSize and Expanded state into legacy layout fields', () => {
      const diagram = makeLegacyDiagram([
        {
          '@type': 'Element', '@id': 'e1', iri: 'http://example.com/a',
          position: { x: 1, y: 2 },
          elementState: {
            [Reactodia.TemplateProperties.ElementSize]: { width: 321, height: 123 },
            [Reactodia.TemplateProperties.Expanded]: true,
          },
        },
      ]);
      const withLegacy = addLegacyLayoutFields(diagram);
      const element = withLegacy.layoutData.elements[0] as LegacyElement;
      expect(element.size).to.deep.equal({ width: 321, height: 123 });
      expect(element.fixedSize).to.equal(true);
      expect(element.isExpanded).to.equal(true);
    });

    it('mirrors pinned properties into the legacy state key', () => {
      const pinned = { 'http://example.com/p': true };
      const diagram = makeLegacyDiagram([
        {
          '@type': 'Element', '@id': 'e1', iri: 'http://example.com/a',
          position: { x: 1, y: 2 },
          elementState: { [Reactodia.TemplateProperties.PinnedProperties]: pinned },
        },
      ]);
      const element = addLegacyLayoutFields(diagram).layoutData.elements[0];
      expect(element.elementState['ontodia:pinnedProperties']).to.deep.equal(pinned);
    });

    it('leaves elements without relevant state unchanged', () => {
      const diagram = makeLegacyDiagram([
        {
          '@type': 'Element', '@id': 'e1', iri: 'http://example.com/a',
          position: { x: 1, y: 2 },
          elementState: {},
        },
      ]);
      expect(addLegacyLayoutFields(diagram)).to.equal(diagram);
    });
  });
});

describe('DiagramService Reactodia cell persistence', () => {
  it('round-trips groups and annotations through RDF', async () => {
    const diagram = {
      '@context': OntodiaContextV1['@context'],
      '@id': 'http://example.com/diagram',
      '@type': 'Diagram',
      layoutData: {
        '@type': 'Layout',
        elements: [
          {
            '@type': 'ElementGroup', '@id': 'urn:test:group', position: { x: 1, y: 2 },
            items: [
              { '@type': 'ElementItem', iri: 'http://example.com/a' },
              { '@type': 'ElementItem', iri: 'http://example.com/b' },
            ],
          },
          {
            '@type': 'Annotation', '@id': 'urn:test:note', position: { x: 3, y: 4 },
            elementState: {
              'urn:reactodia:annotationContent': {
                object: 'document',
                nodes: [{ object: 'text', text: 'Saved note' }],
              },
            },
          },
        ],
        links: [
          {
            '@type': 'LinkGroup', '@id': 'urn:test:links', property: 'http://example.com/p',
            source: { '@id': 'urn:test:group' }, target: { '@id': 'urn:test:group' },
            items: [{
              '@type': 'LinkItem',
              sourceIri: 'http://example.com/a',
              targetIri: 'http://example.com/b',
            }],
          },
          {
            '@type': 'AnnotationLink', '@id': 'urn:test:note-link',
            source: { '@id': 'urn:test:note' }, target: { '@id': 'urn:test:group' },
          },
        ],
      },
      linkTypeOptions: [],
    };

    const dataset = await jsonld.toRDF(addLegacyLayoutFields(diagram as any));
    const expanded = await jsonld.fromRDF(dataset);
    const framed = await jsonld.frame(expanded, JSONLD_DIAGRAM_FRAME);
    const restoredDiagram = upgradeLegacyDiagram(framed['@graph'][0]);
    const restored = restoredDiagram.layoutData;

    expect(restored.elements.map(element => element['@type'])).to.have.members([
      'ElementGroup', 'Annotation',
    ]);
    expect((restored.elements.find(element => element['@type'] === 'ElementGroup') as any).items)
      .to.have.length(2);
    expect(restored.elements.find(element => element['@type'] === 'Annotation').elementState)
      .to.deep.equal(diagram.layoutData.elements[1].elementState);
    expect(restored.links.map(link => link['@type'])).to.have.members([
      'LinkGroup', 'AnnotationLink',
    ]);
    expect((restored.links.find(link => link['@type'] === 'LinkGroup') as any).items)
      .to.have.length(1);
  });
});
