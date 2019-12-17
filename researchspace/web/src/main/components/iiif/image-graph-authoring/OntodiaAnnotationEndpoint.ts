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
import * as SparqlJs from 'sparqljs';
import {
  ElementModel, ElementIri, ElementTypeIri, LinkTypeIri, LiteralProperty, LocalizedString,
} from 'ontodia';

import { trigger } from 'platform/api/events';
import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';

import * as OntodiaEvents from 'platform/components/3-rd-party/ontodia/OntodiaEvents';

import { rso, crmdig } from 'researchspace/data/vocabularies';

import {
  LdpRegionService, OARegionAnnotation, getAnnotationTextResource,
} from 'researchspace/data/iiif/LDPImageRegionService';
import { AnnotationEndpoint } from 'researchspace/data/iiif/AnnotationEndpoint';

export interface OntodiaAnnotationEndpointFields {
  boundingBox: string;
  value: string;
  viewport: string;
  isPrimaryAreaOf: string;
}

export interface MiradorRegion {
  region: ElementModel;
  isNew: boolean;
}
export type MiradorRegions = { [canvasId: string]: Array<MiradorRegion> };

export class OntodiaAnnotationEndpoint implements AnnotationEndpoint {
  private readonly miradorId: string;
  private readonly ontodiaId: string;
  private readonly fields: OntodiaAnnotationEndpointFields;

  constructor(
    config: {
      miradorId: string;
      ontodiaId: string;
      fields: OntodiaAnnotationEndpointFields;
    },
    private _miradorRegions: MiradorRegions
  ) {
    this.miradorId = config.miradorId;
    this.ontodiaId = config.ontodiaId;
    this.fields = config.fields;
  }

  get miradorRegions() {
    return this._miradorRegions;
  }

  setMiradorRegions(regions: MiradorRegions) {
    this._miradorRegions = regions;
  }

  search(canvasIri: Rdf.Iri) {
    const regions = this._miradorRegions[canvasIri.value] || [];
    if (!regions.length) {
      return Kefir.constant([]);
    }
    const queryingRegions = regions.map(({region, isNew}) => {
      const regionIri = Rdf.iri(region.id);
      let query: SparqlJs.ConstructQuery;
      if (isNew) {
        const bindings = {
          annotation: regionIri,
          img: canvasIri,
        };
        query = SparqlClient.setBindings(
          SparqlUtil.parseQuery<SparqlJs.ConstructQuery>(REGION_QUERY), bindings
        );
        query = prepareRegionsQuery(query, region.label, 'label');
        query = prepareRegionsQuery(
          query, region.properties[this.fields.value] as LiteralProperty, 'svgValue'
        );
        query = prepareRegionsQuery(
          query, region.properties[this.fields.viewport] as LiteralProperty, 'viewport'
        );
        query = prepareRegionsQuery(
          query, region.properties[this.fields.boundingBox] as LiteralProperty, 'boundingBox'
        );
      }
      return LdpRegionService.getRegionFromSparql(regionIri, query);
    });
    return Kefir.zip(queryingRegions).toProperty();
  }

  create(annotation: OARegionAnnotation) {
    const elementData = convertAnnotationToElementModel(annotation, this.fields);
    trigger({
      eventType: OntodiaEvents.CreateElement,
      source: this.miradorId,
      targets: [this.ontodiaId],
      data: {
        elementData,
        targets: annotation.on.map(on => ({
          targetIri: on.full as ElementIri,
          linkTypeId: this.fields.isPrimaryAreaOf as LinkTypeIri,
        })
        ),
      },
    });
    const annotationId = Rdf.iri('');
    return Kefir.constant(annotationId);
  }

  update(annotation: OARegionAnnotation) {
    const elementData = convertAnnotationToElementModel(annotation, this.fields);
    trigger({
      eventType: OntodiaEvents.EditElement,
      source: this.miradorId,
      targets: [this.ontodiaId],
      data: {targetIri: elementData.id, elementData},
    });
    return Kefir.constant(Rdf.iri(elementData.id));
  }

  remove(annotationIri: Rdf.Iri) {
    trigger({
      eventType: OntodiaEvents.DeleteElement,
      source: this.miradorId,
      targets: [this.ontodiaId],
      data: {iri: annotationIri.value as ElementIri},
    });
    return Kefir.constant(undefined);
  }
}

const REGION_QUERY = `prefix oa: <http://www.w3.org/ns/oa#>
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
} WHERE {}`;

function convertAnnotationToElementModel(
  annotation: OARegionAnnotation, fields: OntodiaAnnotationEndpointFields
): ElementModel {
  const textResource = getAnnotationTextResource(annotation);
  return {
    id: annotation['@id'] as ElementIri,
    types: [
      rso.EX_Digital_Image_Region.value as ElementTypeIri,
      crmdig.D35_Area.value as ElementTypeIri,
    ],
    label: {values: [{value: textResource.chars, language: ''}]},
    properties: {
      [fields.boundingBox]: {
        type: 'string',
        values: annotation.on.map(on =>
          ({value: on.selector.default.value, language: ''})
        ),
      },
      [fields.value]: {
        type: 'string',
        values: annotation.on.map(on =>
          ({value: on.selector.item.value, language: ''})
        ),
      },
      [fields.viewport]: {
        type: 'string',
        values: [{
          value: annotation['http://www.researchspace.org/ontology/viewport'],
          language: '',
        }],
      }
    },
  };
}

function prepareRegionsQuery(
  query: SparqlJs.ConstructQuery,
  property: {
    values: ReadonlyArray<LocalizedString>;
  },
  parameter: string
): SparqlJs.ConstructQuery {
  return SparqlClient.prepareParsedQuery(
    property.values.map(
      ({value}) => ({[parameter]: Rdf.literal(value)})
    )
  )(query);
}
