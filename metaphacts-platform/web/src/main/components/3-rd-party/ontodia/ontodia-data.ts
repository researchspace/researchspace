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
import * as maybe from 'data.maybe';
import * as SparqlJs from 'sparqljs';
import {
  Dictionary,
  ElementModel,
  PropertySuggestionParams,
  PropertyScore,
  Triple,
  SerializedDiagram,
  DIAGRAM_CONTEXT_URL_V1,
} from 'ontodia';
import * as _ from 'lodash';

import { Rdf } from 'platform/api/rdf';
import * as JsonLd from 'platform/api/rdf/formats/JsonLd';
import { rdf, rdfs, VocabPlatform } from 'platform/api/rdf/vocabularies/vocabularies';
import { SparqlClient, SparqlUtil, QueryContext } from 'platform/api/sparql';
import { LdpService } from 'platform/api/services/ldp';
import { getThumbnails } from 'platform/api/services/resource-thumbnail';
import { convertToSerializedDiagram } from 'ontodia';

import {
  Node as RDFExtNode,
  RDFGraph as RDFExtGraph,
  createGraph,
  createNamedNode,
  createLiteral,
} from 'rdf-ext';

import {ontodiaNsv0} from './ontodia-ns';

export const OntodiaContextV1 = require('ontodia/schema/context-v1.json');

export interface Node {
  type: 'uri' | 'literal';
  value: string;
}

export interface RDFGraph {
  subject: Node;
  predicate: Node;
  object: Node;
}

/**
 * Returns graph to build diagram by sparql query
 * Will run on default context
 */
export function getRDFGraphBySparqlQuery(
  query: string, repositories: string[]
): Promise<RDFGraph[]> {
  return new Promise((resolve, reject) => {
    Kefir.combine(repositories.map(repository =>
      SparqlClient.construct(query, {context: {repository}})
    )).map(triples => _.flatten(triples)).onValue(
      g => {
        const graph: RDFGraph[] = [];

        g.forEach(function (triple) {
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

        const uniqueGraph = _.uniqWith(graph, _.isEqual);
        resolve(uniqueGraph);
      }
    );
  });
}

export function parseRDFGraphToRDFExtGraph(graph: RDFGraph[]): RDFExtGraph {
  const triples = graph.map(({subject, predicate, object}) => ({
    subject: parseNodeToRDFExtNode(subject),
    predicate: parseNodeToRDFExtNode(predicate),
    object: parseNodeToRDFExtNode(object),
  }));

  return createGraph(triples);
}

function parseNodeToRDFExtNode(node: Node): RDFExtNode {
  const {type, value} = node;

  return type === 'uri' ? createNamedNode(value) : createLiteral(value);
}

/**
 * Returns dictionary of images by sparql query
 * Will run on default context
 */
export function prepareImages(elementsInfo: Dictionary<ElementModel>, imageQuery: string) {
  let parametrized: SparqlJs.Query;
  try {
    const parsedQuery = SparqlUtil.parseQuery(imageQuery);
    if (parsedQuery.type !== 'query') {
      throw new Error('Image query must be a SELECT query');
    }

    const params = Object.keys(elementsInfo).map(
      (id): Dictionary<Rdf.Node> => ({'element': Rdf.iri(id)})
    );
    parametrized = SparqlClient.prepareParsedQuery(params)(parsedQuery);
  } catch (error) {
    return Promise.reject(error);
  }

  return SparqlClient.select(parametrized).map(response => {
    const elements = response.results.bindings;
    const images: { [elementIri: string]: string } = {};

    for (const elem of elements) {
      images[elem['element'].value] = elem['image'].value;
    }

    return images;
  }).toPromise();
}

export function fetchThumbnails(elementsInfo: Dictionary<ElementModel>, context: QueryContext) {
  const iris = Object.keys(elementsInfo).map(iri => Rdf.iri(iri));
  return getThumbnails(iris, {context}).map(res =>
    res.mapKeys(iri => iri.value).toObject()
  ).toPromise();
}

const diagramFrame = {
  '@context': OntodiaContextV1['@context'],
  '@type': 'Diagram',
  'layoutData': {
    '@type': 'Layout',
    'elements': {
      '@type': 'Element',
      '@embed': '@always',
      'ontodia:resource': {'@embed': '@never'},
    },
    'links': {
      '@type': 'Link',
      'source': {'@embed': '@never'},
      'target': {'@embed': '@never'},
    },
  },
};

/**
 * Returns label and layout of diagram by diagram id
 * will run on specified context
 */
export function getDiagramByIri(diagramIri: string, context: QueryContext): Promise<{
  label: string;
  diagram: SerializedDiagram;
}> {
  const ldpService = new LdpService(VocabPlatform.OntodiaDiagramContainer.value, context);
  const documentLoader = JsonLd.makeDocumentLoader({
    overrideContexts: {
      [DIAGRAM_CONTEXT_URL_V1]: OntodiaContextV1,
    }
  });
  return ldpService.getResourceRequest(diagramIri, 'text/turtle')
    .flatMap(resource =>
      JsonLd.fromRdf(resource, {
        documentLoader,
        format: 'text/turtle',
        useNativeTypes: true
      })
    )
    .flatMap((json): Kefir.Property<{ label: string; diagram: SerializedDiagram; }> => {

      // check for old version
      if (
        json.length > 0
        && json[0]
        && json[0]['@type']
        && json[0]['@type'] instanceof Array
        && json[0]['@type'].indexOf(ontodiaNsv0.diagram.value) >= 0
      ) {
        // this assumes json-ld to be in expanded mode, and it should be right after toRDF
        const oldDiagram = JSON.parse(json[0][ontodiaNsv0.diagramLayoutString.value][0]['@value']);
        return Kefir.constant({
          label: json[0][rdfs.label.value] as string,
          diagram: convertToSerializedDiagram({
            layoutData: oldDiagram.layoutData,
            linkTypeOptions: oldDiagram.linkSettings,
          }),
        });
      } else {
        return JsonLd.frame(json, diagramFrame, {documentLoader})
          .map(diagram => ({
            label: diagram['@graph'][0][rdfs.label.value] as string,
            diagram: {
              linkTypeOptions: [],
              ...diagram['@graph'][0],
              ...{'@context': diagram['@context']},
            } as SerializedDiagram
          }));
      }
    })
    .toPromise();
}

function makeDiagramResource(
  diagram: SerializedDiagram,
  name: string,
  metadata: ReadonlyArray<Rdf.Triple>,
  diagramIri = ''
) {
  const jsonldDiagram: any = {...diagram};

  // force inline context to disable fetching of the context by RDF4J
  if (jsonldDiagram['@context'] = DIAGRAM_CONTEXT_URL_V1) {
    jsonldDiagram['@context'] = OntodiaContextV1['@context'];
  }

  jsonldDiagram[rdfs.label.value] = name;
  jsonldDiagram['@id'] = diagramIri;
  // warning! this heavily assumes that RDF will only place predicates to diagram resource
  // otherwise proper ttl-to-jsonld parsing is required, assumed to be done in 3.0
  metadata.forEach(row => {
    jsonldDiagram[row.p.value] = row.o.isLiteral() ? row.o.value : {'@id': row.o.value};
  });

  return jsonldDiagram;
}

/**
 * Save diagram
 */
export function saveDiagram(
  name: string,
  diagram: SerializedDiagram,
  metadata: ReadonlyArray<Rdf.Triple>,
): Kefir.Property<Rdf.Iri> {

  const jsonldDiagram = makeDiagramResource(diagram, name, metadata);

  return new LdpService(VocabPlatform.OntodiaDiagramContainer.value).createResourceRequest(
    VocabPlatform.OntodiaDiagramContainer,
    {data: JSON.stringify(jsonldDiagram), format: 'application/ld+json'},
     maybe.Just(name)
  ).map(iri => new Rdf.Iri(iri));
}

/**
 * Update diagram
 */
export function updateDiagram(
  diagramIri: string,
  diagram: SerializedDiagram,
  label: string,
  metadata: ReadonlyArray<Rdf.Triple>,
): Kefir.Property<void> {
  const jsonLdDiagram = makeDiagramResource(diagram, label, metadata, diagramIri);
  return new LdpService(VocabPlatform.OntodiaDiagramContainer.value)
    .sendUpdateResourceRequest(
      Rdf.iri(diagramIri),
      {data: JSON.stringify(jsonLdDiagram), format: 'application/ld+json'}
      )
    .map(() => {/* void */});
}

export function suggestProperties(
  params: PropertySuggestionParams,
  query: string
): Promise<Dictionary<PropertyScore>> {
  const {token, properties} = params;
  const options = {
    context: {
      repository: 'wikidata-property-suggester',
    },
  };

  const term = Rdf.literal(token.toLowerCase());
  const queryParams = [];

  properties.forEach(prop => {
    queryParams.push({property: Rdf.iri(prop)});
  });

  return new Promise((resolve, reject) => {
    SparqlClient.prepareQuery(query, queryParams)
      .map(query => SparqlClient.setBindings(query, {term}))
      .flatMap(query => SparqlClient.select(query, options))
      .onValue(
        response => {
          const result = response.results.bindings;
          const dictionary: Dictionary<PropertyScore> = {};

          result.forEach(res => {
            const propertyIri = res.id.value;
            const score = parseFloat(res.score.value);
            dictionary[propertyIri] = {propertyIri, score};
          });

        properties.forEach(propertyIri => {
            if (dictionary[propertyIri]) { return; }
            dictionary[propertyIri] = {propertyIri, score: 0};
          });

          resolve(dictionary);
        }
      );
  });
}
