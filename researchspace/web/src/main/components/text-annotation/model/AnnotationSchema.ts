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

import * as Immutable from 'immutable';
import * as Kefir from 'kefir';
import * as moment from 'moment';

import { Rdf, vocabularies } from 'platform/api/rdf';
import * as JsonLd from 'platform/api/rdf/formats/JsonLd';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';

import { LdpService } from 'platform/api/services/ldp';

import * as Forms from 'platform/components/forms';

import { crm, crmdig } from 'researchspace/data/vocabularies';

const JSONLD_ANNOTATION_CONTEXT = require('./annotation-context.json');

const {oa, rdf, xsd, VocabPlatform} = vocabularies;

export const OAHasTarget = createDirectField(
  oa.hasTarget,
  {id: 'oaHasTarget', minOccurs: 1, maxOccurs: 1, xsdDatatype: xsd.anyURI}
);

export const OAHasBody = createDirectField(
  oa.hasBody,
  {id: 'oaHasBody', minOccurs: 1, maxOccurs: 1, xsdDatatype: xsd.anyURI}
);

export const OAHasSelector = createDirectField(
  oa.hasSelector,
  {id: 'oaHasSelector', minOccurs: 1, maxOccurs: 1, xsdDatatype: xsd.anyURI}
);

export const OAHasSource = createDirectField(
  oa.hasSource,
  {id: 'oaHasSource', minOccurs: 1, maxOccurs: 1, xsdDatatype: xsd.anyURI}
);

export const OAHasStartSelector = createDirectField(
  oa.hasStartSelector,
  {id: 'oaHasStartSelector', minOccurs: 1, maxOccurs: 1, xsdDatatype: xsd.anyURI}
);

export const OAHasEndSelector = createDirectField(
  oa.hasEndSelector,
  {id: 'oaHasEndSelector', minOccurs: 1, maxOccurs: 1, xsdDatatype: xsd.anyURI}
);

export const OARefinedBy = createDirectField(
  oa.refinedBy,
  {id: 'oaRefinedBy', minOccurs: 1, maxOccurs: 1, xsdDatatype: xsd.anyURI}
);

export const OAStart = createDirectField(
  oa.start,
  {id: 'oaStart', minOccurs: 1, maxOccurs: 1, xsdDatatype: xsd.nonNegativeInteger}
);

export const OAEnd = createDirectField(
  oa.end,
  {id: 'oaEnd', minOccurs: 1, maxOccurs: 1, xsdDatatype: xsd.nonNegativeInteger}
);

export const RdfType = createDirectField(
  rdf.type,
  {id: 'type', xsdDatatype: xsd.anyURI}
);

export const RdfValue = createDirectField(
  rdf.value,
  {id: 'value'}
);

export const CrmdigL48iWasAnnotationCreatedBy = createDirectField(
  crmdig.L48i_was_annotation_created_by,
  {id: 'createdBy'}
);

export const CrmP4HasTimeSpan = Forms.normalizeFieldDefinition({
  id: 'modifiedAt',
  xsdDatatype: xsd.dateTime,
  selectPattern: `
    PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
    SELECT $value WHERE {
      $subject crm:P4_has_time_span ?span.
      ?span crm:P81a_end_of_the_begin $value.
    }
  `,
  insertPattern: `
    PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
    INSERT {
      $subject crm:P4_has_time_span ?span.
      ?span crm:P81a_end_of_the_begin $value.
      ?span crm:P81b_begin_of_the_end $value.
    } WHERE {
      BIND(IRI(CONCAT(STR($subject), "/modifiedAt")) as ?span)
    }
  `,
  deletePattern: `
    PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
    DELETE {
      $subject crm:P4_has_time_span ?span.
      ?span crm:P81a_end_of_the_begin $value.
      ?span crm:P81b_begin_of_the_end $value.
    } WHERE {
      $subject crm:P4_has_time_span ?span.
      ?span crm:P81a_end_of_the_begin $value.
    }
  `
});

export const CrmP14CarriedOutBy = createDirectField(
  crm.P14_carried_out_by,
  {id: 'author', xsdDatatype: xsd.anyURI}
);

function createDirectField(predicate: Rdf.Iri, props: Forms.FieldDefinitionProp) {
  return Forms.normalizeFieldDefinition({
    ...props,
    selectPattern: SparqlUtil.serializeQuery(SparqlClient.setBindings(
      SparqlUtil.parseQuery(`SELECT $value WHERE { $subject ?predicate $value }`), {predicate}
    )),
    insertPattern: SparqlUtil.serializeQuery(SparqlClient.setBindings(
      SparqlUtil.parseQuery(`INSERT { $subject ?predicate $value } WHERE {}`), {predicate}
    )),
    deletePattern: SparqlUtil.serializeQuery(SparqlClient.setBindings(
      SparqlUtil.parseQuery(`DELETE { $subject ?predicate $value } WHERE {}`), {predicate}
    ))
  });
}

export type AnnotationSelector = RangeSelector | PointSelector;

export interface RangeSelector {
  readonly type: 'range';
  readonly start: PointSelector;
  readonly end: PointSelector;
}

export interface PointSelector {
  readonly type: 'point';
  readonly xPath: string;
  readonly offset: number;
}

export function createRangeTarget(params: {
  source: Rdf.Iri;
  selector: RangeSelector;
  selectedText?: string;
}): Forms.CompositeValue {
  const {source, selector, selectedText} = params;
  return makeComposite(params.source, `range-source-{{UUID}}`, [
    {def: RdfType, value: valueFromRdf(oa.SpecificResource)},
    {def: OAHasSource, value: valueFromRdf(source)},
    {
      def: RdfValue,
      value: typeof selectedText === 'string'
        ? valueFromRdf(Rdf.literal(selectedText)) : [],
    },
    {
      def: OAHasSelector,
      value: makeComposite(params.source, `range-{{UUID}}`, [
        {def: RdfType, value: valueFromRdf(oa.RangeSelector)},
        {
          def: OAHasStartSelector,
          value: makeSelector(params.source, selector.start.xPath, selector.start.offset),
        },
        {
          def: OAHasEndSelector,
          value: makeSelector(params.source, selector.end.xPath, selector.end.offset),
        },
      ])
    },
  ]);
}

export function createPointTarget(params: {
  source: Rdf.Iri;
  selector: PointSelector;
}): Forms.CompositeValue {
  const {source, selector} = params;
  return makeComposite(params.source, `point-source-{{UUID}}`, [
    {def: OAHasSource, value: valueFromRdf(source)},
    {
      def: OAHasSelector,
      value: makeSelector(params.source, selector.xPath, selector.offset),
    },
  ]);
}

export function createProvenanceEvent(params: {
  source: Rdf.Iri;
  userIri: Rdf.Iri,
  modifiedAt: Rdf.Literal,
}): Forms.CompositeValue {
  return makeComposite(params.source, 'annotation-event-{{UUID}}', [
    {def: RdfType, value: valueFromRdf(crmdig.D30_Annotation_Event)},
    {def: CrmP4HasTimeSpan, value: valueFromRdf(params.modifiedAt)},
    {def: CrmP14CarriedOutBy, value: valueFromRdf(params.userIri)},
  ]);
}

export function getCurrentDateTime(): Rdf.Literal {
  return Rdf.literal(moment.utc().format(), xsd.dateTime);
}

function makeSelector(ownerIri: Rdf.Iri, xpath: string, offset: number) {
  const rdfOffset = valueFromRdf(
    Rdf.literal(offset.toString(), xsd.nonNegativeInteger)
  );
  return makeComposite(ownerIri, `xpath-{{UUID}}`, [
    {def: RdfType, value: valueFromRdf(oa.XPathSelector)},
    {def: RdfValue, value: valueFromRdf(Rdf.literal(xpath))},
    {
      def: OARefinedBy,
      value: makeComposite(ownerIri, `offset-{{UUID}}`, [
        {def: RdfType, value: valueFromRdf(oa.TextPositionSelector)},
        {def: OAStart, value: rdfOffset},
        {def: OAEnd, value: rdfOffset},
      ])
    },
  ]);
}

function makeComposite(
  ownerIri: Rdf.Iri,
  subjectTemplate: string,
  fields: ReadonlyArray<{
    def: Forms.FieldDefinition;
    value: Forms.FieldValue | ReadonlyArray<Forms.FieldValue>;
  }>
): Forms.CompositeValue {
  const composite: Forms.CompositeValue = {
    type: Forms.CompositeValue.type,
    definitions: Immutable.Map(
      fields.map(p => [p.def.id, p.def] as [string, Forms.FieldDefinition])
    ),
    subject: Rdf.iri(''),
    fields: Immutable.Map(fields.map(p => {
      const values = Immutable.List(Array.isArray(p.value) ? p.value : [p.value]);
      const state: Forms.FieldState = {values, errors: Forms.FieldError.noErrors};
      return [p.def.id, state] as [string, Forms.FieldState];
    })),
    errors: Forms.FieldError.noErrors,
  };
  return Forms.CompositeValue.set(composite, {
    subject: Forms.generateSubjectByTemplate(subjectTemplate, ownerIri, composite),
  });
}

export function addField(
  base: Forms.CompositeValue,
  def: Forms.FieldDefinition,
  values: ReadonlyArray<Forms.FieldValue>
) {
  return Forms.CompositeValue.set(base, {
    definitions: base.definitions.set(def.id, def),
    fields: base.fields.set(def.id, {
      values: Immutable.List(values),
      errors: Forms.FieldError.noErrors,
    }),
  });
}

function valueFromRdf(value: Rdf.Iri | Rdf.Literal) {
  return Forms.FieldValue.fromLabeled({value});
}

export interface Annotation {
  readonly iri: Rdf.Iri;
  /** UI-only version key to track changes in the annotation */
  readonly renderVersion?: number;
  readonly selector: AnnotationSelector;
  readonly selectedText?: string;
  readonly bodyType?: Rdf.Iri;
  readonly author?: Rdf.Iri;
}

export const PLACEHOLDER_ANNOTATION = Rdf.iri('');
export const ANNOTATION_TO_DELETE = Rdf.iri('mp-text-annotation:to-delete');

const ANNOATIONS_QUERY = SparqlUtil.parseQuery(
`PREFIX oa: <http://www.w3.org/ns/oa#>
SELECT ?annotation WHERE {
  ?annotation oa:hasTarget ?target .
  ?target oa:hasSource ?__documentIri__ .
}`);

export function fetchAnnotations(
  documentIri: Rdf.Iri,
  context: SparqlClient.QueryContext,
  selectType: (types: ReadonlyArray<Rdf.Iri>) => Rdf.Iri | undefined
): Kefir.Property<Annotation[]> {
  const query = SparqlClient.setBindings(ANNOATIONS_QUERY, {__documentIri__: documentIri});
  return SparqlClient.select(query, {context})
    .flatMap(({results}) => {
      const iris: Rdf.Iri[] = [];
      for (const {annotation} of results.bindings) {
        if (annotation && annotation.isIri()) {
          iris.push(annotation);
        }
      }
      return iris.length === 0
        ? Kefir.constant([])
        : Kefir.zip(iris.map(iri => fetchAnnotation(iri, context, selectType)));
    })
    .toProperty();
}

const ANNOTATION_FRAME = {
  '@context': 'https://www.w3.org/ns/anno.jsonld',
  '@type': 'Annotation',
  'target': {
    'source': {'@embed': '@always'},
    'selector': {}
  },
};

function fetchAnnotation(
  iri: Rdf.Iri,
  {repository}: SparqlClient.QueryContext,
  selectType: (types: ReadonlyArray<Rdf.Iri>) => Rdf.Iri | undefined
): Kefir.Property<Annotation> {
  const documentLoader = JsonLd.makeDocumentLoader({
    overrideContexts: {
      'https://www.w3.org/ns/anno.jsonld': JSONLD_ANNOTATION_CONTEXT,
    }
  });
  const ldp = new LdpService(VocabPlatform.FormContainer.value, {repository});
  return ldp.getResourceRequest(iri.value + '/container', 'text/turtle')
    .flatMap(ttl => JsonLd.fromRdf(ttl, {
      documentLoader,
      format: 'text/turtle',
      useNativeTypes: true
    }))
    .flatMap(doc => JsonLd.frame(doc, ANNOTATION_FRAME, {documentLoader}))
    .map((framed): Annotation => {
      // TODO: add strict validation here
      const anno = framed['@graph'][0];
      const selector = anno.target.selector;
      const types: string[] = anno.body.type
        ? (Array.isArray(anno.body.type) ? anno.body.type : [anno.body.type])
        : [];
      return {
        iri,
        selector: selector.type === 'RangeSelector'
          ? extractRangeSelector(selector)
          : extractPointSelector(selector),
        selectedText: typeof anno.target.value === 'string'
          ? anno.target.value : undefined,
        bodyType: selectType(types.map(Rdf.iri)),
        author: typeof anno.carriedOutBy === 'string'
          ? Rdf.iri(anno.carriedOutBy) : undefined,
      };
    })
    .toProperty();
}

function extractRangeSelector(doc: any): RangeSelector {
  // TODO: add strict validation here
  return {
    type: 'range',
    start: extractPointSelector(doc.startSelector),
    end: extractPointSelector(doc.endSelector),
  };
}

function extractPointSelector(doc: any): PointSelector {
  // TODO: add strict validation here
  return {
    type: 'point',
    xPath: doc.value,
    offset: Number(doc.refinedBy.start),
  };
}

export function sameIri(a: Rdf.Iri | undefined, b: Rdf.Iri | undefined) {
  return a && b && a.equals(b) || !a && !b;
}

export function mapIriToColor(iri: Rdf.Iri | undefined) {
  if (!iri || !iri.value) {
    return `rgb(52, 152, 219)`;
  }
  const hash = Math.abs(hashFnv32a(iri.value));
  const value = Math.floor(hash * (Math.pow(2, 24) / Math.pow(2, 31)));
  /* tslint:disable:no-bitwise */
  const r = (value >> 16) & 0xFF;
  const g = (value >> 8) & 0xFF;
  const b = (value >> 0) & 0xFF;
  /* tslint:enable:no-bitwise */
  return `rgb(${r},${g},${b})`;
}

/**
 * Calculate a 32 bit FNV-1a hash
 * Found here: https://gist.github.com/vaiorabbit/5657561
 * Ref.: http://isthe.com/chongo/tech/comp/fnv/
 *
 * @param {string} str the input value
 * @param {integer} [seed] optionally pass the hash of the previous chunk
 * @returns {integer}
 */
function hashFnv32a(str: string, seed = 0x811c9dc5): number {
  /* tslint:disable:no-bitwise */
  let i: number, l: number, hval = seed & 0x7fffffff;

  for (i = 0, l = str.length; i < l; i++) {
      hval ^= str.charCodeAt(i);
      hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
  }
  return hval >>> 0;
  /* tslint:enable:no-bitwise */
}
