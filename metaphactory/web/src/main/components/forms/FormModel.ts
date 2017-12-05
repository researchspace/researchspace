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

import * as uuid from 'uuid';
import * as Immutable from 'immutable';
import * as Kefir from 'kefir';
import * as URI from 'urijs';

import { Rdf, XsdDataTypeValidation, vocabularies } from 'platform/api/rdf';

import { FieldDefinition } from './FieldDefinition';
import {
  FieldValue, SparqlBindingValue, FieldError, ErrorKind, CompositeValue, FieldState, AtomicValue,
} from './FieldValues';
import { InputMapping } from './FieldMapping';
import { fetchInitialValues, validate, queryValues, restoreLabel } from './QueryValues';

export interface CompositeChange {
  (value: CompositeValue): CompositeValue;
}

const DEFALUT_SUBJECT_TEMPLATE = '{{UUID}}';

export function generateSubjectByTemplate(
  template: string | undefined,
  ownerSubject: Rdf.Iri | undefined,
  composite: CompositeValue,
): Rdf.Iri {
  if (!CompositeValue.isPlaceholder(composite.subject)) {
    return composite.subject;
  }
  const iriTemplate = template || DEFALUT_SUBJECT_TEMPLATE;
  const subject = iriTemplate.replace(/{{([^{}]+)}}/g, (match, placeholder) => {
    if (placeholder === 'UUID') {
      return uuid.v4();
    } else if (composite.definitions.has(placeholder)) {
      const state = composite.fields.get(placeholder);
      const first = (state ? state.values.first() : undefined) || FieldValue.empty;
      const valueContent = FieldValue.isAtomic(first) ? first.value.value : '';
      return encodeURIComponent(valueContent);
    } else {
      return '';
    }
  });

  const isAbsoluteUri = URI(subject).scheme();
  if (isAbsoluteUri || !ownerSubject) {
    return Rdf.iri(subject);
  }

  const combinedPath = URI.joinPaths(ownerSubject.value, subject).toString();
  return Rdf.iri(URI(ownerSubject.value).pathname(combinedPath).toString());
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
 *  changes with initial field values and value sets.
 */
export function loadDefaultsAndValueSets(
  composite: CompositeValue, inputs: Immutable.Map<string, InputMapping>,
): Kefir.Stream<CompositeChange> {


  interface FetchedValues {
    def: FieldDefinition;
    values?: Immutable.List<FieldValue>;
    set?: Immutable.List<SparqlBindingValue>;
    error?: string;
  }

  const initialValues = composite.definitions
    .map(def => loadInitialOrDefaultValues(composite.subject, def, inputs.get(def.id))
      .map<FetchedValues>(values => ({def, values: Immutable.List(values)}))
      .flatMapErrors<FetchedValues>(error => Kefir.constant({
        def, error: `Failed to load initial values: ${formatError(error)}`,
      }))
    ).toArray();

  const valueSets = composite.definitions
    .filter(def => Boolean(def.valueSetPattern))
    .map(def => queryValues(def.valueSetPattern, composite.subject)
      .map<FetchedValues>(set => ({def, set: Immutable.List(set)}))
      .flatMapErrors<FetchedValues>(error => Kefir.constant({
        def, error: `Failed to load value set: ${formatError(error)}`,
      }))
    ).toArray();

  const initialValuesAndSets = initialValues.concat(valueSets);
  if (initialValuesAndSets.length === 0) {
    return noChanges();
  }

  const mergeFetchedIntoModel = (model: CompositeValue, results: FetchedValues[]) => {
    return CompositeValue.set(model, {
      fields: model.fields.withMutations(states => {
        for (const {def, values, set, error} of results) {
          let state = states.get(def.id);
          if (values && values.size > 0) {
            state = FieldState.set(state, {values});
          } else if (set) {
            state = FieldState.set(state, {valueSet: set});
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

  return Kefir.zip(initialValuesAndSets).map(results => {
    return (model: CompositeValue) => mergeFetchedIntoModel(model, results);
  });
}

function loadInitialOrDefaultValues(
  subject: Rdf.Iri, def: FieldDefinition, mapping?: InputMapping
): Kefir.Property<FieldValue[]> {
  const isPlaceholderSubject = CompositeValue.isPlaceholder(subject);
  const shouldLoadInitialValues = def.selectPattern && !isPlaceholderSubject;

  const initialValuesTask = shouldLoadInitialValues
    ? fetchInitialValues(def, subject) : Kefir.constant([]);

  return initialValuesTask.flatMap(initialValues => {
    // only apply default values when creating a new entity
    if (isPlaceholderSubject && mapping) {
      return lookForDefaultValues(def, mapping);
    }
    return Kefir.constant(initialValues);
  }).toProperty();
}

function lookForDefaultValues(
  def: FieldDefinition, mapping: InputMapping
): Kefir.Property<FieldValue[]> {
  const {defaultValue, defaultValues} = mapping.props;
  if (defaultValue || defaultValues) {
    const values = defaultValue ? [defaultValue] : defaultValues;
    const fieldValues = values.map(value => parseDefaultValue(value, def));
    if (fieldValues.length > 0) {
      return Kefir.zip(fieldValues).toProperty();
    }
  } else if (def.defaultValues) {
    const fieldValues = def.defaultValues.map(value => parseDefaultValue(value, def));
    if (fieldValues.length > 0) {
      return Kefir.zip(fieldValues).toProperty();
    }
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
  newComposite: CompositeValue,
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
  // display N empty fields where (minOccurs <= 1 <= N <= maxOccurs)
  // i.e. show at least one empty field if minOccurs == 0
  const valueCount = Math.min(Math.max(def.minOccurs, 1), def.maxOccurs);
  const values = Immutable.List<FieldValue>()
    .setSize(valueCount).map(() => FieldValue.empty);
  return FieldState.set(FieldState.empty, {values});
}
