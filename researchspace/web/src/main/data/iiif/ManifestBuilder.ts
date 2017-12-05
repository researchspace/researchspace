/*
 * Copyright (C) 2015-2017, © Trustees of the British Museum
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
import * as jsonld from 'jsonld';
import * as _ from 'lodash';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';

import { OARegionAnnotation } from './LDPImageRegionService';
import { JsonLDUtils } from './JsonLDUtils';

const manifestFrame  = require('./ld-resources/manifest-frame.json');
const iiifContext = require('./ld-resources/iiif-context.json');

export interface Manifest {
  __manifestBrand: void;
}

type CreateManifestParams = {
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
  params: CreateManifestParams, repositories: Array<string>
): Kefir.Property<Manifest> {
  return findManifesInRepositories(params, repositories)
    .mapErrors(err =>  new ManifestBuildingError('Failed fetching manifest data', err))
    .flatMap(processJsonResponse).toProperty();
}

function findManifesInRepositories(
  params: CreateManifestParams, repositories: Array<string>
) {
  // 1. prepare sparql construct
  const sparql = constructSparql(params);
  JsonLDUtils.registerLocalLoader();
  // 2. execute sparql, get json-ld

  const requests =
    repositories.map(
      repository =>
        SparqlClient.stringStreamAsJson(
          SparqlClient.sendStreamSparqlQuery(sparql, 'application/ld+json', {context: {repository}})
        )
    );
  return Kefir.combine(requests).flatMap(
    responses => {
      const manifests = _.filter(responses, response => !_.isEmpty(response));
      if (_.isEmpty(manifests)) {
        return Kefir.constantError<any>(`No manifests for the image/region ${params.imageIri}`);
      } else if (manifests.length > 1) {
        return Kefir.constantError<any>(`Multiple manifests for image/regions ${params.imageIri}`);
      } else {
        return Kefir.constant(manifests[0]);
      }
    }
  );
}

function processJsonResponse(response: {}) {
  return Kefir.fromNodeCallback<Manifest>(cb => {
    // 3. frame and compact json-ld
    jsonld.frame(response, manifestFrame, (frameError, framed) => {
      if (frameError) {
        cb(new ManifestBuildingError('Failed to frame JSON-LD', frameError));
        return;
      }
      jsonld.compact(framed, iiifContext, (compactError, compacted) => {
        if (compactError) {
          cb(new ManifestBuildingError('Failed to compact JSON-LD', compactError));
          return;
        }
        cb(null, compacted);
      });
    });
  });
}

function constructSparql(params: CreateManifestParams) {
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
sc:hasSequences ( ?sequenceURI ) ;
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
sc:hasCanvases ( ?canvasURI ) .

?canvasURI a sc:Canvas ;
rdfs:label "Illustrated book. 2 vols." ;
sc:hasImageAnnotations ( ?imageannoURI ).

${params.canvasSize ? (`?canvasURI ` +
  `exif:width "${params.canvasSize.width}"^^xsd:integer ; ` +
  `exif:height "${params.canvasSize.height}"^^xsd:integer`) : ''}

} WHERE {
 {
   # workaround for the situation when we have multiple rso:displayLabel
   SELECT * {
     BIND(${params.imageIri} as ?img)
     BIND(STR(${params.baseIri}) as ?baseStr)
     #find object and it's label
     ?img rso:displayLabel ?displayLabel.
     BIND(<${params.imageServiceUri}> as ?service)
     BIND(URI(CONCAT(?baseStr, "/manifest.json")) as ?manifestURI)
     BIND(URI(CONCAT(?baseStr, "/sequence")) as ?sequenceURI)
     BIND(URI(CONCAT(?baseStr, "")) as ?canvasURI)
     BIND(URI(CONCAT(?baseStr, "/imageanno/anno-1")) as ?imageannoURI)
     BIND(URI(CONCAT(?baseStr, "/imgresource")) as ?imageResourceURI)
  } LIMIT 1
 }
}`;
  return sparql;
}
