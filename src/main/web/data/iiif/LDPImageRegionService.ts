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
import * as _ from 'lodash';
import * as SparqlJs from 'sparqljs';
import * as Immutable from 'immutable';

import { Rdf } from 'platform/api/rdf';
import * as JsonLd from 'platform/api/rdf/formats/JsonLd';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { LdpService } from 'platform/api/services/ldp';

import * as Forms from 'platform/components/forms';

import { rso, crmdig } from '../vocabularies/vocabularies';

import {
  SubjectTemplate,
  ImageRegionType,
  ImageRegionLabel,
  ImageRegionBoundingBox,
  ImageRegionValue,
  ImageRegionViewport,
  ImageRegionIsPrimaryAreaOf,
  ImageRegionFields,
} from './ImageRegionSchema';

const IIIF_PRESENTATION_CONTEXT = require('./ld-resources/iiif-context.json');
const ANNOTATION_FRAME = require('./ld-resources/annotation-frame.json');

export interface Region {
  annotation: OARegionAnnotation;
}

export interface OARegionAnnotation {
  '@id': string;
  resource: any | any[];
  on: ReadonlyArray<{
    full: string;
    selector: {
      default: { value: string };
      item: { value: string };
    };
  }>;
  'http://www.researchspace.org/ontology/viewport': string;
}

/**
 * ldp client for AnnotationContainer container
 */
export class LdpRegionServiceClass extends LdpService {
  private readonly persistence = new Forms.LdpPersistence({ type: 'ldp', repository: 'default' });

  constructor(container: string) {
    super(container);
  }

  /**
   * Add new annotation
   */
  public addRegion(region: Region): Kefir.Property<Rdf.Iri> {
    const currentModel = convertAnnotationToCompositeValue(region.annotation);
    return this.persistence.persist(Forms.FieldValue.empty, currentModel).map(() => {
      return currentModel.subject;
    });
  }

  /*
   * Update annotation
   */
  public updateRegion(annotationIri: Rdf.Iri, region: Region): Kefir.Property<Rdf.Iri> {
    return this.isOldRegion(annotationIri)
      .flatMap((isOldRegion) => {
        const currentModel = convertAnnotationToCompositeValue(region.annotation);
        if (isOldRegion) {
          return this.deleteResource(annotationIri).flatMap(() => {
            return this.persistence.persist(Forms.FieldValue.empty, currentModel);
          });
        }
        return fetchInitialAnnotationModel(annotationIri).flatMap((initialModel) => {
          return this.persistence.persist(initialModel, currentModel);
        });
      })
      .map(() => {
        return annotationIri;
      })
      .toProperty();
  }

  public search(objectIri: Rdf.Iri): Kefir.Property<OARegionAnnotation[]> {
    // we assume that regions are always stored in the default repository
    return SparqlClient.select(this.selectForRegions(objectIri), { context: { repository: 'default' } })
      .flatMap((result) => {
        if (result.results.bindings.length === 0) {
          return Kefir.constant<OARegionAnnotation[]>([]);
        }
        return Kefir.combine<OARegionAnnotation>(
          result.results.bindings.map((row) => this.getRegionFromSparql(<Rdf.Iri>row['region']))
        );
      })
      .map((regions) => regions.filter((region) => Boolean(region['@id'])))
      .toProperty();
  }

  public getRegionFromSparql(
    regionIri: Rdf.Iri,
    constructQuery?: SparqlJs.ConstructQuery
  ): Kefir.Property<OARegionAnnotation> {
    const query = constructQuery || this.constructForRegion(regionIri);
    return SparqlClient.sendSparqlQuery(query, 'application/ld+json', { context: { repository: 'default' } })
      .map((res) => JSON.parse(res))
      .flatMap(this.processRegionJsonResponse)
      .toProperty();
  }

  private processRegionJsonResponse = (res: {}) => {
    const documentLoader = JsonLd.makeDocumentLoader({
      overrideContexts: {
        'http://iiif.io/api/presentation/2/context.json': IIIF_PRESENTATION_CONTEXT,
      },
    });
    return JsonLd.frame(res, ANNOTATION_FRAME, { documentLoader })
      .flatMap((framed) => JsonLd.compact(framed, framed['@context'], { documentLoader }))
      .map<OARegionAnnotation>((compacted) => {
        const context = compacted['@context'];
        if (Array.isArray(context)) {
          // remove redundant context for 'on' property, which was added to frame
          // in order to disable array compaction for this property, see:
          // https://github.com/ProjectMirador/mirador/issues/1138
          compacted['@context'] = context[0];
        }
        return compacted;
      });
  };

  public getRegion(regionIri: Rdf.Iri): Kefir.Property<Region> {
    return this.getResourceRequest(regionIri.value, 'application/ld+json').map((jsonText) => ({
      annotation: JSON.parse(jsonText),
    }));
  }

  private selectForRegions(objectIri: Rdf.Iri): string {
    return `prefix crmdig: <http://www.ics.forth.gr/isl/CRMdig/>
select ?region where {
  ?region crmdig:L49_is_primary_area_of ${objectIri}.
}`;
  }

  private regionQuery = `
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
  ?annotation a rso:EX_Digital_Image_Region ;
              (rso:displayLabel|rdfs:label) ?label ;
              crmdig:L49_is_primary_area_of ?img ;
              rdf:value ?svgValue .

  OPTIONAL { ?annotation rso:viewport ?viewport }
  OPTIONAL { ?annotation rso:boundingBox ?boundingBox }
}`;

  private constructForRegion(regionIri: Rdf.Iri): SparqlJs.ConstructQuery {
    return SparqlClient.setBindings(SparqlUtil.parseQuery<SparqlJs.ConstructQuery>(this.regionQuery), {
      annotation: regionIri,
    });
  }

  deleteRegion(annotationIri: Rdf.Iri) {
    return this.isOldRegion(annotationIri)
      .flatMap((isOldRegion) => {
        if (isOldRegion) {
          return this.deleteResource(annotationIri);
        }
        return fetchInitialAnnotationModel(annotationIri).flatMap((annotationModel) =>
          this.persistence.persist(annotationModel, Forms.FieldValue.empty)
        );
      })
      .toProperty();
  }

  private isOldRegion(annotationIri: Rdf.Iri): Kefir.Property<boolean> {
    return this.get(annotationIri)
      .flatMap(() => {
        return Kefir.constant(true);
      })
      .flatMapErrors(() => {
        return Kefir.constant(false);
      })
      .toProperty();
  }
}

export function getAnnotationTextResource(annotation: OARegionAnnotation): { chars: string } {
  if (annotation && annotation.resource) {
    const resources: any[] = Array.isArray(annotation.resource) ? annotation.resource : [annotation.resource];
    return _.find(resources, (resource) => resource['@type'] === 'dctypes:Text');
  }
}

export function convertAnnotationToCompositeValue(annotation: OARegionAnnotation): Forms.CompositeValue {
  const initial: Forms.CompositeValue = {
    type: Forms.CompositeValue.type,
    subject: Rdf.iri(annotation['@id']),
    definitions: Immutable.Map<string, Forms.FieldDefinition>(ImageRegionFields.map((field) => [field.id, field])),
    fields: Immutable.Map<string, Forms.FieldState>(),
    errors: Forms.FieldError.noErrors,
  };
  const textResource = getAnnotationTextResource(annotation);
  const fieldStates: Array<[string, Forms.FieldState]> = ImageRegionFields.map((field) => {
    let values: Immutable.List<Forms.FieldValue>;
    let fieldState = Forms.FieldState.empty;
    if (field.id === ImageRegionType.id) {
      values = Immutable.List<Forms.FieldValue>(
        [rso.EX_Digital_Image_Region, crmdig.D35_Area].map((value) => {
          return Forms.FieldValue.fromLabeled({ value });
        })
      );
    } else if (field.id === ImageRegionLabel.id) {
      const value = Rdf.literal(textResource.chars);
      values = Immutable.List<Forms.FieldValue>([Forms.FieldValue.fromLabeled({ value })]);
    } else if (field.id === ImageRegionBoundingBox.id) {
      values = Immutable.List<Forms.FieldValue>(
        annotation.on.map((on) => {
          const value = Rdf.literal(on.selector.default.value);
          return Forms.FieldValue.fromLabeled({ value });
        })
      );
    } else if (field.id === ImageRegionValue.id) {
      values = Immutable.List<Forms.FieldValue>(
        annotation.on.map((on) => {
          const value = Rdf.literal(on.selector.item.value);
          return Forms.FieldValue.fromLabeled({ value });
        })
      );
    } else if (field.id === ImageRegionViewport.id) {
      const value = Rdf.literal(annotation[rso.viewport.value]);
      values = Immutable.List<Forms.FieldValue>([Forms.FieldValue.fromLabeled({ value })]);
    } else if (field.id === ImageRegionIsPrimaryAreaOf.id) {
      values = Immutable.List<Forms.FieldValue>(
        annotation.on.map((on) => {
          const value = Rdf.iri(on.full);
          return Forms.FieldValue.fromLabeled({ value });
        })
      );
    }
    fieldState = Forms.FieldState.set(fieldState, { values });
    return [field.id, fieldState];
  });
  const subject = Forms.generateSubjectByTemplate(SubjectTemplate, undefined, initial);
  const fields = Immutable.Map<string, Forms.FieldState>(fieldStates);
  return Forms.CompositeValue.set(initial, { subject, fields });
}

function fetchInitialAnnotationModel(annotationIri: Rdf.Iri): Kefir.Property<Forms.CompositeValue> {
  const initial: Forms.CompositeValue = {
    type: Forms.CompositeValue.type,
    subject: annotationIri,
    definitions: Immutable.Map<string, Forms.FieldDefinition>(ImageRegionFields.map((field) => [field.id, field])),
    fields: Immutable.Map<string, Forms.FieldState>(),
    errors: Forms.FieldError.noErrors,
  };
  const valuesFetching = ImageRegionFields.map((field) =>
    Forms.queryValues(field.selectPattern, annotationIri).map((bindings) => {
      const values = Immutable.List(bindings.map((b) => Forms.FieldValue.fromLabeled(b)));
      const state = Forms.FieldState.set(Forms.FieldState.empty, { values });
      return [field.id, state] as [string, Forms.FieldState];
    })
  );
  return Kefir.zip(valuesFetching)
    .map((fields) => {
      const nonEmpty = fields.filter(([id, state]) => state.values.size > 0);
      return Forms.CompositeValue.set(initial, { fields: Immutable.Map(nonEmpty) });
    })
    .toProperty();
}

export const LdpRegionService = new LdpRegionServiceClass(rso.ImageRegionContainer.value);
export default LdpRegionService;
