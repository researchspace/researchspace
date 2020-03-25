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
import * as React from 'react';
import * as SparqlJs from 'sparqljs';
import { ElementTypeIri, CancellationToken } from 'ontodia';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';

import {
  observableToCancellablePromise
} from 'platform/components/3-rd-party/ontodia/AsyncAdapters';
import {
  BaseTypeClosureRequest, hasCompatibleType
} from 'platform/components/3-rd-party/ontodia/authoring/FieldBasedMetadataApi';
import {
  FieldConfigurationContext, assertFieldConfigurationItem,
} from 'platform/components/3-rd-party/ontodia/authoring/FieldConfigurationCommon';

export interface MetadataFromFieldsProps {
  /**
   * Selects applicable fields to create field configuration from.
   * This query will be sent to the `assets` repository.
   *
   * Required output bindings:
   *   - `?field` - field IRI to include into metadata generation process;
   *
   * Default query:
   * ```
   * PREFIX field: <http://www.metaphacts.com/ontology/fields#>
   * SELECT REDUCED ?field WHERE {
   *   ?field a field:Field
   * }
   * ```
   */
  fieldsQuery?: string;
}

const DEFAULT_FIELDS_QUERY =
`PREFIX field: <http://www.metaphacts.com/ontology/fields#>
SELECT REDUCED ?field WHERE {
  ?field a field:Field
}`;

/**
 * Generates metadata configuration for Ontodia based on provided fields.
 *
 * This field configuration item uses domain and range types from all fields to
 * construct full set of sub- and super-classes to use as entities and attaches
 * compatible fields based on the domain (both datatype and object properties).
 */
export class MetadataFromFields extends React.Component<MetadataFromFieldsProps, {}> {
  render(): null { return null; }

  static async getRequiredFields(
    props: MetadataFromFieldsProps,
    ct: CancellationToken
  ): Promise<Rdf.Iri[]> {
    const {fieldsQuery = DEFAULT_FIELDS_QUERY} = props;
    const {results} = await observableToCancellablePromise(
      SparqlClient.select(fieldsQuery, {context: {repository: 'assets'}}),
      ct
    );
    const fieldIris: Rdf.Iri[] = [];
    for (const {field} of results.bindings) {
      if (field && field.isIri()) {
        fieldIris.push(field);
      }
    }
    return fieldIris;
  }

  static async configure(
    props: MetadataFromFieldsProps,
    context: FieldConfigurationContext
  ): Promise<void> {
    const {fieldByIri, cancellationToken: ct} = context;

    const typeField = fieldByIri.get(context.typeIri);
    if (!typeField) {
      throw new Error(
        `<rs-metadata-from-fields>: missing type field <${context.typeIri}>`
      );
    }
    const labelField = fieldByIri.get(context.defaultLabelIri);
    if (!labelField) {
      throw new Error(
        `<rs-metadata-from-fields>: missing label field <${context.defaultLabelIri}>`
      );
    }
    const imageField = context.defaultImageIri
      ? fieldByIri.get(context.defaultImageIri)
      : undefined;

    const directTypeSet = new Set<ElementTypeIri>();
    context.fieldByIri.forEach(field => {
      if (field.domain) {
        for (const type of field.domain) {
          directTypeSet.add(type.value as ElementTypeIri);
        }
      }
    });

    const entityTypeSet = await observableToCancellablePromise(
      queryAllRelatedTypes(directTypeSet), ct
    );
    const entityTypes = Array.from(entityTypeSet);

    const typeRequest = new BaseTypeClosureRequest();
    typeRequest.addAll(entityTypes);
    const typeClosure = await observableToCancellablePromise(typeRequest.query(), ct);

    for (const entityType of entityTypes) {
      if (context.collectedMetadata.has(entityType)) {
        continue;
      }

      const headFields = [typeField, labelField];
      if (labelField) {
        headFields.push(imageField);
      }

      const otherFields = fieldByIri
        .filter(field => {
          if (field.iri === typeField.iri) { return false; }
          if (field.iri === labelField.iri) { return false; }
          if (imageField && field.iri === imageField.iri) { return false; }
          return !field.domain || hasCompatibleType(field.domain, [entityType], typeClosure);
        })
        .sortBy(f => f.iri)
        .sortBy(f => f.order)
        .toArray();

      const entityFields = [...headFields, ...otherFields];

      context.collectedMetadata.set(entityType, {
        entityType,
        fields: entityFields,
        fieldByIri: Immutable.Map(
          entityFields.map(f => [f.iri, f] as [string, typeof f])
        ),
        typeField,
        newSubjectTemplate: context.defaultSubjectTemplate,
        labelField,
        imageField,
        datatypeFields: Immutable.Set(context.datatypeFields as string[]),
        formChildren: undefined,
      });
    }
  }
}

assertFieldConfigurationItem(MetadataFromFields);

const ALL_TYPES_QUERY = SparqlUtil.parseQuerySync(`
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
  SELECT REDUCED ?relatedType WHERE {
    { ?type rdfs:subClassOf* ?relatedType }
    UNION
    { ?relatedType rdfs:subClassOf* ?type }
  }`
) as SparqlJs.SelectQuery;

function queryAllRelatedTypes(
  directTypeSet: ReadonlySet<ElementTypeIri>
): Kefir.Property<Set<ElementTypeIri>> {
  const values: Array<{ type: Rdf.Iri }> = [];
  directTypeSet.forEach(type => {
    values.push({type: Rdf.iri(type)});
  });
  const preparedQuery = SparqlClient.prepareParsedQuery(values)(ALL_TYPES_QUERY);
  return SparqlClient.select(preparedQuery).map(({results}) => {
    const relatedTypes = new Set<ElementTypeIri>();
    for (const {relatedType} of results.bindings) {
      if (relatedType && relatedType.isIri()) {
        relatedTypes.add(relatedType.value as ElementTypeIri);
      }
    }
    return relatedTypes;
  });
}

export default MetadataFromFields;
