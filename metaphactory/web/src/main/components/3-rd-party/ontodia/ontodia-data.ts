/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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
import {
  LayoutData,
  LinkTypeOptions,
  Dictionary,
  ElementModel,
} from 'ontodia';

import { Rdf } from 'platform/api/rdf';
import { rdf, rdfs, ldp, VocabPlatform } from 'platform/api/rdf/vocabularies/vocabularies';
import { SparqlClient, QueryContext } from 'platform/api/sparql';
import { LdpService } from 'platform/api/services/ldp';

import ontodiaNs from './ontodia-ns';

export interface RDFGraph {
  subject: {
    type: string;
    value: string;
  };
  predicate: {
    type: string;
    value: string;
  };
  object: {
    type: string;
    value: string;
  };
}

/**
 * Returns label and layout of diagram by diagram id
 * will run on specified context
 */
export function getLayoutByDiagram(diagram: string, context: QueryContext): Promise<{
  label: string;
  layoutData: LayoutData;
  linkSettings: LinkTypeOptions[]
}> {
  let ldpService = new LdpService(VocabPlatform.OntodiaDiagramContainer.value, context);
  return new Promise((resolve, reject) => {
    ldpService.get(Rdf.iri(diagram)).onValue(
      g => {
        let data = <Rdf.Iri>g.triples.find(
          t => t.p.equals(ontodiaNs.diagramLayoutString)
        ).o;

        let label = <Rdf.Iri>g.triples.find(
          t => t.p.equals(rdfs.label)
        ).o;

        let layout = JSON.parse(data.value);

        resolve({
          label: label.value,
          layoutData: layout.layoutData,
          linkSettings: layout.linkSettings,
        });
      }
    );
  });
}

/**
 * Returns graph to build diagram by sparql query
 * Will run on default context
 */
export function getRDFGraphBySparqlQuery(query: string): Promise<RDFGraph[]> {
  return new Promise((resolve, reject) => {
    SparqlClient.construct(query).onValue(
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
        resolve(graph);
      }
    );
  });
}

/**
 * Returns dictionary of images by sparql query
 * Will run on default context
 */
export function prepareImages(elementsInfo: Dictionary<ElementModel>, imageQuery: string) {
  let images = {},
    params = [],
    ids = Object.keys(elementsInfo);

  ids.forEach(function(id) {
    params.push({
      'element': Rdf.iri(id),
    });
  });

  return new Promise((resolve, reject) => {
    SparqlClient.prepareQuery(imageQuery, params).onValue(
      query => {
        SparqlClient.select(query).onValue(
          response => {
            const elements = response.results.bindings;

            elements.forEach(function(elem) {
              images[elem['element'].value] = elem['image'].value;
            });

            resolve(images);
          }
        );
      }
    );
  });
}

export interface DiagramLayout {
  layoutData: LayoutData;
  linkSettings: ReadonlyArray<LinkTypeOptions>;
}

function createDiagramTriples(name: string, layout: DiagramLayout) {
  const subject = Rdf.iri('');
  const layoutJson = JSON.stringify(layout);
  return [
    Rdf.triple(subject, rdf.type, ontodiaNs.diagram),
    Rdf.triple(subject, rdfs.label, Rdf.literal(name)),
    Rdf.triple(subject, ontodiaNs.diagramLayoutString, Rdf.literal(layoutJson)),
  ];
}

/**
 * Creates graph of persisted resource.
 */
export function createResource(
  name: string,
  layout: any,
  metadata: ReadonlyArray<Rdf.Triple>,
  context: QueryContext
): Kefir.Property<Rdf.Iri> {
  const graph = Rdf.graph(metadata.concat(createDiagramTriples(name, layout)));
  return new LdpService(VocabPlatform.OntodiaDiagramContainer.value, context)
    .addResource(graph, maybe.Just(name));
}

/**
 * Creates container if it doesn't exist yet.
 */
export function createContainer(context: QueryContext): Kefir.Property<Rdf.Iri> {
  return new LdpService(VocabPlatform.RootContainer.value, context).addResource(
    Rdf.graph([
      Rdf.triple(Rdf.iri(''), rdf.type, ldp.Container),
      Rdf.triple(Rdf.iri(''), rdfs.label, Rdf.literal(
        'LDP Container for resources of type ' +
          VocabPlatform.OntodiaDiagramContainer
      )),
    ]), maybe.Just(VocabPlatform.OntodiaDiagramContainer.value)
  );
}

/**
 * Save diagram
 */
export function saveDiagram(
  name: string,
  layout: DiagramLayout,
  metadata: ReadonlyArray<Rdf.Triple>,
  context: QueryContext
): Kefir.Property<Rdf.Iri> {
  return new LdpService(VocabPlatform.RootContainer.value).options(
    VocabPlatform.OntodiaDiagramContainer
  ).flatMap(
    // if container already exists, simply add new resource
    v => createResource(name, layout, metadata, context)
  ).flatMapErrors<Rdf.Iri>(
    // otherwise create new container under root resource
    e => createContainer(context).flatMap(containerIri =>
      createResource(name, layout, metadata, context))
  ).toProperty();
}

/**
 * Update diagram
 */
export function updateDiagram(
  diagram: string,
  layout: DiagramLayout,
  label: string,
  metadata: ReadonlyArray<Rdf.Triple>,
  context: QueryContext
): Kefir.Property<void> {
  let data = Rdf.graph(metadata.concat(createDiagramTriples(label, layout)));
  return new LdpService(VocabPlatform.OntodiaDiagramContainer.value, context)
    .update(Rdf.iri(diagram), data)
    .map(() => {/* void */});
}
