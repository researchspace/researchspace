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

import * as _ from 'lodash';

import { Rdf, XsdDataTypeValidation } from 'platform/api/rdf';
import { xsd } from 'platform/api/rdf/vocabularies/vocabularies';

import { selectPreferredLabel } from 'platform/api/services/language';

import {
  ComplexTreePatterns, LightwightTreePatterns,
} from 'platform/components/semantic/lazy-tree';

export interface FieldDefinition {
  /**
   * Unique identifier of the field definition,
   * in most cases it will be the IRI of the field definition, but might be an alias as well.
   */
  id: string;

  /**
   * IRI of field definition.
   */
  iri?: string;

  /**
   * Label used for refering to field on form (e.g. {@link FormErrors}) and
   * rendering the field, for example as an HTML input label before the input element.
   */
  label?: ReadonlyArray<Rdf.Literal>;
  /**
   * Description of a field, might be rendered e.g. onHover or
   * as an info icon next to the field.
   */
  description?: string;
  /**
   * A set of categories as additional metadata for improved organisation.
   */
  categories: ReadonlyArray<Rdf.Iri>;
  /**
   * Domain restriction on classes this field applicable to.
   */
  domain?: ReadonlyArray<Rdf.Iri>;
  /**
   * A full or prefix XSD IRI datatype identifier as specified in RDF 1.1
   * https://www.w3.org/TR/rdf11-concepts/#xsd-datatypes
   */
  xsdDatatype?: Rdf.Iri;
  /**
   * Range restriction on allowed classes of objects for the field values.
   * Only applicable if `xsdDatatype` is `xsd:anyURI`.
   */
  range?: ReadonlyArray<Rdf.Iri>;
  /**
   * XSD schema minimum cardinality (including).
   */
  minOccurs: number;
  /**
   * XSD schema maximum cardinality (including).
   */
  maxOccurs: number;
  /**
   * Number used for ordering Field Definition.
   */
  order: number;
  /**
   * List of default values assigned to field.
   */
  defaultValues: ReadonlyArray<string>;
  /**
   * SparQL SELECT query string to read initial values for the field.
   *
   * Query bindings:
   *   $subject refers to the current entity.
   * Exposed projection variables:
   *   value: (required) as intial value of the field;
   *   label: (optional) as label of this value;
   *   further projection variables might be exposed
   *     to format the rendering within the input element.
   */
  selectPattern?: string;
  /**
   * Constraints (SparQL ASK queries) to validate values entered by
   * the user against the database.
   */
  constraints: ReadonlyArray<FieldConstraint>;
  /**
   * SparQL SELECT query to generate a fixed list (choices) of values
   * that the user may choose from.
   *
   * Exposed projection variables:
   *   value: (required) as initial value of the field;
   *   label: (optional) as label of this value;
   *   further projection variables might be exposed
   *     to format the rendering within the input element.
   */
  valueSetPattern?: string;
  /**
   * SparQL DELETE query to remove previous value from the database
   * before inserting a new one.
   *
   * Query bindings:
   *   $subject refers to the current entity;
   *   $value refers to value to remove.
   */
  deletePattern?: string;
  /**
   * SparQL INSERT query to add new value to the database.
   *
   * Query bindings:
   *   $subject refers to the current entity;
   *   $value refers to value to insert.
   */
  insertPattern?: string;
  /**
   * SparQL SELECT query to generate a dynamic suggestion list based on
   * textindex or regex search.
   *
   * Query bindings:
   *   $token refers to text token the user is typing.
   * Exposed projection variables:
   *   value: (required) as initial value of the field;
   *   label: (optional) as label of this value;
   *   further projection variables might be exposed
   *     to format the rendering within the input element.
   */
  autosuggestionPattern?: string;
  /**
   * Sparql configuration to select terms from an hierarchical thesaurus.
   * Can be either `simple` or `full` (specified in the `type` attribute).
   */
  treePatterns?: TreeQueriesConfig;

  /**
   * Test subject IRI that is used for forms preview in the field editor.
   */
  testSubject?: Rdf.Iri;
}

/** @see FieldDefinition */
export interface FieldDefinitionProp {
  id: string;
  iri?: string;
  label?: string | ReadonlyArray<Rdf.Literal>;
  description?: string;
  categories?: ReadonlyArray<string | Rdf.Iri>;
  domain?: string | Rdf.Iri | ReadonlyArray<string | Rdf.Iri>;
  xsdDatatype?: string | Rdf.Iri;
  range?: string | Rdf.Iri | ReadonlyArray<string | Rdf.Iri>;
  minOccurs?: number | 'unbound';
  maxOccurs?: number | 'unbound';
  order?: number | 'unbound';
  defaultValues?: ReadonlyArray<string>;
  selectPattern?: string;
  askPattern?: string;
  constraints?: ReadonlyArray<FieldConstraint>;
  valueSetPattern?: string;
  deletePattern?: string;
  insertPattern?: string;
  autosuggestionPattern?: string;
  treePatterns?: TreeQueriesConfig;
  testSubject?: string | Rdf.Iri;
}

export interface FieldConstraint {
  validatePattern: string;
  message: string;
}

export type TreeQueriesConfig = SimpleTreeConfig | FullTreeConfig;

export interface SimpleTreeConfig extends LightwightTreePatterns {
  type: 'simple';
}

export interface FullTreeConfig extends ComplexTreePatterns {
  type: 'full';
}

export function normalizeFieldDefinition(
  definitionProp: FieldDefinitionProp,
): FieldDefinition {
  const definition: { [K in keyof FieldDefinitionProp]?: any } = _.cloneDeep(definitionProp);

  if (typeof definition.label === 'string') {
    definition.label = [Rdf.langLiteral(definition.label, '')];
  }

  if (Array.isArray(definition.categories)) {
    definition.categories = definition.categories.map(category =>
      typeof category === 'string' ? Rdf.iri(category) : category);
  } else {
    definition.categories = [];
  }

  if (!definition.minOccurs || definition.minOccurs === 'unbound') {
    definition.minOccurs = 0;
  } else {
    definition.minOccurs = parseInt(definition.minOccurs, 10);
  }

  if (!definition.maxOccurs || definition.maxOccurs === 'unbound') {
    definition.maxOccurs = Infinity;
  } else {
    definition.maxOccurs = parseInt(definition.maxOccurs, 10);
  }

  if (!definition.order || definition.order === 'unbound') {
    definition.order = 0;
  } else {
    definition.order = parseInt(definition.order, 10);
  }

  if (typeof definition.domain === 'string') {
    definition.domain = [Rdf.iri(definition.domain)];
  } else if (Array.isArray(definition.domain)) {
    definition.domain = definition.domain.map(domain => {
      if (typeof domain === 'string') {
        return Rdf.iri(domain);
      }
      return domain;
    });
  }

  if (typeof definition.range === 'string') {
    definition.range = Rdf.iri(definition.range);
  } else if (Array.isArray(definition.range)) {
    definition.range = definition.range.map(range => {
      if (typeof range === 'string') {
        return Rdf.iri(range);
      }
      return range;
    });
  }

  if (typeof definition.xsdDatatype === 'string') {
    const datatype = XsdDataTypeValidation.parseXsdDatatype(definition.xsdDatatype);
    definition.xsdDatatype = datatype
      ? datatype.iri : Rdf.iri(definition.xsdDatatype);
  }

  if (definition.xsdDatatype) {
    definition.xsdDatatype = XsdDataTypeValidation.replaceDatatypeAliases(definition.xsdDatatype);
  } else if (definition.range) {
    definition.xsdDatatype = xsd.anyURI;
  }

  if (!definition.defaultValues) {
    definition.defaultValues = [];
  }

  if (typeof definition.testSubject === 'string') {
    definition.testSubject = Rdf.iri(definition.testSubject);
  }

  if (typeof definition.askPattern === 'string') {
    const sparqlAskContraint = {
      validatePattern: definition.askPattern,
      message: 'Value does not pass the SPARQL ASK test.',
    };
    if (Array.isArray(definition.constraints)) {
      definition.constraints.push(sparqlAskContraint);
    } else {
      definition.constraints = [sparqlAskContraint];
    }
  } else if (!Array.isArray(definition.constraints)) {
    definition.constraints = [];
  }
  return definition as FieldDefinition;
}

// tslint:disable-next-line:no-unused-variable
function compileTimeAssertDefinitionAssignableToProp(): FieldDefinitionProp {
  const definition: FieldDefinition = {} as any;
  // Checks `FieldDefinition` -> `FieldDefinitionProp` assignment compatibility.
  // (It should be possible to pass "normalized" definition to another component.)
  return definition;
}


export function getPreferredLabel(
  label: string | ReadonlyArray<Rdf.Literal> | undefined
): string | undefined {
  if (typeof label === 'undefined' || typeof label === 'string') {
    return label;
  }
  const selected = selectPreferredLabel(label);
  return selected ? selected.value : undefined;
}
