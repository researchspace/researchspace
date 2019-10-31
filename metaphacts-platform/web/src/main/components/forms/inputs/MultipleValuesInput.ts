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
import { Rdf } from 'platform/api/rdf';

import { FieldDefinition } from '../FieldDefinition';
import {
  FieldValue, EmptyValue, CompositeValue, SparqlBindingValue, DataState, FieldError, ErrorKind,
} from '../FieldValues';

export interface MultipleValuesProps {
  /** Key to associate with FieldDefinition by name */
  for: string;
  definition?: FieldDefinition;
  dataState?: DataState;
  defaultValue?: string;
  defaultValues?: string[];
  values?: Immutable.List<FieldValue>;
  errors?: Immutable.List<FieldError>;
  updateValues?: (reducer: (previous: ValuesWithErrors) => ValuesWithErrors) => void;
  /**
   * Optional argument to prevent label and description being
   * rendered above the value input(s) i.e. in most settings (default),
   * default layout / rendering will be sufficient.
   *
   * If and only explicitly set to 'false' the header will not be rendered and
   * the static field markup components for layouting the title and description
   * might be used.
   */
  renderHeader?: boolean;
}

export type ValuesWithErrors = {
  values: Immutable.List<FieldValue>;
  errors: Immutable.List<FieldError>;
};

export abstract class MultipleValuesInput<P extends MultipleValuesProps, S>
  extends Component<P, S> {

  dataState(): DataState {
    return DataState.Ready;
  }

  validate({values, errors}: ValuesWithErrors): ValuesWithErrors {
    return {values, errors: FieldError.noErrors};
  }

  finalize(
    owner: EmptyValue | CompositeValue,
    values: Immutable.List<FieldValue>
  ): Kefir.Property<Immutable.List<FieldValue>> {
    return Kefir.constant(values.filter(FieldValue.isAtomic).toList());
  }
}

export function checkCardinalityAndDuplicates(
  values: Immutable.List<FieldValue>, definition: FieldDefinition
) {
  let errors = FieldError.noErrors;

  // filter empty values and duplicates, emit "duplicate value" errors
  const nonEmpty = values.reduce((set, v) => {
    if (FieldValue.isComposite(v) && CompositeValue.isPlaceholder(v.subject)) {
      // only happens on initial loading: optimistically assume that
      // composite subject IRIs will be different after subject generation
      return set.add(Rdf.bnode());
    }
    const rdfNode = FieldValue.asRdfNode(v);
    if (!rdfNode) {
      return set;
    } else if (set.has(rdfNode)) {
      errors = errors.push({
        kind: ErrorKind.Input,
        message: `Value "${rdfNode.value}" is appears more than once`,
      });
      return set;
    } else {
      return set.add(rdfNode);
    }
  }, Immutable.Set<Rdf.Node>());

  if (nonEmpty.size < definition.minOccurs) {
    errors = errors.push({
      kind: ErrorKind.Input,
      message: `Required a minimum of ${definition.minOccurs} values`
        + ` but ${nonEmpty.size} provided`,
    });
  }
  if (nonEmpty.size > definition.maxOccurs) {
    errors = errors.push({
      kind: ErrorKind.Input,
      message: `Required a maximum of ${definition.maxOccurs} values`
        + ` but ${nonEmpty.size} provided`,
    });
  }

  return errors;
}
