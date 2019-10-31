/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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

import { Rdf, vocabularies, turtle } from 'platform/api/rdf';
import { LdpService } from 'platform/api/services/ldp';

import { rso } from '../data/vocabularies/vocabularies';


export interface RdfaLink {
  predicate: Rdf.Iri
  object: Rdf.Iri
}
export interface Annotation {
  target: Rdf.Iri;
  body?: Rdf.Iri;
  label: string;
  html: string;
  rdfa: RdfaLink[];
  metadata?: string;
}

/**
 * ldp client for AnnotationContainer container
 */
export class LdpAnnotationServiceClass extends LdpService {

  /**
   * Add new annotation to the AnnotationContainer.
   */
  public addAnnotation(annotation: Annotation): Kefir.Property<Rdf.Iri> {
    return this.serializeAnnotation(annotation).flatMap(this.addResource).toProperty();
  }

  /*
   * Update annotation
   */
  public updateAnnotation(annotationIri: Rdf.Iri, annotation: Annotation): Kefir.Property<Rdf.Iri> {
    return this.serializeAnnotation(annotation).flatMap(
      graph => this.update(annotationIri, graph)
    ).toProperty();
  }

  private serializeAnnotation(annotation: Annotation): Kefir.Property<Rdf.Graph> {
    const metadata = annotation.metadata
      ? turtle.deserialize.turtleToGraph(annotation.metadata)
      : Kefir.constant(Rdf.graph([]));

    return metadata.map(
      mGraph => Rdf.union(mGraph, this.annotationToGraph(annotation))
    );
  }

  private annotationToGraph(annotation: Annotation): Rdf.Graph {
    const annotationIri = Rdf.iri('');
    const bodyResource = Rdf.iri('http://www.metaphacts.com/');
    let triples = [Rdf.triple(annotationIri, vocabularies.rdf.type, vocabularies.oa.Annotation)];
    if (annotation.label) {
      triples.push(Rdf.triple(annotationIri, vocabularies.rdfs.label, Rdf.literal(annotation.label)));
    }
    if (annotation.target) {
      triples.push(Rdf.triple(annotationIri, vocabularies.oa.hasTarget, annotation.target));
    }
    if (annotation.html) {
      triples.push(Rdf.triple(annotationIri, vocabularies.oa.hasBody, bodyResource));
      triples.push(Rdf.triple(bodyResource, vocabularies.rdf.type, vocabularies.oa.TextualBody));
      triples.push(Rdf.triple(bodyResource, vocabularies.oa.text, Rdf.literal(annotation.html)));
      triples.push(Rdf.triple(bodyResource, vocabularies.dc.format, Rdf.literal('text/html')));
    }
    annotation.rdfa.forEach((rdfaItem: RdfaLink) => {
      triples.push(Rdf.triple(annotationIri, rdfaItem.predicate, rdfaItem.object));
    });
    return Rdf.graph(triples);
  }

  public getAnnotation(annotationIri: Rdf.Iri): Kefir.Property<Annotation> {
    return this.get(annotationIri).map(
      graph => this.parseGraphToAnnotation(annotationIri, graph)
    );
  }

  private parseGraphToAnnotation(annotationIri: Rdf.Iri, graph: Rdf.Graph): Annotation {
    const targetTriple = graph.triples.find(t => t.s.equals(annotationIri) && t.p.equals(vocabularies.oa.hasTarget));
    const bodyTriple = graph.triples.find(t => t.s.equals(annotationIri) && t.p.equals(vocabularies.oa.hasBody));
    const labelTriple = graph.triples.find(t => t.s.equals(annotationIri) && t.p.equals(vocabularies.rdfs.label));
    const htmlTriple = graph.triples.find(t => t.p.equals(vocabularies.oa.text));
    return {
      target: targetTriple ? <Rdf.Iri>targetTriple.o : undefined,
      body: bodyTriple ? <Rdf.Iri>bodyTriple.o : undefined,
      label: labelTriple ? labelTriple.o.value : undefined,
      html: htmlTriple ? htmlTriple.o.value : undefined,
      rdfa: graph.triples.filterNot(t =>
        t.s.equals(annotationIri) &&
        !t.p.equals(vocabularies.rdfs.label) && !t.p.equals(vocabularies.rdf.type) &&
        !t.p.equals(vocabularies.oa.hasTarget) && !t.p.equals(vocabularies.oa.hasBody)
      ).map(t => {
        return {
          predicate: t.p,
          object: t.o,
        };
      }).toJS(),
    };
  }

}

export var LdpAnnotationService = new LdpAnnotationServiceClass(
  rso.AnnotationsContainer.value
);
export default LdpAnnotationService;
