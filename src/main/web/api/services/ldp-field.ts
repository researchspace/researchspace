/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as _ from 'lodash';
import { Just, Nothing } from 'data.maybe';
import * as Kefir from 'kefir';

import { requestAsProperty } from 'platform/api/async';
import * as request from 'platform/api/http';
import { Rdf, vocabularies } from 'platform/api/rdf';

import { LdpService } from 'platform/api/services/ldp';
import { getLabels } from 'platform/api/services/resource-label';

const { sp, field, rdfs, VocabPlatform } = vocabularies;

import {
  FieldDefinition,
  FieldDefinitionProp,
  normalizeFieldDefinition,
} from 'platform/components/forms/FieldDefinition';

export function getFieldDefinitionProp(fieldIri: Rdf.Iri): Kefir.Property<FieldDefinitionProp> {
  const ldp = new LdpService(vocabularies.VocabPlatform.FieldDefinitionContainer.value);
  return ldp.get(fieldIri).map((graph) => deserialize(fieldIri, graph));
}

export function getFieldDefinition(fieldIri: Rdf.Iri): Kefir.Property<FieldDefinition> {
  return getFieldDefinitionProp(fieldIri).map(normalizeFieldDefinition);
}

function deserialize(fieldIri: Rdf.Iri, graph: Rdf.Graph): FieldDefinitionProp {
  const predicates = {
    description: [rdfs.comment],
    xsdDatatype: [field.xsd_datatype],
    minOccurs: [field.min_occurs],
    maxOccurs: [field.max_occurs],
    order: [field.order],
    selectPattern: [field.select_pattern, sp.text],
    deletePattern: [field.delete_pattern, sp.text],
    askPattern: [field.ask_pattern, sp.text],
    valueSetPattern: [field.valueset_pattern, sp.text],
    autosuggestionPattern: [field.autosuggestion_pattern, sp.text],
    testSubject: [field.testsubject],
    insertPattern: [field.insert_pattern, sp.text],
  };

  const pg = Rdf.pg(fieldIri, graph);
  // TODO can we iterate over object values and don't loose type information for keys here?
  // after this transformation we get {[key: string]: string} which is not perfect
  const partialField = _.mapValues(predicates, (propertyPath) =>
    Rdf.getValueFromPropertyPath(propertyPath, pg)
      .map((n) => n.value)
      .getOrElse(undefined)
  );

  const label = Rdf.getValuesFromPropertyPath([rdfs.label], pg).map((v) => v as Rdf.Literal);
  const domain = Rdf.getValuesFromPropertyPath([field.domain], pg).map((v) => v.value);
  const range = Rdf.getValuesFromPropertyPath([field.range], pg).map((v) => v.value);
  const defaultValues = Rdf.getValuesFromPropertyPath([field.default_value], pg).map((v) => v.value);
  const categories = Rdf.getValuesFromPropertyPath<Rdf.Iri>([field.category], pg);
  const treePatterns = Rdf.getValueFromPropertyPath([field.tree_patterns], pg)
    .chain((config) => {
      if (!(config.isLiteral() && config.datatype.equals(VocabPlatform.SyntheticJsonDatatype))) {
        return Nothing();
      }
      try {
        return Just(JSON.parse(config.value));
      } catch (e) {
        return Nothing();
      }
    })
    .getOrElse(undefined);

  return {
    id: fieldIri.value,
    label,
    ...partialField,
    categories,
    domain,
    range,
    defaultValues,
    treePatterns,
  } as FieldDefinitionProp;
}

const FIELDS_REST_PATH = '/rest/fields/definitions';

export function getGeneratedFieldDefinitions(iris: ReadonlyArray<Rdf.Iri>): Kefir.Property<FieldDefinitionProp[]> {
  if (iris.length === 0) {
    return Kefir.constant([]);
  }
  const req = request
    .post(FIELDS_REST_PATH)
    .send({
      fields: iris.map((iri) => iri.value),
    })
    .type('application/json')
    .accept('application/json');

  return requestAsProperty(req)
    .map((res) => JSON.parse(res.text) as FieldDefinitionProp[])
    .flatMap((fields) => {
      return getLabels(
        fields.filter((f) => f.label === undefined || f.label === null).map((f) => Rdf.iri(f.iri)),
        { context: {} }
      ).map((labels) => {
        return fields.map((f) => ({
          ...f,
          label: labels.get(Rdf.iri(f.iri)),
        }));
      });
    })
    .toProperty();
}
