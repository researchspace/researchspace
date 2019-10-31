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
import * as _ from 'lodash';

import { Rdf, vocabularies } from 'platform/api/rdf';
import * as JsonLd from 'platform/api/rdf/formats/JsonLd';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { ConfigHolder } from 'platform/api/services/config-holder';
import { getLabel, getLabels } from 'platform/api/services/resource-label';

import { OARegionAnnotation } from './LDPImageRegionService';

const MANIFEST_FRAME  = require('./ld-resources/manifest-frame.json');
const IIIF_PRESENTATION_CONTEXT = require('./ld-resources/iiif-context.json');

const { xsd, rdf } = vocabularies;

export interface Manifest {
  __manifestBrand: void;
}

export type CreateManifestParams = {
  baseIri: Rdf.Iri;
  imageIri: Rdf.Iri;
  imageServiceUri: string;
  canvasSize?: { width: number; height: number; };
  embeddedAnnotations?: OARegionAnnotation[];
};

export class ManifestBuildingError extends Error {
  constructor(message: string, public inner?: Error) {
    super(message);
  }
}

export function createManifest(
  params: Array<CreateManifestParams>
): Kefir.Property<Manifest> {
  return findManifestInRepository(params)
    .mapErrors(err =>  new ManifestBuildingError('Failed fetching manifest data', err))
    .flatMap(processJsonResponse).toProperty();
}

function findManifestInRepository(params: Array<CreateManifestParams>) {
  // 1. prepare sparql construct
  return constructSparql(params).flatMap(sparql => {
    // 2. execute sparql, get json-ld
    return SparqlClient.sendSparqlQuery(sparql, 'application/ld+json')
      .map(res => JSON.parse(res));
  }).flatMap(
    manifest => {
      if (_.isEmpty(manifest)) {
        return Kefir.constantError<any>(
          `No manifests for the image/region ${params.map(({imageIri}) => imageIri).join(', ')}`
        );
      }
      return Kefir.constant(manifest);
    }
  );
}

function processJsonResponse(response: {}): Kefir.Stream<Manifest> {
  const documentLoader = JsonLd.makeDocumentLoader({
    overrideContexts: {
      'http://iiif.io/api/presentation/2/context.json': IIIF_PRESENTATION_CONTEXT,
    }
  });
  return JsonLd.frame(response, MANIFEST_FRAME, {documentLoader})
    .mapErrors(frameError => new ManifestBuildingError('Failed to frame JSON-LD', frameError))
    .flatMap(framed => {
      return JsonLd.compact(framed, MANIFEST_FRAME, {documentLoader})
        .mapErrors(compactError =>
          new ManifestBuildingError('Failed to compact JSON-LD', compactError))
    });
}

function constructSparql(params: Array<CreateManifestParams>): Kefir.Property<string> {
  const baseIri = params[0].baseIri;
  const sparql = `PREFIX as: <http://www.w3.org/ns/activitystreams#>
PREFIX cnt: <http://www.w3.org/2011/content#>
PREFIX dc: <http://purl.org/dc/elements/1.1/>
PREFIX dcmit: <http://purl.org/dc/dcmitype/>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX dctypes: <http://purl.org/dc/dcmitype/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX iiif: <http://iiif.io/api/image/2#>
PREFIX exif: <http://www.w3.org/2003/12/exif/ns#>
PREFIX oa: <http://www.w3.org/ns/oa#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX sc: <http://iiif.io/api/presentation/2#>
PREFIX siocserv: <http://rdfs.org/sioc/services#>
PREFIX svcs: <http://rdfs.org/sioc/services#>
PREFIX xml: <http://www.w3.org/XML/1998/namespace>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX rso: <http://www.researchspace.org/ontology/>

CONSTRUCT {
?manifestURI a sc:Manifest ;
rdfs:label ?displayLabel;
sc:attributionLabel "Provided by the The British Museum" ;
sc:hasSequences ?sequenceURI;
dc:description ?displayLabel;
dcterms:within ?object.

?service dcterms:conformsTo <http://iiif.io/api/image/2/level1.json> .

?imageResourceURI a dctypes:Image ;
dc:format "image/jpeg" ;
svcs:has_service ?service .

?imageannoURI a oa:Annotation ;
oa:hasBody ?imageResourceURI ;
oa:hasTarget ?canvasURI ;
oa:motivatedBy sc:painting .

?sequenceURI a sc:Sequence ;
sc:hasCanvases ?canvasURI .

?canvasURI a sc:Canvas ;
rdfs:label ?label ;
sc:hasImageAnnotations ?imageannoURI .

?canvasURI exif:width ?canvasWidth;
exif:height ?canvasHeight.
} WHERE {
  BIND(STR(${baseIri}) as ?baseStr)
  BIND(URI(CONCAT(?baseStr, "/manifest.json")) as ?manifestURI)
  BIND(URI(CONCAT(?baseStr, "/sequence")) as ?sequenceURI)
  BIND(STR(?imageIri) as ?imageStr)
  BIND(URI(CONCAT(?imageStr, "")) as ?canvasURI)
  BIND(URI(CONCAT(?imageStr, "/imageanno/anno-1")) as ?imageannoURI)
  BIND(URI(CONCAT(?imageStr, "/imgresource")) as ?imageResourceURI)
}`;
  const iris = params.map(({imageIri}) => imageIri);
  const queryingDisplayLabel = getLabel(baseIri);
  const queryingImagesLabels = getLabels(iris);
  return Kefir.zip([queryingDisplayLabel, queryingImagesLabels]).flatMap(
    ([displayLabel, labels]) => {
      const parameters = params.map(param => ({
        displayLabel: Rdf.literal(displayLabel),
        imageIri: param.imageIri,
        service: Rdf.iri(param.imageServiceUri),
        canvasWidth: Rdf.literal(param.canvasSize.width.toString(), xsd.integer),
        canvasHeight: Rdf.literal(param.canvasSize.height.toString(), xsd.integer),
        label: Rdf.literal(labels.get(param.imageIri)),
      }));
      return SparqlClient.prepareQuery(sparql, parameters);
    }
  ).map(query =>
    SparqlUtil.serializeQuery(query)
  ).toProperty();
}
