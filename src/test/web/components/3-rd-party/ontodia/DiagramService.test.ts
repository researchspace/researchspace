/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { expect } from 'chai';
import * as Reactodia from '@reactodia/workspace';

import {
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
