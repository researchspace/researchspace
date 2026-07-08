/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as Kefir from 'kefir';
import * as SparqlJs from 'sparqljs';
import * as Reactodia from '@reactodia/workspace';

import { trigger } from 'platform/api/events';
import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';

import * as OntodiaEvents from 'platform/components/3-rd-party/ontodia/OntodiaEvents';

import { rso, crmdig } from 'platform/data/vocabularies';

import {
  LdpRegionService,
  OARegionAnnotation,
  getAnnotationTextResource,
} from 'platform/data/iiif/LDPImageRegionService';
import { AnnotationEndpoint } from 'platform/data/iiif/AnnotationEndpoint';

export interface OntodiaAnnotationEndpointFields {
  label: string;
  boundingBox: string;
  value: string;
  viewport: string;
  isPrimaryAreaOf: string;
}

export interface MiradorRegion {
  region: Reactodia.ElementModel;
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
    const queryingRegions = regions.map(({ region, isNew }) => {
      const regionIri = Rdf.iri(region.id);
      let query: SparqlJs.ConstructQuery;
      if (isNew) {
        const bindings = {
          annotation: regionIri,
          img: canvasIri,
        };
        query = SparqlClient.setBindings(SparqlUtil.parseQuery<SparqlJs.ConstructQuery>(REGION_QUERY), bindings);
        query = prepareRegionsQuery(query, region.properties[this.fields.label], 'label');
        query = prepareRegionsQuery(query, region.properties[this.fields.value], 'svgValue');
        query = prepareRegionsQuery(query, region.properties[this.fields.viewport], 'viewport');
        query = prepareRegionsQuery(
          query,
          region.properties[this.fields.boundingBox],
          'boundingBox'
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
        targets: annotation.on.map((on) => ({
          targetIri: on.full,
          linkTypeId: this.fields.isPrimaryAreaOf,
        })),
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
      data: { targetIri: elementData.id, elementData },
    });
    return Kefir.constant(Rdf.iri(elementData.id));
  }

  remove(annotation: OARegionAnnotation) {
    trigger({
      eventType: OntodiaEvents.DeleteElement,
      source: this.miradorId,
      targets: [this.ontodiaId],
      data: { iri: annotation['@id'] },
    });
    return Kefir.constant(undefined);
  }
}

const REGION_QUERY = `prefix oa: <http://www.w3.org/ns/oa#>
prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix rs: <http://www.researchspace.org/ontology/>
prefix dcmit: <http://purl.org/dc/dcmitype/>
prefix cnt: <http://www.w3.org/2011/content#>
prefix dc: <http://purl.org/dc/elements/1.1/>
prefix crmdig: <http://www.cidoc-crm.org/extensions/crmdig/>

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
            rs:viewport ?viewport ;
            rs:boundingBox ?boundingBox .

    _:selector a oa:Choice ;
               oa:default _:fragmentSelector ;
               oa:item _:svgSelector .

    _:svgSelector a oa:SvgSelector ;
                  rdf:value ?svgValue .

    _:fragmentSelector a oa:FragmentSelector ;
                       rdf:value ?boundingBox .
} WHERE {}`;

function convertAnnotationToElementModel(
  annotation: OARegionAnnotation,
  fields: OntodiaAnnotationEndpointFields
): Reactodia.ElementModel {
  const textResource = getAnnotationTextResource(annotation);
  return {
    id: annotation['@id'],
    types: [rso.EX_Digital_Image_Region.value],
    properties: {
      [fields.label]: [Rdf.literal(textResource.chars)],
      [fields.boundingBox]: annotation.on.map((on) => Rdf.literal(on.selector.default.value)),
      [fields.value]: annotation.on.map((on) => Rdf.literal(on.selector.item.value)),
      [fields.viewport]: [Rdf.literal(annotation['http://www.researchspace.org/ontology/viewport'])],
      [fields.isPrimaryAreaOf]: annotation.on.map(on => Rdf.iri(on.full)),
    }
  };
}

function prepareRegionsQuery(
  query: SparqlJs.ConstructQuery,
  propertyValues: ReadonlyArray<Reactodia.Rdf.NamedNode | Reactodia.Rdf.Literal> | undefined,
  parameter: string
): SparqlJs.ConstructQuery {
  return SparqlClient.prepareParsedQuery(
    (propertyValues ?? []).map(({ value }) => ({ [parameter]: Rdf.literal(value) }))
  )(query);
}
