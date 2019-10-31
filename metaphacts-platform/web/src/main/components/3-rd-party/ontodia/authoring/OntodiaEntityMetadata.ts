/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

import * as React from 'react';
import { ReactElement, Children, ReactNode, cloneElement } from 'react';
import * as Immutable from 'immutable';
import * as SparqlJs from 'sparqljs';
import { ElementTypeIri } from 'ontodia';

import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import { xsd, rdf } from 'platform/api/rdf/vocabularies';
import { SparqlUtil } from 'platform/api/sparql';

import {
  ResourceEditorForm, ResourceEditorFormProps, FieldDefinitionProp, CompositeInput,
  CompositeInputProps, CompositeValue, FieldValue, FieldState, FieldError, ErrorKind,
  SemanticForm, FieldDefinition, normalizeFieldDefinition, validateFieldConfiguration,
  FieldMapping, mapChildToComponent,
} from 'platform/components/forms';
import { isValidChild, componentHasType, universalChildren } from 'platform/components/utils';

export interface OntodiaEntityMetadataProps {
  entityTypeIri: string;
  labelIri?: string;
  typeIri?: string;
  imageIri?: string;
  forceIris?: string[];
}

/**
 * @example
 * <semantic-form new-subject-template='http://www.example.com/company/{{UUID}}'
 *   fields='... (hasType, companyName, companyAddress)'>
 *   <ontodia-entity-metadata entity-type-iri='http://example.com/Company'
 *     label-iri='http://www.example.com/fields/companyName'
 *     type-iri='http://www.example.com/fields/hasType'>
 *   </ontodia-entity-metadata>
 *
 *   <semantic-form-text-input for='http://www.example.com/fields/companyName'>
 *   </semantic-form-text-input>
 *
 *   <semantic-form-composite-input for='http://www.example.com/fields/companyAddress'
 *     fields='... (addressCountry, addressCity, etc)'>
 *     <ontodia-entity-metadata entity-type-iri='http://example.com/Address'
 *       type-iri='http://www.example.com/fields/hasType'>
 *     </ontodia-entity-metadata>
 *     <!-- inputs for addressCountry, addressCity, etc) -->
 *   </semantic-form-composite-input>
 *
 *   <semantic-form-errors></semantic-form-errors>
 *   <button name="submit" class="btn btn-default">Save</button>
 *   <button name="reset" class="btn btn-default">Reset</button>
 * </semantic-form>
 */
export class OntodiaEntityMetadata extends Component<OntodiaEntityMetadata, {}> {}

export interface EntityMetadata {
  readonly parent?: EntityParent;
  readonly entityType: ElementTypeIri;
  readonly labelField: FieldDefinition;
  readonly typeField: FieldDefinition;
  readonly imageField?: FieldDefinition;
  readonly fieldById: Immutable.Map<string, FieldDefinition>;
  readonly fieldByIri: Immutable.Map<string, FieldDefinition>;
  readonly newSubjectTemplate: string;
  readonly formChildren: ReactNode;
  readonly forceFields?: Immutable.Map<string, FieldDefinition>;
}

export interface EntityParent {
  readonly type: ElementTypeIri;
  readonly fieldIri: string;
}

export function extractAuthoringMetadata(
  markup: ReadonlyArray<ReactElement<any>>
): Map<ElementTypeIri, EntityMetadata> {
  const metadata = new Map<ElementTypeIri, EntityMetadata>();
  for (const child of markup) {
    if (componentHasType(child, ResourceEditorForm)) {
      collectMetadataFromFormOrComposite(child, undefined, metadata);
    }
  }
  return metadata;
}

function collectMetadataFromFormOrComposite(
  formOrComposite: ReactElement<ResourceEditorFormProps | CompositeInputProps>,
  parent: EntityParent | undefined,
  collectedMetadata: Map<ElementTypeIri, EntityMetadata>
) {
  const {form, metadataElement} = extractEntityFormAndMetadata(formOrComposite);
  const {entityTypeIri, labelIri, typeIri, imageIri, forceIris} = metadataElement.props;

  if (typeof entityTypeIri !== 'string') {
    throw new Error(`Missing 'entityTypeIri' prop for ontodia-entity-metadata`);
  }
  if (typeof labelIri !== 'string') {
    throw new Error(`Missing 'labelIri' prop for ontodia-entity-metadata`);
  }
  if (typeof typeIri !== 'string') {
    throw new Error(`Missing 'typeIri' prop for ontodia-entity-metadata`);
  }

  const fields = form.props.fields
    .map(normalizeFieldDefinition)
    .map(def => augmentPatternWithEntityType(def, entityTypeIri));
  const fieldByIri = Immutable.Map(
    fields.map(f => [f.iri, f] as [string, FieldDefinition])
  );
  const labelField = fieldByIri.get(labelIri);
  const typeField = fieldByIri.get(typeIri);
  const imageField = fieldByIri.get(imageIri);

  if (!labelField) {
    throw new Error(`Missing field definition for label field <${labelIri}>`);
  }
  if (!typeField) {
    throw new Error(`Missing field definition for type field <${typeIri}>`);
  }

  const formChildren = Children.toArray(form.props.children).filter(child => {
    const mapping = mapChildToComponent(child);
    return !mapping || !FieldMapping.isComposite(mapping);
  });
  const forceFields = forceIris ? fields.filter(f => forceIris.indexOf(f.iri) >= 0) : [];
  const metadata: EntityMetadata = {
    parent,
    entityType: entityTypeIri as ElementTypeIri,
    labelField,
    typeField,
    imageField,
    fieldById: Immutable.Map(
      fields.map(f => [f.id, f] as [string, FieldDefinition])
    ),
    fieldByIri,
    newSubjectTemplate: form.props.newSubjectTemplate,
    formChildren,
    forceFields: Immutable.Map(
      forceFields.map(f => [f.iri, f] as [string, FieldDefinition])
    ),
  };

  validateFormFieldsDatatype(form.props.children, metadata);

  collectedMetadata.set(metadata.entityType, metadata);
  collectMetadataFromMarkup(form.props.children, metadata.entityType, collectedMetadata);
}

function validateFormFieldsDatatype(children: ReactNode | undefined, metadata: EntityMetadata) {
  if (!children) { return; }
  Children.forEach(children, child => {
    const mapping = mapChildToComponent(child);
    if (!mapping || FieldMapping.isComposite(mapping)) { return; }
    if (FieldMapping.isInput(mapping)) {
      const field = metadata.fieldById.get(mapping.props.for);
      if (isObjectProperty(field, metadata)) {
        throw new Error(`XSD Datatype of the field <${field.iri}> isn't literal`);
      }
    } else if (FieldMapping.isOtherElement(mapping)) {
      validateFormFieldsDatatype(mapping.children, metadata);
    }
  });
}

function collectMetadataFromMarkup(
  children: ReactNode | undefined,
  parentType: ElementTypeIri,
  collectedMetadata: Map<ElementTypeIri, EntityMetadata>
) {
  if (!children) { return; }
  React.Children.forEach(children, child => {
    if (isValidChild(child)) {
      if (componentHasType(child, CompositeInput)) {
        const parent: EntityParent = {
          type: parentType,
          fieldIri: (child.props as CompositeInputProps).for,
        };
        collectMetadataFromFormOrComposite(child, parent, collectedMetadata);
      } else {
        collectMetadataFromMarkup(child.props.children, parentType, collectedMetadata);
      }
    }
  });
}

interface EntityFormAndMetadata {
  form: ReactElement<ResourceEditorFormProps | CompositeInputProps>;
  metadataElement: ReactElement<OntodiaEntityMetadataProps>;
}

function extractEntityFormAndMetadata(
  entityForm: ReactElement<ResourceEditorFormProps | CompositeInputProps>
): EntityFormAndMetadata {
  const children = Children.toArray(entityForm.props.children);
  const metadataElement = children.find(
    child => componentHasType(child, OntodiaEntityMetadata)
  ) as ReactElement<OntodiaEntityMetadataProps> | undefined;
  if (!metadataElement) {
    throw new Error(`Entity form should have a single semantic-entity-metadata as direct child`);
  }
  const filteredChildren = universalChildren(children.filter(child => child !== metadataElement));
  const form = React.cloneElement(entityForm, {}, filteredChildren);
  return {form, metadataElement};
}

function augmentPatternWithEntityType(
  field: FieldDefinition,
  entityTypeIri: string
): FieldDefinition {
  const query = SparqlUtil.parseQuery(field.selectPattern);
  if (query.type !== 'query') {
    return field;
  }
  query.where.unshift({
    type: 'bgp',
    triples: [{
      subject: '?subject' as SparqlJs.Term,
      predicate: rdf.type.value as SparqlJs.Term,
      object: entityTypeIri as SparqlJs.Term,
    }]
  });
  const selectPattern = SparqlUtil.serializeQuery(query);
  return {...field, selectPattern};
}

export function isObjectProperty(field: FieldDefinition, metadata: EntityMetadata) {
  const isImageField = metadata.imageField && metadata.imageField.iri === field.iri;
  const isForceField = metadata.forceFields.has(field.iri);
  return !isImageField && !isForceField &&
    (!field.xsdDatatype || xsd.anyURI.equals(field.xsdDatatype));
}

export default OntodiaEntityMetadata;
