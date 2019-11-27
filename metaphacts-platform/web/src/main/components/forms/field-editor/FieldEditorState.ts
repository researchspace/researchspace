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

import * as Kefir from 'kefir';
import { mapValues, isEmpty, forEach } from 'lodash';
import { fromNullable } from 'data.maybe';

import { ConfigHolder } from 'platform/api/services/config-holder';
import { getFieldDefinitionProp } from 'platform/api/services/ldp-field';
import { Rdf, vocabularies } from 'platform/api/rdf';
const { sp, field, rdf, rdfs, xsd, VocabPlatform } = vocabularies;

import { TreeQueriesConfig } from 'platform/components/forms';
import { ComplexTreePatterns } from 'platform/components/semantic/lazy-tree';

/**
 * Component state interface as used by the {@FieldEditorComponent}
 */
export interface State {
  id?: Data.Maybe<Value>;
  label?: ReadonlyArray<LocalizedValue>;
  description?: Data.Maybe<Value>;
  categories?: ReadonlyArray<Rdf.Iri>;
  domain?: ReadonlyArray<Value>;
  xsdDatatype?: Data.Maybe<Value>;
  range?: ReadonlyArray<Value>;
  min?: Data.Maybe<Value>;
  max?: Data.Maybe<Value>;
  defaults?: ReadonlyArray<Value>;
  testSubject?: Data.Maybe<Value>;

  selectPattern?: Data.Maybe<Value>;
  insertPattern?: Data.Maybe<Value>;
  deletePattern?: Data.Maybe<Value>;
  askPattern?: Data.Maybe<Value>;
  valueSetPattern?: Data.Maybe<Value>;
  autosuggestionPattern?: Data.Maybe<Value>;
  treePatterns?: Data.Maybe<ValidatedTreeConfig>;

  isLoading?: boolean;
  isValid?: boolean;
  categoryQueries?: ComplexTreePatterns;
}

/**
 * Representation of an value as being hold by the {@State} fields.
 * A valid value is a value object without error.
 * Nothing is represented explicitly using data.maybe.
 */
export interface Value {
  value: string;
  error?: Error;
}

export interface LocalizedValue {
  value: Value;
  lang: string;
}

export type ValidatedTreeConfig = ValidatedSimpleTreeConfig | ValidatedFullTreeConfig;

export interface ValidatedSimpleTreeConfig {
  readonly type: 'simple';
  readonly schemePattern?: Value;
  readonly relationPattern?: Value;
}

export interface ValidatedFullTreeConfig {
  readonly type: 'full';
  readonly rootsQuery?: Value;
  readonly childrenQuery?: Value;
  readonly parentsQuery?: Value;
  readonly searchQuery?: Value;
}

export namespace ValidatedTreeConfig {
  export function wrap(config: TreeQueriesConfig): ValidatedTreeConfig {
    if (config.type === 'simple') {
      return {
        type: 'simple',
        schemePattern: asValue(config.schemePattern),
        relationPattern: asValue(config.relationPattern),
      };
    } else {
      return {
        type: 'full',
        rootsQuery: asValue(config.rootsQuery),
        childrenQuery: asValue(config.childrenQuery),
        parentsQuery: asValue(config.parentsQuery),
        searchQuery: asValue(config.searchQuery),
      };
    }
  }

  function asValue(value: string | object | undefined): Value | undefined {
    return typeof value === 'string' ? {value} : undefined;
  }

  export function unwrap(config: ValidatedTreeConfig): TreeQueriesConfig {
    if (config.type === 'simple') {
      const {schemePattern, relationPattern} = config;
      return {
        type: 'simple',
        schemePattern: schemePattern ? schemePattern.value : undefined,
        relationPattern: relationPattern ? relationPattern.value : undefined,
      };
    } else {
      const {rootsQuery, childrenQuery, parentsQuery, searchQuery} = config;
      return {
        type: 'full',
        rootsQuery: rootsQuery.value,
        childrenQuery: childrenQuery.value,
        parentsQuery: parentsQuery.value,
        searchQuery: searchQuery.value,
      };
    }
  }
}

/**
 * Transforms supplied attributes of a field definition into a graph
 * (i.e. collection of triples) as a RDF based serialization of the field definition.
 *
 * @param  {string} id - full IRI string of the field defintion identifier
 * @param  {string} label - label string
 * @param  {string} insert - SPARQL insertPattern string
 * @param  {string} description - description string
 * @param  {string} xsdtype - xsdDatatype full IRI string
 * @param  {string} min - minOccurs
 * @param  {string} max - maxOccurs
 * @param  {string} defaults - defaultValues
 * @param  {string} selectPattern - SPARQL selectPattern string
 * @param  {string} del - SPARQL deletePattern string
 * @param  {string} ask - SPARQL askPattern string
 * @param  {string} valueset - SPARQL valuesetPattern string
 * @param  {string} auto - SPARQL autosuggestionPattern string
 * @param  {string} subject - test subject full IRI string
 * @return {Graph}
 */
export function createFieldDefinitionGraph(properties: {
  id: string;
  label: ReadonlyArray<Rdf.Literal>;
  description: string | undefined;
  categories: ReadonlyArray<Rdf.Iri>;
  domain: ReadonlyArray<string>;
  xsdDatatype: string | undefined;
  range: ReadonlyArray<string>;
  min: string | undefined;
  max: string | undefined;
  defaultValues: ReadonlyArray<string>;
  selectPattern: string | undefined;
  insertPattern: string;
  deletePattern: string | undefined;
  askPattern: string | undefined;
  valueSetPattern: string | undefined;
  autosuggestionPattern: string | undefined;
  treePatterns: TreeQueriesConfig | undefined;
  testSubject: string | undefined;
}): Rdf.Graph {
  const {
    id, label, description, domain, xsdDatatype, range, min, max, defaultValues, testSubject,
    selectPattern, insertPattern, deletePattern, askPattern, valueSetPattern, autosuggestionPattern,
    categories, treePatterns,
  } = properties;

  const triples = new Array<Rdf.Triple>();
  // empty IRI will be resolved in LDP later through baseIRI
  const baseIri = Rdf.iri('');
  /*
   * create field, basic information
   */
  triples.push(Rdf.triple(baseIri, rdf.type, field.Field ));
  label.forEach(lbl => triples.push(Rdf.triple(baseIri, rdfs.label, lbl)));
  if (description && description.length > 0) {
    triples.push(Rdf.triple(baseIri, rdfs.comment, Rdf.literal(description, xsd._string) ));
  }
  /*
   * adding triples for insert pattern
   */
  const bInsert = Rdf.bnode();
  triples.push(Rdf.triple(baseIri, field.insert_pattern, bInsert ));
  triples.push(Rdf.triple(bInsert, rdf.type, sp.Query ));
  triples.push(Rdf.triple(bInsert, sp.text, Rdf.literal(insertPattern, xsd._string) ));
  for (const value of domain) {
    triples.push(Rdf.triple(baseIri, field.domain, Rdf.iri(value)));
  }
  if (xsdDatatype) {
    triples.push(Rdf.triple(baseIri, field.xsd_datatype, Rdf.iri(xsdDatatype) ));
  }
  for (const value of range) {
    triples.push(Rdf.triple(baseIri, field.range, Rdf.iri(value)));
  }
  if (min) {
    triples.push(Rdf.triple(baseIri, field.min_occurs, Rdf.literal(min, xsd._string) ));
  }
  if (max) {
    triples.push(Rdf.triple(baseIri, field.max_occurs, Rdf.literal(max, xsd._string) ));
  }
  for (const value of defaultValues) {
    triples.push(Rdf.triple(baseIri, field.default_value, Rdf.literal(value, xsd._string)));
  }
  if (categories && !isEmpty(categories)) {
    forEach(
      categories,
      category => triples.push(Rdf.triple(baseIri, field.category, category))
    );
  }
  if (selectPattern && selectPattern.length > 0) {
    const bSelect = Rdf.bnode();
    triples.push(Rdf.triple(baseIri, field.select_pattern, bSelect ));
    triples.push(Rdf.triple(bSelect, rdf.type, sp.Query ));
    triples.push(Rdf.triple(bSelect, sp.text, Rdf.literal(selectPattern, xsd._string) ));
  }
  if (askPattern && askPattern.length > 0) {
    const bAsk = Rdf.bnode();
    triples.push(Rdf.triple(baseIri, field.ask_pattern, bAsk ));
    triples.push(Rdf.triple(bAsk, rdf.type, sp.Query ));
    triples.push(Rdf.triple(bAsk, sp.text, Rdf.literal(askPattern, xsd._string) ));
  }
  if (deletePattern && deletePattern.length > 0) {
    const bDelete = Rdf.bnode();
    triples.push(Rdf.triple(baseIri, field.delete_pattern, bDelete ));
    triples.push(Rdf.triple(bDelete, rdf.type, sp.Query ));
    triples.push(Rdf.triple(bDelete, sp.text, Rdf.literal(deletePattern, xsd._string) ));
  }
  if (valueSetPattern && valueSetPattern.length > 0) {
    const bValueset = Rdf.bnode();
    triples.push(Rdf.triple(baseIri, field.valueset_pattern, bValueset ));
    triples.push(Rdf.triple(bValueset, rdf.type, sp.Query ));
    triples.push(Rdf.triple(bValueset, sp.text, Rdf.literal(valueSetPattern, xsd._string) ));
  }
  if (autosuggestionPattern && autosuggestionPattern.length > 0) {
    const bAuto = Rdf.bnode();
    triples.push(Rdf.triple(baseIri, field.autosuggestion_pattern, bAuto ));
    triples.push(Rdf.triple(bAuto, rdf.type, sp.Query ));
    triples.push(Rdf.triple(bAuto, sp.text, Rdf.literal(autosuggestionPattern, xsd._string) ));
  }
  if (testSubject) {
    triples.push(Rdf.triple(baseIri, field.testsubject, Rdf.iri(testSubject) ));
  }
  if (treePatterns) {
    const treePatternsJson = JSON.stringify(treePatterns, null, 2);
    triples.push(Rdf.triple(baseIri, field.tree_patterns,
      Rdf.literal(treePatternsJson, VocabPlatform.SyntheticJsonDatatype)));
  }

  return Rdf.graph(triples);
}
/**
 * De-serialized the supplied field definition graph into an state object for
 * the {@FieldEditorComponent}
 * @param  {Iri}   fieldIri IRI of the field definition
 * @param  {Graph} graph    Graph i.e. collection of statements with all field definition attributes
 * @return {State}
 */
export function getFieldDefitionState(fieldIri: Rdf.Iri): Kefir.Property<State> {
  // shortcut function to convert a string to value object
  const createValue = (value: string): Value => {
    return {value: value};
  };

  return getFieldDefinitionProp(fieldIri).map(
    (fieldDef): State => {
      const {preferredLanguages} = ConfigHolder.getUIConfig();
      const label: Array<LocalizedValue> = [];
      if (fieldDef.label !== undefined) {
        if (typeof fieldDef.label === 'string') {
          label.push({value: createValue(fieldDef.label), lang: ''});
        } else {
          fieldDef.label.forEach(({value, language}) =>
            label.push({value: createValue(value), lang: language})
          );
        }
      }
      label.sort((a, b) => {
        const indexA = preferredLanguages.indexOf(a.lang);
        const indexB = preferredLanguages.indexOf(b.lang);
        return indexA - indexB;
      });

      let domain: ReadonlyArray<Value> = [];
      let range: ReadonlyArray<Value> = [];

      if (typeof fieldDef.domain === 'string') {
        domain = [createValue(fieldDef.domain)];
      } else if (Array.isArray(fieldDef.domain)) {
        domain = fieldDef.domain.map(createValue) as ReadonlyArray<Value>;
      }

      if (typeof fieldDef.range === 'string') {
        range = [createValue(fieldDef.range)];
      } else if (Array.isArray(fieldDef.range)) {
        range = fieldDef.range.map(createValue) as ReadonlyArray<Value>;
      }
      return {
        isLoading: false,
        id: fromNullable(fieldIri.value).map(createValue),
        label,
        description: fromNullable(fieldDef.description).map(createValue),
        categories: fieldDef.categories as ReadonlyArray<Rdf.Iri>,
        domain,
        xsdDatatype: fromNullable(fieldDef.xsdDatatype).map(createValue),
        range,
        min: fromNullable(fieldDef.minOccurs as string).map(createValue),
        max: fromNullable(fieldDef.maxOccurs as string).map(createValue),
        defaults: fieldDef.defaultValues.map(createValue) as ReadonlyArray<Value>,
        testSubject: fromNullable(fieldDef.testSubject).map(createValue),
        insertPattern: fromNullable(fieldDef.insertPattern).map(createValue),
        selectPattern: fromNullable(fieldDef.selectPattern).map(createValue),
        askPattern: fromNullable(fieldDef.askPattern).map(createValue),
        deletePattern: fromNullable(fieldDef.deletePattern).map(createValue),
        valueSetPattern: fromNullable(fieldDef.valueSetPattern).map(createValue),
        autosuggestionPattern: fromNullable(fieldDef.autosuggestionPattern).map(createValue),
        treePatterns: fromNullable(fieldDef.treePatterns).map(ValidatedTreeConfig.wrap),
      };
    }
  );
}

export function unwrapState(state: State) {
  const {
    id, label, description, categories, domain, xsdDatatype, range, min, max, defaults, testSubject,
    selectPattern, insertPattern, deletePattern, askPattern, valueSetPattern, autosuggestionPattern,
    treePatterns,
  } = state;
  const fields = {
    id, description, xsdDatatype, min, max, testSubject, selectPattern,
    insertPattern, deletePattern, askPattern, valueSetPattern, autosuggestionPattern,
  };
  type Unwrapped = { [K in keyof typeof fields]: string | undefined } & {
    label: ReadonlyArray<Rdf.Literal>,
    categories: ReadonlyArray<Rdf.Iri>,
    domain: ReadonlyArray<string>,
    range: ReadonlyArray<string>,
    defaultValues: ReadonlyArray<string>,
    treePatterns: TreeQueriesConfig,
  };
  const mapped = mapValues(
    fields, value => value.map(v => v.value).getOrElse(undefined)
  ) as Unwrapped;
  mapped.label = label.map(({value, lang}) => Rdf.langLiteral(value.value, lang));
  mapped.categories = categories;
  mapped.domain = domain.map(v => v.value);
  mapped.range = range.map(v => v.value);
  mapped.defaultValues = defaults.map(v => v.value);
  mapped.treePatterns = treePatterns.map(ValidatedTreeConfig.unwrap).getOrElse(undefined);
  return mapped;
}
