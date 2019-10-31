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

import * as Immutable from 'immutable';
import * as Kefir from 'kefir';

import { Component } from 'platform/api/components';
import { Rdf, vocabularies, XsdDataTypeValidation } from 'platform/api/rdf';

import { FieldDefinition } from '../FieldDefinition';
import {
  FieldValue, AtomicValue, CompositeValue, SparqlBindingValue, LabeledValue,
  EmptyValue, DataState, FieldError, ErrorKind,
} from '../FieldValues';

export interface SingleValueInputProps {
  /** Key to associate with FieldDefinition by name */
  for?: string;
  definition?: FieldDefinition;
  dataState?: DataState;
  value?: FieldValue;
  updateValue?: (reducer: (value: FieldValue) => FieldValue) => void;
  /** @see MultipleValuesProps.renderHeader */
  renderHeader?: boolean;
}

export abstract class SingleValueInput<P extends SingleValueInputProps, S> extends Component<P, S> {
  constructor(props: P, context: any) {
    super(props, context);
  }

  dataState(): DataState {
    return DataState.Ready;
  }

  validate(selected: FieldValue): FieldValue {
    return selected;
  }

  finalize(owner: EmptyValue | CompositeValue, value: FieldValue): Kefir.Property<FieldValue> {
    return Kefir.constant(value);
  }

  protected canEdit() {
    const dataState = this.props.dataState;
    return dataState === DataState.Ready || dataState === DataState.Verifying;
  }
}

export interface AtomicValueInputProps extends SingleValueInputProps {
  value?: AtomicValue | EmptyValue;
}

export class AtomicValueInput<P extends AtomicValueInputProps, S> extends SingleValueInput<P, S> {
  constructor(props: P, context: any) {
    super(props, context);
    this.assertAtomicOrEmpty(props.value);
  }

  componentWillReceiveProps(props: P) {
    this.assertAtomicOrEmpty(props.value);
  }

  protected setAndValidate(value: FieldValue) {
    this.props.updateValue(() => this.validate(value));
  }

  validate(selected: EmptyValue): EmptyValue;
  validate(selected: FieldValue): AtomicValue;
  validate(selected: FieldValue): AtomicValue | EmptyValue {
    const atomic = this.assertAtomicOrEmpty(selected);
    if (FieldValue.isEmpty(atomic)) { return atomic; }
    const newValue = validateType(atomic, this.props.definition.xsdDatatype);

    return AtomicValue.set(newValue, {
      // preserve non-validation errors
      errors: atomic.errors
        .filter(error => error.kind !== ErrorKind.Input &&
          error.kind !== ErrorKind.Validation)
        .toList().concat(FieldValue.getErrors(newValue)),
    });
  }

  assertAtomicOrEmpty(value: FieldValue): AtomicValue | EmptyValue {
    if (FieldValue.isEmpty(value) || FieldValue.isAtomic(value)) {
      return value;
    } else {
      throw new Error('Expected atomic or empty value');
    }
  }
}

export function validateType(
  selected: LabeledValue, datatype: Rdf.Iri | undefined
): AtomicValue | EmptyValue {
  if (!selected.value) { return FieldValue.empty; }
  if (!datatype) { return FieldValue.fromLabeled(selected); }

  if (XsdDataTypeValidation.sameXsdDatatype(datatype, vocabularies.xsd.anyURI)) {
    if (selected.value.isLiteral()) {
      const literal = selected.value as Rdf.Literal;
      return withInputError(selected,
        `Selected value is ${XsdDataTypeValidation.datatypeToString(literal.datatype)} ` +
        `where IRI expected`);
    } else {
      const validation: XsdDataTypeValidation.ValidationResult = XsdDataTypeValidation.validate(
        Rdf.literal(selected.value.value, vocabularies.xsd.anyURI)
      );
      if (validation.success) {
        return FieldValue.fromLabeled(selected);
      } else {
        return withInputError(selected, validation.message);
      }
    }
  } else {
    if (selected.value.isLiteral()) {
      const literal = selected.value as Rdf.Literal;
      const coerced = coerceTo(datatype, literal);
      if (coerced) {
        const validation = XsdDataTypeValidation.validate(coerced);
        if (validation.success) {
          return FieldValue.fromLabeled({value: coerced, label: selected.label});
        } else {
          return withInputError(
            {value: coerced, label: selected.label}, validation.message);
        }
      } else {
        return withInputError(selected,
          `XSD datatype of selected value is ` +
          `${XsdDataTypeValidation.datatypeToString(literal.datatype)} where ` +
          `${XsdDataTypeValidation.datatypeToString(datatype)} expected`);
      }
    } else {
      return withInputError(selected,
        `Selected value is IRI where ${XsdDataTypeValidation.datatypeToString(datatype)} expected`);
    }
  }
}

function coerceTo(datatype: Rdf.Iri, value: Rdf.Literal): Rdf.Literal {
  if (XsdDataTypeValidation.sameXsdDatatype(datatype, value.datatype)) {
    return value;
  } else if (XsdDataTypeValidation.sameXsdDatatype(datatype, vocabularies.xsd._string)
    && XsdDataTypeValidation.sameXsdDatatype(value.datatype, vocabularies.rdf.langString)) {
    // langString -> string
    return Rdf.literal(value.value, datatype);
  } else if (XsdDataTypeValidation.sameXsdDatatype(datatype, vocabularies.rdf.langString)
    && XsdDataTypeValidation.sameXsdDatatype(value.datatype, vocabularies.xsd._string)) {
    // string -> langString
    return value;
  } else {
    return undefined;
  }
}

function withInputError(value: LabeledValue, error: string) {
  return FieldValue.fromLabeled(value, FieldError.noErrors.push({
    kind: ErrorKind.Input,
    message: error,
  }));
}
