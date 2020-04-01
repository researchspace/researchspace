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

import * as uuid from 'uuid';
import * as Immutable from 'immutable';
import * as Kefir from 'kefir';
import * as URI from 'urijs';
import { escapeRegExp } from 'lodash';

import { Rdf, XsdDataTypeValidation, vocabularies } from 'platform/api/rdf';

import { FieldDefinition } from './FieldDefinition';
import {
  FieldValue, FieldError, ErrorKind, CompositeValue, FieldState, AtomicValue,
} from './FieldValues';
import { FieldMapping, InputMapping } from './FieldMapping';
import { validate, queryValues, restoreLabel } from './QueryValues';

export interface CompositeChange {
  (value: CompositeValue): CompositeValue;
}

const DEFALUT_SUBJECT_TEMPLATE = '{{UUID}}';

type SubjectReplacer = (placeholder: Placeholder, composite?: CompositeValue) => string;

type Placeholder =
  { type: 'UUID' } |
  { type: 'FieldValue'; id: string };

export function generateSubjectByTemplate(
  template: string | undefined,
  ownerSubject: Rdf.Iri | undefined,
  composite: CompositeValue | undefined,
  replacer: SubjectReplacer = makeDefaultSubjectReplacer()
): Rdf.Iri {
  if (composite && !CompositeValue.isPlaceholder(composite.subject)) {
    return composite.subject;
  }

  const iriTemplate = template || DEFALUT_SUBJECT_TEMPLATE;
  const subject = iriTemplate.replace(/{{([^{}]+)}}/g, (match, placeholder) => {
    const p: Placeholder = (
      placeholder === 'UUID' ? {type: 'UUID'} :
      {type: 'FieldValue', id: placeholder}
    );
    return replacer(p, composite);
  });

  const isAbsoluteUri = URI(subject).scheme();
  if (isAbsoluteUri || !ownerSubject) {
    return Rdf.iri(subject);
  }

  const combinedPath = URI.joinPaths(ownerSubject.value, subject).toString();
  return Rdf.iri(URI(ownerSubject.value).pathname(combinedPath).toString());
}

export function wasIriGeneratedByTemplate(
  generatedIri: string,
  template: string,
  ownerSubject: Rdf.Iri | undefined,
  composite: CompositeValue | undefined
): boolean {
  const replacer = makeDefaultSubjectReplacer();
  const escapeTable: { [K in Placeholder['type']]: string | undefined } = {
    'UUID': uuid.v4(),
    'FieldValue': undefined,
  };
  const newGeneratedIri = generateSubjectByTemplate(
    template, ownerSubject, composite,
    (p, comp) => {
      const escaped = escapeTable[p.type];
      return escaped ? escaped : replacer(p, comp);
    }
  );
  const regexpEscaped = escapeRegExp(newGeneratedIri.value).replace(
    escapeRegExp(escapeTable.UUID),
    '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  );
  return new RegExp(regexpEscaped).test(generatedIri);
}

export function makeDefaultSubjectReplacer(): SubjectReplacer {
  return (placeholder, composite) => {
    if (placeholder.type === 'UUID') {
      return uuid.v4();
    } else if (composite && placeholder.type === 'FieldValue' && composite.definitions.has(placeholder.id)) {
      const state = composite.fields.get(placeholder.id);
      const first = (state ? state.values.first() : undefined) || FieldValue.empty;
      const valueContent = FieldValue.isAtomic(first) ? first.value.value : '';
      return encodeIri(valueContent);
    } else {
      return '';
    }
  };
}

export function readyToSubmit(
  composite: CompositeValue,
  isConsideredError: (error: FieldError) => boolean
): boolean {
  const freeOfErrors = (errors: Immutable.List<FieldError>) =>
    errors.every(error => !isConsideredError(error));

  return freeOfErrors(composite.errors) &&
    composite.fields.every(state =>
      freeOfErrors(state.errors) &&
      state.values.every(value =>
        FieldValue.isComposite(value)
        ? readyToSubmit(value, isConsideredError)
        : freeOfErrors(FieldValue.getErrors(value))
      )
    );
}

/**
 * @returns a tuple of new "loading" state of form and a promise of
 *  changes with initial field values.
 */
export function loadDefaults(
  composite: CompositeValue,
  inputs: Immutable.Map<string, ReadonlyArray<InputMapping>>
): Kefir.Stream<CompositeChange> {

  interface FetchedValues {
    def: FieldDefinition;
    values?: Immutable.List<FieldValue>;
    error?: string;
  }

  const initialValues = composite.definitions.map(def => {
    const mappings = inputs.get(def.id);
    const mapping = mappings && mappings.length > 0 ? mappings[0] : undefined;
    return loadInitialOrDefaultValues(composite.subject, def, mapping)
      .map<FetchedValues>(values => ({def, values: Immutable.List(values)}))
      .flatMapErrors<FetchedValues>(error => Kefir.constant({
        def, error: `Failed to load initial values: ${formatError(error)}`,
      }));
  }).toArray();

  if (initialValues.length === 0) {
    return noChanges();
  }

  const mergeFetchedIntoModel = (model: CompositeValue, results: FetchedValues[]) => {
    return CompositeValue.set(model, {
      fields: model.fields.withMutations(states => {
        for (const {def, values, error} of results) {
          let state = states.get(def.id);
          if (values && values.size > 0) {
            state = FieldState.set(state, {values});
          } else if (error) {
            state = FieldState.set(state, {errors: state.errors.push({
              kind: ErrorKind.Loading,
              message: error,
            })});
          }
          states.set(def.id, state);
        }
      }),
    });
  };

  return Kefir.zip(initialValues).map(results => {
    return (model: CompositeValue) => mergeFetchedIntoModel(model, results);
  });
}

function loadInitialOrDefaultValues(
  subject: Rdf.Iri, def: FieldDefinition, mapping?: InputMapping
): Kefir.Property<FieldValue[]> {
  const isPlaceholderSubject = CompositeValue.isPlaceholder(subject);
  const shouldLoadInitials = !isPlaceholderSubject && def.selectPattern;
  const shouldLoadDefaults = isPlaceholderSubject && mapping;

  const loadingValues = (
    shouldLoadInitials ? fetchInitialValues(def, subject, mapping) :
    shouldLoadDefaults ? lookForDefaultValues(def, mapping) :
    Kefir.constant([])
  );

  return loadingValues.map(values => {
    let requiredCount = Math.max(values.length, def.minOccurs);
    if (!FieldMapping.isComposite(mapping)) {
      // load at least one empty values for non-composites
      requiredCount = Math.max(requiredCount, 1);
    }
    return setSizeAndFill(values, requiredCount, FieldValue.empty);
  });
}

function fetchInitialValues(
  def: FieldDefinition, subject: Rdf.Iri, mapping: InputMapping
): Kefir.Property<FieldValue[]> {
  return queryValues(def.selectPattern, subject).map(values => {
    let fieldValues: FieldValue[] = values.map(v => FieldValue.fromLabeled(v));

    // fill loaded values with empty values to always show user at least minOccurs
    const initialValueCount = Math.max(def.minOccurs, fieldValues.length);
    fieldValues = setSizeAndFill(fieldValues, initialValueCount, FieldValue.empty);

    return fieldValues;
  });
}

function setSizeAndFill<T>(list: ReadonlyArray<T>, newSize: number, fillValue: T): Array<T> {
  const clone = [...list];
  clone.length = newSize;
  for (let i = list.length; i < newSize; i++) {
    clone[i] = fillValue;
  }
  return clone;
}

function lookForDefaultValues(
  def: FieldDefinition, mapping: InputMapping
): Kefir.Property<FieldValue[]> {
  const {defaultValue, defaultValues} = mapping.element.props;
  if (defaultValue || defaultValues) {
    const values = defaultValue ? [defaultValue] : defaultValues;
    const fieldValues = values.map(value => parseDefaultValue(value, def));
    if (fieldValues.length > 0) {
      return Kefir.zip(fieldValues).toProperty();
    }
  } else if (def.defaultValues.length > 0) {
    const fieldValues = def.defaultValues.map(value => parseDefaultValue(value, def));
    return Kefir.zip(fieldValues).toProperty();
  }
  return Kefir.constant([]);
}

function parseDefaultValue(value: string, def: FieldDefinition) {
  const atomic = createDefaultValue(value, def);
  return restoreLabel(atomic);
}

function createDefaultValue(value: string, def: FieldDefinition): AtomicValue {
  if (!def.xsdDatatype) {
    return FieldValue.fromLabeled({value: Rdf.literal(value)});
  } else if (XsdDataTypeValidation.sameXsdDatatype(def.xsdDatatype, vocabularies.xsd.anyURI)) {
    return FieldValue.fromLabeled({value: Rdf.iri(value)});
  }
  const literal = Rdf.literal(value, def.xsdDatatype);
  const {success, message} = XsdDataTypeValidation.validate(literal);
  if (success) {
    return FieldValue.fromLabeled({value: literal});
  } else {
    return AtomicValue.set(FieldValue.fromLabeled({value: literal}), {
      errors: FieldError.noErrors.push({
        kind: ErrorKind.Loading,
        message: `Default value doesn't match XSD datatype: ${message}`,
      })
    });
  }
}

/**
 * Performs validation of individual values with ({@link FieldDefinition.constrains}) queries.
 *
 * @param owner
 * @param field Definition of field to set new value to.
 * @param newValues New values of field to validate.
 *
 * @returns a promise of changes with validation result of this field.
 */
export function tryBeginValidation(
  field: FieldDefinition,
  previousComposite: CompositeValue,
  newComposite: CompositeValue
): Kefir.Stream<CompositeChange> | undefined {

  if (!field.constraints || field.constraints.length === 0) {
    return undefined;
  }

  const oldValues = previousComposite.fields.get(field.id, FieldState.empty).values;
  const newValues = newComposite.fields.get(field.id, FieldState.empty).values;

  const streams = newValues.map((value, index) => {
    const oldValue = index < oldValues.size ? oldValues.get(index) : null;
    return validate(newComposite.subject, field, oldValue, value);
  });
  const compositeChange = Kefir.zip<FieldValue>(streams.toArray()).map(validated => {
    const change: CompositeChange = (currentComposite) => {
      const current = currentComposite.fields.get(field.id);
      if (!Immutable.is(current.values, newValues)) {
        // field is changed before completion of validation, so discard result
        return currentComposite;
      }
      const fields = currentComposite.fields.update(field.id, state => FieldState.set(state, {
        values: Immutable.List(validated),
      }));
      return CompositeValue.set(currentComposite, {fields});
    };
    return change;
  });

  return compositeChange;
}

function formatError(error: any): string {
  if (typeof error === 'string') {
    return error;
  } else if (error && typeof error.message === 'string') {
    return error.message;
  } else if (error && typeof error.status === 'number') {
    return 'query error';
  } else {
    return 'unknown error occured';
  }
}

function noChanges(): Kefir.Stream<CompositeChange> {
  return Kefir.later(0, value => value);
}

export function fieldInitialState(def: FieldDefinition): FieldState {
  // display N empty fields where (minOccurs <= N <= maxOccurs)
  const valueCount = Math.min(def.minOccurs, def.maxOccurs);
  const values = Immutable.List<FieldValue>()
    .setSize(valueCount).map(() => FieldValue.empty);
  return FieldState.set(FieldState.empty, {values});
}

/**
 * Pattern to find code points to escape when encoding IRI as object ID; it matches:
 * <ul>
 *  <li> ASCII control characters and space {@code 0x00-0x20} </li>
 *  <li> common illegal path characters: &lt; &gt; : ? * " | </li>
 *  <li> path separators: / \ </li>
 *  <li> recommended to avoid by AWS S3: &amp; $ @ = ; + , # {@code 0x7f-0xFF}</li>
 *  <li> escape character: % </li>
 * </ul>
 */
const DISALLOWED_CHARACTERS = /[\u0000-\u0020<>:?*"|/\\&$@=+,#\u007f-\u00ff%\s]/ig;
const COLLAPSE_UNDERSCORES = /_+/ig;

export function encodeIri(fileName: string) {
  let transformed = fileName;
  transformed = transformed.replace(DISALLOWED_CHARACTERS, '_');
  transformed = transformed.replace(COLLAPSE_UNDERSCORES, '_');
  return transformed;
}
