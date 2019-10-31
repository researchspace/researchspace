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
import * as SparqlJs from 'sparqljs';

import { Rdf } from 'platform/api/rdf';
import * as JsonLd from 'platform/api/rdf/formats/JsonLd';
import { SparqlClient, QueryContext, SparqlUtil } from 'platform/api/sparql';
import { LdpService } from 'platform/api/services/ldp';

import { rso } from '../vocabularies/vocabularies';

const IIIF_PRESENTATION_CONTEXT = require('./ld-resources/iiif-context.json');
const ANNOTATION_FRAME = require('./ld-resources/annotation-frame.json');

export interface Region {
  annotation: OARegionAnnotation;
}

export interface OARegionAnnotation {
  '@id': string;
  resource: any | any[];
}

/**
 * ldp client for AnnotationContainer container
 */
export class LdpRegionServiceClass extends LdpService {

  constructor(container: string) {
    super(container);
  }

  /**
   * Add new annotation to the AnnotationContainer.
   */
  public addRegion(region: Region): Kefir.Property<Rdf.Iri> {
    return this.createResourceRequest(
        this.getContainerIRI(),
        {data: JSON.stringify(region.annotation), format: 'application/ld+json'}
    ).map(iri => new Rdf.Iri(iri));
  }

  /*
   * Update annotation
   */
  public updateRegion(annotationIri: Rdf.Iri, region: Region): Kefir.Property<Rdf.Iri> {
    return this.sendUpdateResourceRequest(
      annotationIri,
      {data: JSON.stringify(region.annotation), format: 'application/ld+json'}
    );
  }

  public search(objectIri: Rdf.Iri): Kefir.Property<OARegionAnnotation[]> {
    // we assume that regions are always stored in the assets repository
    return SparqlClient.select(
      this.selectForRegions(objectIri), {context: {repository: 'assets'}}
    ).flatMap(result => {
      if (result.results.bindings.length === 0) {
       return Kefir.constant<OARegionAnnotation[]>([]);
      }
      return Kefir.combine<OARegionAnnotation>(
        result.results.bindings.map(
          row => this.getRegionFromSparql(<Rdf.Iri> row['region'])
        )
      );
    }).map(
      regions => regions.filter(region => Boolean(region['@id']))
    ).toProperty();
  }

  public getRegionFromSparql(
    regionIri: Rdf.Iri
  ): Kefir.Property<OARegionAnnotation> {
    return SparqlClient.sendSparqlQuery(
      this.constructForRegion(regionIri), 'application/ld+json', {context: {repository: 'assets'}}
    ).map(res => JSON.parse(res)).flatMap(this.processRegionJsonResponse).toProperty();
  }

  private processRegionJsonResponse = (res: {}) => {
    const documentLoader = JsonLd.makeDocumentLoader({
      overrideContexts: {
        'http://iiif.io/api/presentation/2/context.json': IIIF_PRESENTATION_CONTEXT,
      }
    });
    return JsonLd.frame(res, ANNOTATION_FRAME, {documentLoader})
      .flatMap(framed => JsonLd.compact(framed, framed['@context'], {documentLoader}))
      .map<OARegionAnnotation>(compacted => {
        const context = compacted['@context'];
        if (Array.isArray(context)) {
          // remove redundant context for 'on' property, which was added to frame
          // in order to disable array compaction for this property, see:
          // https://github.com/ProjectMirador/mirador/issues/1138
          compacted['@context'] = context[0];
        }
        return compacted;
      });
  }

  public getRegion(regionIri: Rdf.Iri): Kefir.Property<Region> {
    return this.getResourceRequest(regionIri.value, 'application/ld+json').map(
      jsonText => ({annotation: JSON.parse(jsonText)})
    );
  }

  private selectForRegions(objectIri: Rdf.Iri): string {
    return `prefix crmdig: <http://www.ics.forth.gr/isl/CRMdig/>
select ?region where {
  ?region crmdig:L49_is_primary_area_of ${objectIri}.
}`;
  }

  private regionQuery =
   `
prefix oa: <http://www.w3.org/ns/oa#>
prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix rso: <http://www.researchspace.org/ontology/>
prefix dcmit: <http://purl.org/dc/dcmitype/>
prefix cnt: <http://www.w3.org/2011/content#>
prefix dc: <http://purl.org/dc/elements/1.1/>
prefix crmdig: <http://www.ics.forth.gr/isl/CRMdig/>

CONSTRUCT {
?annotation a oa:Annotation ;
    oa:motivatedBy oa:commenting ;
    oa:hasTarget _:specificResource ;
    oa:hasBody _:body.
    _:body  a dcmit:Text;
            dc:format "text/html";
            cnt:chars ?label.

    _:specificResource a oa:SpecificResource ;
            oa:hasSource ?img ;
            oa:hasSelector _:selector ;
            rso:viewport ?viewport ;
            rso:boundingBox ?boundingBox .

    _:selector a oa:Choice ;
               oa:default _:fragmentSelector ;
               oa:item _:svgSelector .

    _:svgSelector a oa:SvgSelector ;
                  rdf:value ?svgValue .

    _:fragmentSelector a oa:FragmentSelector ;
                       rdf:value ?boundingBox .
} WHERE {
  ?annotation a crmdig:D35_Area ;
              rso:displayLabel ?label ;
              crmdig:L49_is_primary_area_of ?img ;
              rdf:value ?svgValue .

  OPTIONAL { ?annotation rso:viewport ?viewport }
  OPTIONAL { ?annotation rso:boundingBox ?boundingBox }
}`;

  private constructForRegion(regionIri: Rdf.Iri): SparqlJs.ConstructQuery {
    return SparqlClient.setBindings(
      SparqlUtil.parseQuery<SparqlJs.ConstructQuery>(this.regionQuery),
      {
        annotation: regionIri
      }
    );
  }
}

export function getAnnotationTextResource(annotation: OARegionAnnotation): {chars: string} {
  if (annotation && annotation.resource) {
    const resources: any[] = Array.isArray(annotation.resource)
      ? annotation.resource : [annotation.resource];
    return _.find(
      resources, resource => resource['@type'] === 'dctypes:Text');
  }
}

export const LdpRegionService = new LdpRegionServiceClass(rso.ImageRegionContainer.value);
export default LdpRegionService;
