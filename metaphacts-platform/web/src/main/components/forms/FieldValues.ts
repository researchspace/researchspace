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

import { Rdf } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';

import { FieldDefinition } from './FieldDefinition';

export interface LabeledValue {
  readonly value: Rdf.Node;
  readonly label?: string;
}
export namespace LabeledValue {
  export function set(source: LabeledValue, props: Partial<LabeledValue>): LabeledValue {
    return {...source, ...props};
  }
}

/**
 * Extension of the LabeledValue carrying the original SPARQL result bindings i.e.
 * if LabeledValue is constructed from SPARQL select query (as for example for the valueSet)
 * we can still access the original bindings, for example, for custom renderings in the dropdown.
 */
export interface SparqlBindingValue extends LabeledValue {
  readonly binding: SparqlClient.Binding;
}
export namespace SparqlBindingValue {
  export function set(
    source: SparqlBindingValue,
    props: Partial<SparqlBindingValue>
  ): SparqlBindingValue {
    return {...source, ...props};
  }
}

export enum ErrorKind {
  /**
   * Error in form configuration (e.g. invalid or missing FieldDefinition)
   */
  Configuration,
  /**
   * Error happened while form was loading (e.g. invalid 'selectPattern')
   */
  Loading,
  /**
   * Invalid value found by input component (e.g. wrong XSD datatype)
   */
  Input,
  /**
   * Invalid value found by form validation (e.g. by 'askPattern')
   */
  Validation,
}

export interface FieldError {
  readonly kind: ErrorKind;
  readonly message: string;
}
export namespace FieldError {
  export const noErrors = Immutable.List<FieldError>();

  export function isPreventSubmit(error: FieldError) {
    return error.kind === ErrorKind.Configuration ||
      error.kind === ErrorKind.Input ||
      error.kind === ErrorKind.Validation;
  }

  export function kindToString(kind: ErrorKind) {
    switch (kind) {
      case ErrorKind.Configuration: return 'configuration';
      case ErrorKind.Loading: return 'loading';
      case ErrorKind.Input: return 'input';
      case ErrorKind.Validation: return 'validation';
      default: return 'unknown';
    }
  }
}

export interface EmptyValue { type: 'empty' }
export namespace EmptyValue {
  export const type = 'empty';
}

export interface AtomicValue extends LabeledValue {
  readonly type: 'atomic';
  readonly errors: Immutable.List<FieldError>;
}
export namespace AtomicValue {
  export const type = 'atomic';

  export function set(source: AtomicValue | EmptyValue, props: Partial<AtomicValue>): AtomicValue {
    if (source.type === EmptyValue.type && !('value' in props)) {
      throw new Error('AtomicValue.value is required to create AtomicValue from EmptyValue');
    } else if ('value' in props && !props.value) {
      throw new Error('AtomicValue.value cannot be null or undefined');
    } else if ('errors' in props && !props.errors) {
      throw new Error('AtomicValue.errors cannot be null or undefined');
    }
    return source.type === EmptyValue.type
      ? {type: AtomicValue.type, errors: FieldError.noErrors, ...props as AtomicValue}
      : {...source, ...props};
  }
}

export enum DataState {
  /** Field is loading intial value and/or value set. */
  Loading = 1,
  /** Field is intialized and ready to user input. */
  Ready,
  /** Field is currently validating by {@link FormModel}. */
  Verifying,
}

export interface FieldState {
  readonly values: Immutable.List<FieldValue>;
  readonly errors: Immutable.List<FieldError>;
}
export namespace FieldState {
  export const empty: FieldState = {
    values: Immutable.List<FieldValue>(),
    errors: Immutable.List<FieldError>(),
  };

  export function set(source: FieldState, props: Partial<FieldState>): FieldState {
    if ('values' in props && props.values === undefined) {
      throw new Error('FieldState.values cannot be undefined');
    } else if ('errors' in props && props.errors === undefined) {
      throw new Error('FieldState.errors cannot be undefined');
    }
    return {...source, ...props};
  }
}

export interface CompositeValue {
  readonly type: 'composite';
  readonly subject: Rdf.Iri;
  readonly definitions: Immutable.Map<string, FieldDefinition>;
  readonly fields: Immutable.Map<string, FieldState>;
  /**
   * Errors related to form (e.g. configuration errors),
   * doesn't include errors from individual fields.
   */
  readonly errors: Immutable.List<FieldError>;
}
export namespace CompositeValue {
  export const type = 'composite';

  export function set(source: CompositeValue, props: Partial<CompositeValue>): CompositeValue {
    return {...source, ...props};
  }

  export function isPlaceholder(subject: Rdf.Iri) {
    return subject.value.length === 0;
  }
}

export type FieldValue = EmptyValue | AtomicValue | CompositeValue;
export namespace FieldValue {
  export const empty: EmptyValue = {type: EmptyValue.type};

  export function isEmpty(value: FieldValue): value is EmptyValue {
    return value.type === EmptyValue.type;
  }

  export function isAtomic(value: FieldValue): value is AtomicValue {
    return value.type === AtomicValue.type;
  }

  export function isComposite(value: FieldValue): value is CompositeValue {
    return value.type === CompositeValue.type;
  }

  export function fromLabeled(
    {value, label}: LabeledValue, errors = FieldError.noErrors
  ): AtomicValue {
    if (!value) {
      throw new Error('LabeledValue.value cannot be null or undefined');
    }
    return {type: AtomicValue.type, value, label, errors};
  }

  export function asRdfNode(value: FieldValue): Rdf.Node | undefined {
    switch (value.type) {
      case EmptyValue.type: return undefined;
      case AtomicValue.type: return value.value;
      case CompositeValue.type:
        return value.subject.value.length > 0 ? value.subject : undefined;
    }
    unknownFieldType(value);
  }

  export function getErrors(value: FieldValue) {
    switch (value.type) {
      case EmptyValue.type: return FieldError.noErrors;
      case AtomicValue.type: return value.errors;
      case CompositeValue.type: return value.errors;
    }
    unknownFieldType(value);
  }

  export function setErrors(
    value: AtomicValue | CompositeValue,
    errors: Immutable.List<FieldError>,
  ): AtomicValue | CompositeValue {
    if (!errors) {
      throw new Error('Cannot set field value errors to null or undefined');
    }
    switch (value.type) {
      case AtomicValue.type: return {...value, errors};
      case CompositeValue.type: return {...value, errors};
    }
    unknownFieldType(value);
  }

  export function replaceError(v: FieldValue, error: FieldError) {
    const nonEmpty = FieldValue.isEmpty(v)
      ? FieldValue.fromLabeled({value: Rdf.iri('')}) : v;
    const errors = FieldError.noErrors.push(error);
    return FieldValue.setErrors(nonEmpty, errors);
  }

  export function unknownFieldType(value: never) {
    throw new Error(`Unknown field value type: ${(value as FieldValue).type}`);
  }
}
