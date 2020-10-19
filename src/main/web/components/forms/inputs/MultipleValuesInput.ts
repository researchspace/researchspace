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

import * as Immutable from 'immutable';
import * as Kefir from 'kefir';

import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';

import { FieldDefinition } from '../FieldDefinition';
import { FieldValue, EmptyValue, CompositeValue, DataState, FieldError, ErrorKind } from '../FieldValues';
import { InputKind } from './InputCommpons';

export interface MultipleValuesProps {
  /** Key to associate with FieldDefinition by name */
  for: string;
  handler?: MultipleValuesHandler;
  definition?: FieldDefinition;
  dataState?: DataState;
  defaultValue?: string;
  defaultValues?: string[];

  /**
   * If true then default values should be always added to the object and can't be removed.
   */
  forceDefaults?: boolean;
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

  /**
   * Overrides label from the Field Definition.
   */
  label?: string;

  /**
   * Can set input component into readonly mode.
   *
   * @default false
   */
  readonly?: boolean;
}

export interface MultipleValuesHandler {
  validate(values: ValuesWithErrors): ValuesWithErrors;
  finalize(
    values: Immutable.List<FieldValue>,
    owner: EmptyValue | CompositeValue
  ): Kefir.Property<Immutable.List<FieldValue>>;
}

export interface MultipleValuesHandlerProps<InputProps> {
  definition: FieldDefinition;
  baseInputProps: InputProps;
}

interface MultipleValuesInputStatic {
  makeHandler(props: MultipleValuesHandlerProps<any>): MultipleValuesHandler;
}

export type ValuesWithErrors = {
  values: Immutable.List<FieldValue>;
  errors: Immutable.List<FieldError>;
};

export abstract class MultipleValuesInput<P extends MultipleValuesProps, S> extends Component<P, S> {

  public static readonly inputKind = InputKind.MultiValuesInput;

  dataState(): DataState {
    return DataState.Ready;
  }

  static readonly defaultHandler: MultipleValuesHandler = {
    validate: (values) => values,
    finalize: (values, owner) => Kefir.constant(values),
  };

  static assertStatic(constructor: MultipleValuesInputStatic) {
    /* nothing */
  }

  static getHandlerOrDefault(
    componentType: MultipleValuesInputStatic,
    handlerProps: MultipleValuesHandlerProps<any>
  ): MultipleValuesHandler {
    if (!(componentType && componentType.makeHandler)) {
      return MultipleValuesInput.defaultHandler;
    }
    return componentType.makeHandler(handlerProps);
  }
}

export class CardinalityCheckingHandler implements MultipleValuesHandler {
  private definition: FieldDefinition;

  constructor(props: MultipleValuesHandlerProps<MultipleValuesProps>) {
    this.definition = props.definition;
  }

  validate({ values, errors }: ValuesWithErrors): ValuesWithErrors {
    const otherErrors = errors.filter((e) => e.kind !== ErrorKind.Input).toList();
    const cardinalityErrors = checkCardinalityAndDuplicates(values, this.definition);
    return {
      values: values,
      errors: otherErrors.concat(cardinalityErrors),
    };
  }

  finalize(
    values: Immutable.List<FieldValue>,
    owner: EmptyValue | CompositeValue
  ): Kefir.Property<Immutable.List<FieldValue>> {
    return MultipleValuesInput.defaultHandler.finalize(values, owner);
  }
}

export function checkCardinalityAndDuplicates(
  values: Immutable.List<FieldValue>,
  definition: FieldDefinition
): Immutable.List<FieldError> {
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
      message: `Required a minimum of ${definition.minOccurs} values` + ` but ${nonEmpty.size} provided`,
    });
  }
  if (nonEmpty.size > definition.maxOccurs) {
    errors = errors.push({
      kind: ErrorKind.Input,
      message: `Required a maximum of ${definition.maxOccurs} values` + ` but ${nonEmpty.size} provided`,
    });
  }

  return errors;
}
