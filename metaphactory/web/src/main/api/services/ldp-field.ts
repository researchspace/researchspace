/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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
import { Just, Nothing } from 'data.maybe';

import { LdpService } from 'platform/api/services/ldp';
import { Rdf, vocabularies } from 'platform/api/rdf';
const { sp, field, rdfs, VocabPlatform } = vocabularies;

import {
  FieldDefinition, FieldDefinitionProp, normalizeFieldDefinition
} from 'platform/components/forms/FieldDefinition';

export function getFieldDefinitionProp(
  fieldIri: Rdf.Iri
): Kefir.Property<FieldDefinitionProp> {
   const ldp = new LdpService(
     vocabularies.VocabPlatform.FieldDefinitionContainer.value
   );
  return ldp.get(fieldIri).map(graph => deserialize(fieldIri, graph));
}


export function getFieldDefinition(
  fieldIri: Rdf.Iri
): Kefir.Property<FieldDefinition> {
  return getFieldDefinitionProp(fieldIri).map(normalizeFieldDefinition);
}

function deserialize(fieldIri: Rdf.Iri, graph: Rdf.Graph): FieldDefinitionProp {
  const predicates = {
    description: [rdfs.comment],
    domain: [field.domain],
    xsdDatatype: [field.xsd_datatype],
    range: [field.range],
    minOccurs: [field.min_occurs],
    maxOccurs: [field.max_occurs],
    selectPattern: [field.select_pattern, sp.text],
    deletePattern: [field.delete_pattern, sp.text],
    askPattern: [field.ask_pattern, sp.text],
    valueSetPattern: [field.valueset_pattern, sp.text],
    autosuggestionPattern: [field.autosuggestion_pattern, sp.text],
    testSubject: [field.testsubject],
    insertPattern: [field.insert_pattern, sp.text],
    label: [rdfs.label],
  };

  const pg = Rdf.pg(fieldIri, graph);
  // TODO can we iterate over object values and don't loose type information for keys here?
  // after this transformation we get {[key: string]: string} which is not perfect
  const partialField =
    _.mapValues(
      predicates,
      propertyPath =>
        Rdf.getValueFromPropertyPath(propertyPath, pg)
          .map(n => n.value)
          .getOrElse(undefined)
    );

  const defaultValues = Rdf.getValuesFromPropertyPath([field.default_value], pg).map(v => v.value);
  const categories = Rdf.getValuesFromPropertyPath<Rdf.Iri>([field.category], pg);
  const treePatterns = Rdf.getValueFromPropertyPath([field.tree_patterns], pg).chain(config => {
    if (!(config.isLiteral() && config.dataType.equals(VocabPlatform.SyntheticJsonDatatype))) {
      return Nothing();
    }
    try {
      return Just(JSON.parse(config.value));
    } catch (e) {
      return Nothing();
    }
  }).getOrElse(undefined);

  return {
    id: fieldIri.value,
    ...partialField,
    categories,
    defaultValues,
    treePatterns,
  } as FieldDefinitionProp;
}
