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

import * as Kefir from 'kefir';
import { pick } from 'lodash';
import * as maybe from 'data.maybe';
import * as SparqlJs from 'sparqljs';
import * as Reactodia from '@reactodia/workspace';

import { Rdf } from 'platform/api/rdf';
import * as JsonLd from 'platform/api/rdf/formats/JsonLd';
import { rdf, rdfs, crm, VocabPlatform } from 'platform/api/rdf/vocabularies/vocabularies';
import { SparqlClient, SparqlUtil, QueryContext } from 'platform/api/sparql';
import { LdpService } from 'platform/api/services/ldp';
import { getThumbnails } from 'platform/api/services/resource-thumbnail';

import { ontodiaNsv0 } from './OntodiaVocabulary';

export const OntodiaContextV1 = require('./context-v1.json');

/**
 * Returns dictionary of images by sparql query
 * Will run on default context
 */
export function prepareImages(
  elementsInfo: Iterable<Reactodia.ElementModel>,
  imageQuery: string
): Promise<Map<Reactodia.ElementIri, string>> {
  let parametrized: SparqlJs.Query;
  try {
    const parsedQuery = SparqlUtil.parseQuery(imageQuery);
    if (parsedQuery.type !== 'query') {
      throw new Error('Image query must be a SELECT query');
    }

    const params = Array.from(elementsInfo, (data): Record<string, Rdf.Node> => ({ element: Rdf.iri(data.id) }));
    parametrized = SparqlClient.prepareParsedQuery(params)(parsedQuery);
  } catch (error) {
    return Promise.reject(error);
  }

  return SparqlClient.select(parametrized)
    .map((response) => {
      const elements = response.results.bindings;
      const images = new Map<Reactodia.ElementIri, string>();

      for (const elem of elements) {
        images.set(elem['element'].value, elem['image'].value);
      }

      return images;
    })
    .toPromise();
}

export function fetchThumbnails(
  elementsInfo: Iterable<Reactodia.ElementModel>,
  context: QueryContext
): Promise<Map<Reactodia.ElementIri, string>> {
  const iris = Array.from(elementsInfo, (data) => Rdf.iri(data.id));
  return getThumbnails(iris, { context })
    .map((res) => {
      const thumbnails = new Map<Reactodia.ElementIri, string>();
      res.forEach((thumbnailUrl, iri) => thumbnails.set(iri.value, thumbnailUrl));
      return thumbnails;
    })
    .toPromise();
}

export const JSONLD_DIAGRAM_FRAME: object = {
  '@context': OntodiaContextV1['@context'],
  '@type': 'Diagram',
  layoutData: {
    '@type': 'Layout',
    elements: {
      '@embed': '@always',
    },
    links: {
      '@embed': '@always',
      source: { '@embed': '@never' },
      target: { '@embed': '@never' },
    },
  },
};

/**
 * Returns label and layout of diagram by diagram id
 * will run on specified context
 */
export function getDiagramByIri(
  diagramIri: string,
  context: QueryContext
): Promise<{
  label: string;
  diagram: Reactodia.SerializedDiagram;
}> {
  const ldpService = new LdpService(VocabPlatform.OntodiaDiagramContainer.value, context);
  const documentLoader = JsonLd.makeDocumentLoader({
    overrideContexts: {
      [Reactodia.DiagramContextV1]: OntodiaContextV1,
    },
  });
  return ldpService
    .getResourceRequest(diagramIri, 'text/turtle')
    .flatMap((resource) =>
      JsonLd.fromRdf(resource, {
        documentLoader,
        format: 'text/turtle',
        useNativeTypes: true,
      })
    )
    .flatMap(
      (json): Kefir.Property<{ label: string; diagram: Reactodia.SerializedDiagram }> => {
        if (
          json.length > 0 &&
          json[0] &&
          json[0]['@type'] &&
          json[0]['@type'] instanceof Array &&
          json[0]['@type'].indexOf(ontodiaNsv0.diagram.value) >= 0
        ) {
          const oldDiagram = JSON.parse(json[0][ontodiaNsv0.diagramLayoutString.value][0]['@value']);
          return Kefir.constant({
            label: json[0][crm.symbolic_content.value] as string,
            diagram: convertToSerializedDiagram({
              layoutData: oldDiagram.layoutData,
              linkTypeOptions: oldDiagram.linkSettings,
            }),
          });
        } else {
          return JsonLd.frame(json, JSONLD_DIAGRAM_FRAME, { documentLoader }).map((diagram) => ({
            label: diagram['@graph'][0][crm.symbolic_content.value] as string,
            diagram: {
              linkTypeOptions: [],
              ...diagram['@graph'][0],
              ...{ '@context': diagram['@context'] },
            } as Reactodia.SerializedDiagram,
          }));
        }
      }
    )
    .toPromise();
}

/**
 * Element layout state as serialized by the legacy Ontodia fork
 * (see `serializedDiagram.ts` in `src/main/web/ontodia`).
 */
interface LegacySerializedElement extends Reactodia.SerializedElement {
  size?: { width: number; height: number };
  fixedSize?: boolean;
  isExpanded?: boolean;
}

const LEGACY_PINNED_PROPERTIES = 'ontodia:pinnedProperties';
const ELEMENT_STATE_JSON = 'elementStateJson';
const LINK_STATE_JSON = 'linkStateJson';

function restoreStateJson(cell: any, stateKey: string, jsonKey: string): any {
  const json = cell?.[jsonKey];
  if (typeof json !== 'string') {
    return cell;
  }
  try {
    const { [jsonKey]: omitted, ...rest } = cell;
    return { ...rest, [stateKey]: JSON.parse(json) };
  } catch {
    return cell;
  }
}

function addStateJson(cell: any, stateKey: string, jsonKey: string): any {
  const state = cell?.[stateKey];
  if (state === undefined || (
    state !== null && typeof state === 'object' && Object.keys(state).length === 0
  )) {
    return cell;
  }
  const json = JSON.stringify(state);
  return cell[jsonKey] === json ? cell : { ...cell, [jsonKey]: json };
}

/** Maps legacy Ontodia layout state to Reactodia. */
export function upgradeLegacyDiagram(diagram: Reactodia.SerializedDiagram): Reactodia.SerializedDiagram {
  const { layoutData } = diagram;
  if (!layoutData || !Array.isArray(layoutData.elements)) {
    return diagram;
  }
  let anyChanged = false;
  const elements = layoutData.elements.map((sourceElement) => {
    let element: any = restoreStateJson(sourceElement, 'elementState', ELEMENT_STATE_JSON);
    if (Array.isArray(element.items)) {
      const items = element.items.map(item => restoreStateJson(item, 'elementState', ELEMENT_STATE_JSON));
      if (items.some((item, index) => item !== element.items[index])) {
        element = { ...element, items };
      }
    }
    const { size, fixedSize, elementState } = element as LegacySerializedElement;
    let state = elementState;
    if (
      fixedSize && size &&
      typeof size.width === 'number' && typeof size.height === 'number' &&
      !(state && state[Reactodia.TemplateProperties.ElementSize] !== undefined)
    ) {
      state = {
        ...state,
        [Reactodia.TemplateProperties.ElementSize]: { width: size.width, height: size.height },
      };
    }
    if (
      state && state[LEGACY_PINNED_PROPERTIES] !== undefined &&
      state[Reactodia.TemplateProperties.PinnedProperties] === undefined
    ) {
      const { [LEGACY_PINNED_PROPERTIES]: pinned, ...otherState } = state;
      state = {
        ...otherState,
        [Reactodia.TemplateProperties.PinnedProperties]: pinned,
      };
    }
    if (state === elementState && element === sourceElement) {
      return element;
    }
    anyChanged = true;
    return { ...element, elementState: state };
  });
  const links = layoutData.links.map(sourceLink => {
    let link: any = restoreStateJson(sourceLink, 'linkState', LINK_STATE_JSON);
    if (Array.isArray(link.items)) {
      const items = link.items.map(item => restoreStateJson(item, 'linkState', LINK_STATE_JSON));
      if (items.some((item, index) => item !== link.items[index])) {
        link = { ...link, items };
      }
    }
    if (link !== sourceLink) {
      anyChanged = true;
    }
    return link;
  });
  return anyChanged ? { ...diagram, layoutData: { ...layoutData, elements, links } } : diagram;
}

/** Mirrors Reactodia state into legacy layout fields. */
export function addLegacyLayoutFields(diagram: Reactodia.SerializedDiagram): Reactodia.SerializedDiagram {
  const { layoutData } = diagram;
  if (!layoutData || !Array.isArray(layoutData.elements)) {
    return diagram;
  }
  let anyChanged = false;
  const elements = layoutData.elements.map((sourceElement) => {
    let element: any = addStateJson(sourceElement, 'elementState', ELEMENT_STATE_JSON);
    if (Array.isArray(element.items)) {
      const items = element.items.map(item => addStateJson(item, 'elementState', ELEMENT_STATE_JSON));
      if (items.some((item, index) => item !== element.items[index])) {
        element = { ...element, items };
      }
    }
    const state = element.elementState;
    if (!state) {
      if (element !== sourceElement) {
        anyChanged = true;
      }
      return element;
    }
    const legacyFields: Partial<LegacySerializedElement> = {};
    const size = state[Reactodia.TemplateProperties.ElementSize] as
      { width?: unknown; height?: unknown } | undefined;
    if (size && typeof size.width === 'number' && typeof size.height === 'number') {
      legacyFields.size = { width: size.width, height: size.height };
      legacyFields.fixedSize = true;
    }
    if (state[Reactodia.TemplateProperties.Expanded] === true) {
      legacyFields.isExpanded = true;
    }
    const pinned = state[Reactodia.TemplateProperties.PinnedProperties];
    if (pinned !== undefined) {
      legacyFields.elementState = {
        ...state,
        [LEGACY_PINNED_PROPERTIES]: pinned,
      };
    }
    if (Object.keys(legacyFields).length === 0) {
      if (element !== sourceElement) {
        anyChanged = true;
      }
      return element;
    }
    anyChanged = true;
    return { ...element, ...legacyFields };
  });
  const links = layoutData.links.map(sourceLink => {
    let link: any = addStateJson(sourceLink, 'linkState', LINK_STATE_JSON);
    if (Array.isArray(link.items)) {
      const items = link.items.map(item => addStateJson(item, 'linkState', LINK_STATE_JSON));
      if (items.some((item, index) => item !== link.items[index])) {
        link = { ...link, items };
      }
    }
    if (link !== sourceLink) {
      anyChanged = true;
    }
    return link;
  });
  return anyChanged ? { ...diagram, layoutData: { ...layoutData, elements, links } } : diagram;
}

function makeDiagramResource(
  diagram: Reactodia.SerializedDiagram,
  name: string,
  metadata: ReadonlyArray<Rdf.Triple>,
  diagramIri = ''
) {
  const jsonldDiagram: any = { ...addLegacyLayoutFields(diagram) };

  // RDF4J must not fetch the remote context.
  if (jsonldDiagram['@context'] === Reactodia.DiagramContextV1) {
    jsonldDiagram['@context'] = OntodiaContextV1['@context'];
  }
  jsonldDiagram[crm.symbolic_content.value] = name;
  jsonldDiagram['@id'] = diagramIri;
  // Metadata predicates belong to the diagram resource.
  metadata.forEach((row) => {
    jsonldDiagram[row.p.value] = row.o.isLiteral() ? row.o.value : { '@id': row.o.value };
  });

  return jsonldDiagram;
}

/**
 * Save diagram
 */
export function saveDiagram(
  name: string,
  diagram: Reactodia.SerializedDiagram,
  metadata: ReadonlyArray<Rdf.Triple>
): Kefir.Property<Rdf.Iri> {
  const jsonldDiagram = makeDiagramResource(diagram, name, metadata);
  return new LdpService(VocabPlatform.OntodiaDiagramContainer.value)
    .createResourceRequest(
      VocabPlatform.OntodiaDiagramContainer,
      { data: JSON.stringify(jsonldDiagram), format: 'application/ld+json' },
      maybe.Just(name)
    )
    .map((iri) => new Rdf.Iri(iri));
}

/**
 * Update diagram
 */
export function updateDiagram(
  diagramIri: string,
  diagram: Reactodia.SerializedDiagram,
  label: string,
  metadata: ReadonlyArray<Rdf.Triple>
): Kefir.Property<void> {
  const jsonLdDiagram = makeDiagramResource(diagram, label, metadata, diagramIri);
  return new LdpService(VocabPlatform.OntodiaDiagramContainer.value)
    .sendUpdateResourceRequest(Rdf.iri(diagramIri), {
      data: JSON.stringify(jsonLdDiagram),
      format: 'application/ld+json',
    })
    .map(() => {
      /* void */
    });
}

export function suggestProperties(
  params: Reactodia.PropertySuggestionParams,
  query: string
): Promise<Record<string, Reactodia.PropertyScore>> {
  const { token, properties } = params;
  const options = {
    context: {
      repository: 'wikidata-property-suggester',
    },
  };

  const term = Rdf.literal(token.toLowerCase());
  const queryParams = [];

  properties.forEach((prop) => {
    queryParams.push({ property: Rdf.iri(prop) });
  });

  return SparqlClient.prepareQuery(query, queryParams)
    .map((prepared) => SparqlClient.setBindings(prepared, { term }))
    .flatMap((bound) => SparqlClient.select(bound, options))
    .map((response) => {
      const result = response.results.bindings;
      const dictionary: Record<string, Reactodia.PropertyScore> = {};

      result.forEach((res) => {
        const propertyIri = res.id.value;
        const score = parseFloat(res.score.value);
        dictionary[propertyIri] = { propertyIri, score };
      });

      properties.forEach((propertyIri) => {
        if (dictionary[propertyIri]) {
          return;
        }
        dictionary[propertyIri] = { propertyIri, score: 0 };
      });

      return dictionary;
    })
    .toPromise();
}

const serializedCellProperties = [
  'id',
  'type',
  'size',
  'fixedSize',
  'angle',
  'isExpanded',
  'position',
  'iri',
  'group',
  'typeId',
  'source',
  'target',
  'vertices',
];

function convertToSerializedDiagram(params: {
  layoutData: any;
  linkTypeOptions: any;
}): Reactodia.SerializedDiagram {
  const elements: Reactodia.SerializedEntityElement[] = [];
  const links: Reactodia.SerializedRelationLink[] = [];

  for (const cell of params.layoutData.cells) {
    const newCell: any = pick(cell, serializedCellProperties);

    if (newCell.type === 'Ontodia.Element' || newCell.type === 'element') {
      newCell.type = 'Element';
    }

    if (newCell.type === 'link') {
      newCell.type = 'Link';
    }

    if (!newCell.iri) {
      newCell.iri = newCell.id;
    }

    newCell['@id'] = newCell.id;
    delete newCell.id;

    newCell['@type'] = newCell.type;
    delete newCell.type;

    switch (newCell['@type']) {
      case 'Element':
        elements.push(newCell);
        break;
      case 'Link':
        newCell.source['@id'] = newCell.source.id;
        delete newCell.source.id;
        newCell.target['@id'] = newCell.target.id;
        delete newCell.target.id;
        newCell.property = newCell.typeId;
        delete newCell.typeId;
        links.push(newCell);
        break;
    }
  }

  return {
    '@context': Reactodia.DiagramContextV1,
    '@type': 'Diagram',
    layoutData: { '@type': 'Layout', elements, links },
    linkTypeOptions: params.linkTypeOptions,
  };
}
