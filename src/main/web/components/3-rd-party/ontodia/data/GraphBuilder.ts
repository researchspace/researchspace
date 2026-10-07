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

import * as Reactodia from '@reactodia/workspace';
import { keyBy } from 'lodash';

import { Rdf, turtle } from 'platform/api/rdf';

const GREED_STEP = 150;

export class GraphBuilder {
  constructor(
    public dataProvider: Reactodia.DataProvider,
    public linkTypeOptions?: ReadonlyArray<Reactodia.SerializedLinkOptions>
  ) {}

  createGraph(graph: {
    elementIds: Reactodia.ElementIri[];
    links: Reactodia.LinkModel[];
  }): Promise<{
    preloadedElements: Map<Reactodia.ElementIri, Reactodia.ElementModel>;
    diagram: Reactodia.SerializedDiagram;
  }> {
    return this.dataProvider.elements({ elementIds: graph.elementIds }).then((elementsInfo) => ({
      preloadedElements: elementsInfo,
      diagram: makeLayout(graph.elementIds, graph.links, this.linkTypeOptions),
    }));
  }

  getGraphFromRDFGraph(
    graph: Rdf.Triple[]
  ): Promise<{
    preloadedElements: Map<Reactodia.ElementIri, Reactodia.ElementModel>;
    diagram: Reactodia.SerializedDiagram;
  }> {
    const { elementIds, links } = makeGraphItems(graph);
    return this.createGraph({ elementIds, links });
  }

  getGraphFromTurtleGraph(
    graph: string
  ): Promise<{
    preloadedElements: Map<Reactodia.ElementIri, Reactodia.ElementModel>;
    diagram: Reactodia.SerializedDiagram;
  }> {
    return turtle.deserialize.turtleToGraph(graph).toPromise()
      .then((graph) => this.getGraphFromRDFGraph(graph.triples.toArray()));
  }
}

export function makeGraphItems(
  response: ReadonlyArray<Rdf.Triple>
): {
  elementIds: Reactodia.ElementIri[];
  links: Reactodia.LinkModel[];
} {
  const elements: Record<string, boolean> = {};
  const links: Reactodia.LinkModel[] = [];

  for (const { subject, predicate, object } of response) {
    if (subject.termType === 'NamedNode' && !elements[subject.value]) {
      elements[subject.value] = true;
    }

    if (object.termType === 'NamedNode' && !elements[object.value]) {
      elements[object.value] = true;
    }

    if (subject.termType === 'NamedNode' && object.termType === 'NamedNode') {
      links.push({
        linkTypeId: predicate.value,
        sourceId: subject.value,
        targetId: object.value,
        properties: {},
      });
    }
  }
  return { elementIds: Object.keys(elements) as Reactodia.ElementIri[], links };
}

export function makeLayout(
  elementsIds: ReadonlyArray<Reactodia.ElementIri>,
  linksInfo: ReadonlyArray<Reactodia.LinkModel>,
  linkTypeOptions?: ReadonlyArray<Reactodia.SerializedLinkOptions>,
): Reactodia.SerializedDiagram {
  const rows = Math.ceil(Math.sqrt(elementsIds.length));
  const grid = Reactodia.uniformGrid({ rows, cellSize: { x: GREED_STEP, y: GREED_STEP } });

  const elements = elementsIds.map((id, index): Reactodia.SerializedEntityElement => {
    const { x, y } = grid(index);
    return { '@type': 'Element', '@id': Reactodia.Element.generateId(), iri: id, position: { x, y } };
  });

  const layoutElementsMap: { [iri: string]: Reactodia.SerializedEntityElement } = keyBy(elements, 'iri');
  const links: Reactodia.SerializedRelationLink[] = [];

  linksInfo.forEach((link, index) => {
    const source = layoutElementsMap[link.sourceId];
    const target = layoutElementsMap[link.targetId];

    if (!source || !target) {
      return;
    }

    links.push({
      '@type': 'Link',
      '@id': Reactodia.Link.generateId(),
      property: link.linkTypeId,
      source: { '@id': source['@id'] },
      target: { '@id': target['@id'] },
    });
  });
  return {
    '@context': Reactodia.DiagramContextV1,
    '@type': 'Diagram',
    layoutData: { '@type': 'Layout', elements, links },
    linkTypeOptions: linkTypeOptions,
  };
}
