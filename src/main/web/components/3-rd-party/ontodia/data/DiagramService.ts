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

export const OntodiaContextV1 = require('platform/ontodia/schema/context-v1.json');

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

const JSONLD_DIAGRAM_FRAME: object = {
  '@context': OntodiaContextV1['@context'],
  '@type': 'Diagram',
  layoutData: {
    '@type': 'Layout',
    elements: {
      '@type': 'Element',
      '@embed': '@always',
      'ontodia:resource': { '@embed': '@never' },
    },
    links: {
      '@type': 'Link',
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
        // check for old version
        if (
          json.length > 0 &&
          json[0] &&
          json[0]['@type'] &&
          json[0]['@type'] instanceof Array &&
          json[0]['@type'].indexOf(ontodiaNsv0.diagram.value) >= 0
        ) {
          // this assumes json-ld to be in expanded mode, and it should be right after toRDF
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

/**
 * Maps element layout fields written by the legacy Ontodia fork to their
 * Reactodia equivalents, so that diagrams saved before the Reactodia
 * migration keep user-resized elements and pinned properties:
 *  - `size` + `fixedSize` -> `elementState[TemplateProperties.ElementSize]`;
 *  - `elementState['ontodia:pinnedProperties']` -> `TemplateProperties.PinnedProperties`.
 *
 * Legacy top-level `isExpanded` is mapped by Reactodia itself and
 * `linkState['ontodia:customLabel']` is read directly by the rename link
 * provider, so both need no conversion here.
 */
export function upgradeLegacyDiagram(diagram: Reactodia.SerializedDiagram): Reactodia.SerializedDiagram {
  const { layoutData } = diagram;
  if (!layoutData || !Array.isArray(layoutData.elements)) {
    return diagram;
  }
  let anyChanged = false;
  const elements = layoutData.elements.map((element) => {
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
    if (state === elementState) {
      return element;
    }
    anyChanged = true;
    return { ...element, elementState: state };
  });
  return anyChanged ? { ...diagram, layoutData: { ...layoutData, elements } } : diagram;
}

/**
 * Mirrors Reactodia element template state into the layout fields understood
 * by the legacy Ontodia fork (`size`, `fixedSize`, `isExpanded`), so that
 * diagrams saved after the Reactodia migration still open correctly in older
 * ResearchSpace versions.
 */
export function addLegacyLayoutFields(diagram: Reactodia.SerializedDiagram): Reactodia.SerializedDiagram {
  const { layoutData } = diagram;
  if (!layoutData || !Array.isArray(layoutData.elements)) {
    return diagram;
  }
  let anyChanged = false;
  const elements = layoutData.elements.map((element) => {
    const state = element.elementState;
    if (!state) {
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
    if (Object.keys(legacyFields).length === 0) {
      return element;
    }
    anyChanged = true;
    return { ...element, ...legacyFields };
  });
  return anyChanged ? { ...diagram, layoutData: { ...layoutData, elements } } : diagram;
}

function makeDiagramResource(
  diagram: Reactodia.SerializedDiagram,
  name: string,
  metadata: ReadonlyArray<Rdf.Triple>,
  diagramIri = ''
) {
  const jsonldDiagram: any = { ...addLegacyLayoutFields(diagram) };

  // force inline context to disable fetching of the context by RDF4J
  if ((jsonldDiagram['@context'] = Reactodia.DiagramContextV1)) {
    jsonldDiagram['@context'] = OntodiaContextV1['@context'];
  }
  jsonldDiagram[crm.symbolic_content.value] = name;
  jsonldDiagram['@id'] = diagramIri;
  // warning! this heavily assumes that RDF will only place predicates to diagram resource
  // otherwise proper ttl-to-jsonld parsing is required, assumed to be done in 3.0
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
  // common properties
  'id',
  'type',
  // element properties
  'size',
  'fixedSize',
  'angle',
  'isExpanded',
  'position',
  'iri',
  'group',
  // link properties
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
    // get rid of unused properties
    const newCell: any = pick(cell, serializedCellProperties);

    // normalize type
    if (newCell.type === 'Ontodia.Element' || newCell.type === 'element') {
      newCell.type = 'Element';
    }

    // normalize type
    if (newCell.type === 'link') {
      newCell.type = 'Link';
    }

    if (!newCell.iri) {
      newCell.iri = newCell.id;
    }

    // rename to @id and @type to match JSON-LD
    newCell['@id'] = newCell.id;
    delete newCell.id;

    newCell['@type'] = newCell.type;
    delete newCell.type;

    // make two separate lists
    switch (newCell['@type']) {
      case 'Element':
        elements.push(newCell);
        break;
      case 'Link':
        // rename internal IDs
        newCell.source['@id'] = newCell.source.id;
        delete newCell.source.id;
        newCell.target['@id'] = newCell.target.id;
        delete newCell.target.id;
        // rename typeID to property
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
