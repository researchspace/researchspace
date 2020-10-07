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

import * as React from 'react';
import * as Immutable from 'immutable';
import * as SparqlJs from 'sparqljs';

import { SparqlUtil, SparqlTypeGuards } from 'platform/api/sparql';
import {
  isValidChild,
  componentDisplayName,
  universalChildren,
} from 'platform/components/utils';

import { FieldDefinition, FieldDefinitionProp } from './FieldDefinition';
import { CompositeValue, FieldError, ErrorKind, DataState, FieldState } from './FieldValues';
import { StaticFieldProps } from './static';

// explicitely import base input classes from their respective modules instead of
// importing from './input' to prevent cyclic dependencies when importing from CompositeInput
import {
  MultipleValuesInput,
  MultipleValuesProps,
  MultipleValuesHandler,
  ValuesWithErrors,
} from './inputs/MultipleValuesInput';
import { CardinalitySupport } from './inputs/CardinalitySupport';
import { InputKind, InputReactElement, elementHasInputType, componentHasInputType, elementIsSingleValueInput } from './inputs/InputCommpons';
import { InputDecorator } from './inputs/Decorations';

export type FieldMapping = InputMapping | StaticMapping | OtherElementMapping;
export namespace FieldMapping {
  export function isInput(mapping: FieldMapping): mapping is InputMapping {
    return 'inputType' in mapping;
  }

  export function isComposite(mapping: FieldMapping): mapping is InputMapping {
    return (
      isInput(mapping) && componentHasInputType(mapping.singleValueInputType, InputKind.CompositeInput)
    );
  }

  export function isStatic(mapping: FieldMapping): mapping is StaticMapping {
    return 'staticType' in mapping;
  }

  export function isOtherElement(mapping: FieldMapping): mapping is OtherElementMapping {
    return 'child' in mapping && 'children' in mapping;
  }

  export function assertNever(mapping: never): never {
    console.error('Invalid mapping', mapping);
    throw new Error('Invalid mapping');
  }
}

type InputComponentClass = React.ComponentClass<any> & { inputKind: InputKind } ;

export interface InputMapping {
  for: string | undefined;
  inputType: React.ComponentClass<any>;
  singleValueInputType?: InputComponentClass;
  element: React.ReactElement<MultipleValuesProps>;
}

export interface StaticMapping {
  for: string | undefined;
  staticType: React.ComponentClass<any>;
  element: React.ReactElement<StaticFieldProps>;
}

export interface OtherElementMapping {
  child: React.ReactElement<any>;
  children: any;
}

/**
 * Creates mapping description for single field in a form of `FieldMapping`.
 *
 * Inputs derived from `SingleValueInput` are automatically wrapped by `CardinalitySupport`.
 */
export function mapChildToComponent(child: React.ReactNode): FieldMapping | undefined {
  if (!isValidChild(child)) {
    return undefined;
  }

  const element = child as InputReactElement;

  if (elementIsSingleValueInput(element)) {
    const singleValueInputType = element.type as InputComponentClass;
    return {
      for: element.props.for,
      inputType: CardinalitySupport,
      singleValueInputType,
      element: React.createElement(CardinalitySupport, {
        ...element.props,
        children: element,
      }),
    };
  } else if (elementHasInputType(element, InputKind.MultiValuesInput)) {
    const inputType = element.type as React.ComponentClass<any>;
    return { for: element.props.for, inputType, element };
  } else if (elementHasInputType(element, InputKind.StaticInput)) {
    const staticType = element.type as React.ComponentClass<any>;
    return { for: element.props.for, staticType, element };
  } else if (element.props.children) {
    return { child, children: element.props.children };
  } else {
    return undefined;
  }
}

export interface FieldConfiguration {
  inputs: Immutable.Map<string, ReadonlyArray<InputMapping>>;
  errors: Immutable.List<FieldError>;
}

/**
 * Creates (and checks if it's correct) mapping description for
 * the whole form children producing `FieldConfiguration`.
 *
 * Use `renderFields()` to render this description into actual React elements.
 */
export function validateFieldConfiguration(
  definitions: Immutable.Map<string, FieldDefinition>,
  children: React.ReactNode
): FieldConfiguration {
  const inputs = Immutable.Map<string, ReadonlyArray<InputMapping>>().asMutable();
  const errors: FieldError[] = [];

  collectFieldConfiguration(definitions, children, inputs, errors);
  inputs.forEach((mapping, key) => {
    const definition = definitions.get(key);
    if (definition) {
      collectDefinitionErrors(definition, errors);
    }
  });

  return { inputs: inputs.asImmutable(), errors: Immutable.List(errors) };
}

function collectFieldConfiguration(
  definitions: Immutable.Map<string, FieldDefinition>,
  children: React.ReactNode,
  collectedInputs: Immutable.Map<string, ReadonlyArray<InputMapping>>,
  collectedErrors: FieldError[]
): void {
  return React.Children.forEach(children, (child) => {
    const mapping = mapChildToComponent(child);
    if (!mapping) {
      return;
    }

    if (FieldMapping.isInput(mapping)) {
      if (mapping.for) {
        const definition = definitions.get(mapping.for);
        if (!definition) {
          collectedErrors.push({
            kind: ErrorKind.Configuration,
            message: `Field definition '${mapping.for}' not found`,
          });
        }
        const mappings = collectedInputs.get(mapping.for);
        collectedInputs.set(mapping.for, mappings ? [...mappings, mapping] : [mapping]);
      } else {
        collectedErrors.push({
          kind: ErrorKind.Configuration,
          message: `Missing 'for' attribute on ${componentDisplayName(child)}`,
        });
      }
    } else if (FieldMapping.isStatic(mapping)) {
      if (mapping.for) {
        const definition = definitions.get(mapping.for);
        if (!definition) {
          collectedErrors.push({
            kind: ErrorKind.Configuration,
            message: `Field definition '${mapping.for}' not found`,
          });
        }
      }
    } else if (FieldMapping.isOtherElement(mapping)) {
      collectFieldConfiguration(definitions, mapping.children, collectedInputs, collectedErrors);
    } else {
      FieldMapping.assertNever(mapping);
    }
  });
}

export function renderFields(
  inputChildren: React.ReactNode,
  model: CompositeValue,
  inputHandlers: Immutable.Map<string, ReadonlyArray<MultipleValuesHandler>>,
  getDataState: (fieldId: string) => DataState,
  onValuesChanged: (field: FieldDefinition, reducer: (previous: ValuesWithErrors) => ValuesWithErrors) => void,
  onInputMounted: (inputId: string, index: number, input: MultipleValuesInput<any, any>) => void
) {
  const inputIndices = new Map<string, number>();

  function mapChild(child: React.ReactNode) {
    const mapping = mapChildToComponent(child);
    if (!mapping) {
      return child;
    } else if (FieldMapping.isInput(mapping)) {
      if (!mapping.for) {
        return null;
      }
      const definition = model.definitions.get(mapping.for);

      if (!definition) {
        return null;
      }
      const state = model.fields.get(mapping.for, FieldState.empty);

      const index = inputIndices.get(mapping.for) || 0;
      inputIndices.set(mapping.for, index + 1);

      const handlers = inputHandlers.get(mapping.for);
      if (index >= handlers.length) {
        throw new Error(`Missing handler for field ${mapping.for} (at index ${index})`);
      }
      const handler = handlers[index];

      // save a reference to mapped component for validation
      // and lazy selectPattern evaluation
      const onMounted = (input: MultipleValuesInput<any, any>) => {
        onInputMounted(mapping.for, index, input);
      };

      const baseProvidedProps: Partial<MultipleValuesProps> = {
        definition,
        handler,
        dataState: getDataState(mapping.for),
        values: state.values,
        errors: state.errors,
        updateValues: (reducer) => onValuesChanged(definition, reducer),
      };
      const inputOverride: Partial<MultipleValuesProps> & React.Props<any> = {
        ...baseProvidedProps,
        ref: onMounted,
      };
      return React.createElement(
        InputDecorator,
        { ...mapping.element.props, ...baseProvidedProps },
        React.cloneElement(mapping.element, inputOverride)
      );
    } else if (FieldMapping.isStatic(mapping)) {
      const { element } = mapping;
      const override: Partial<StaticFieldProps> = { model };
      if (element.props.for) {
        const definition = model.definitions.get(element.props.for);
        if (!definition) {
          return null;
        }
        override.definition = definition;
      }
      return React.cloneElement(mapping.element, override);
    } else if (FieldMapping.isOtherElement(mapping)) {
      const mappedChildren = mapChildren(mapping.children);
      return React.cloneElement(mapping.child, {}, mappedChildren);
    } else {
      throw new Error('Invalid mapping');
    }
  }

  function mapChildren(children: React.ReactNode) {
    return universalChildren(React.Children.map(children, mapChild));
  }

  return mapChildren(inputChildren);
}

/**
 * @returns list of errors in the field definition.
 */
export function collectDefinitionErrors(definition: FieldDefinition, errors: FieldError[]) {
  const resultErrors: string[] = [];
  function store(member: keyof FieldDefinitionProp, error: ValidationError | undefined) {
    if (error instanceof ValidationError) {
      errors.push({
        kind: ErrorKind.Configuration,
        message: `Invalid ${member} of field '${definition.id}': ${error.message}`,
      });
    }
  }

  if (definition.selectPattern) {
    store('selectPattern', validateQueryPattern(definition.selectPattern, 'SELECT'));
  }
  if (definition.valueSetPattern) {
    store('valueSetPattern', validateQueryPattern(definition.valueSetPattern, 'SELECT'));
  }
  if (definition.deletePattern) {
    store('deletePattern', validateDeletePattern(definition.deletePattern));
  }
  if (definition.insertPattern) {
    store('insertPattern', validateInsertPattern(definition.insertPattern));
  }
  if (definition.autosuggestionPattern) {
    store('autosuggestionPattern', validateQueryPattern(definition.autosuggestionPattern, 'SELECT'));
  }
  for (const constraint of definition.constraints) {
    store('askPattern', validateQueryPattern(constraint.validatePattern, 'ASK'));
  }
}

function validateInsertPattern(pattern: string): ValidationError | undefined {
  const query = parseQuery(pattern);
  if (query instanceof ValidationError) {
    return query;
  }
  if (query.type !== 'update') {
    return new ValidationError(`should be INSERT query but was: '${query.type}'`);
  }
  for (const update of query.updates) {
    const isInsertWhere =
      SparqlTypeGuards.isInsertDeleteOperation(update) &&
      update.updateType === 'insertdelete' &&
      update.delete.length === 0;
    if (!isInsertWhere) {
      return new ValidationError('query should include only INSERT WHERE operations');
    }
  }
  return undefined;
}

function validateDeletePattern(pattern: string): ValidationError | undefined {
  const query = parseQuery(pattern);
  if (query instanceof ValidationError) {
    return query;
  }
  if (query.type !== 'update') {
    return new ValidationError(`should be DELETE query but was: '${query.type}'`);
  }
  for (const update of query.updates) {
    const isDeleteWhere =
      SparqlTypeGuards.isInsertDeleteOperation(update) &&
      update.updateType === 'insertdelete' &&
      update.insert.length === 0;
    if (!isDeleteWhere) {
      return new ValidationError('query should include only DELETE WHERE operations');
    }
  }
  return undefined;
}

function validateQueryPattern(pattern: string, queryType: SparqlJs.Query['queryType']): ValidationError | undefined {
  const query = parseQuery(pattern);
  if (query instanceof ValidationError) {
    return query;
  }
  if (query.type !== 'query') {
    return new ValidationError(`should be ${queryType} query but was: '${query.type}'`);
  }
  if (query.queryType !== queryType) {
    return new ValidationError(`should be ${queryType} query but was: '${query.queryType}'`);
  }
  return undefined;
}

function parseQuery(query: string): SparqlJs.SparqlQuery | ValidationError {
  try {
    return SparqlUtil.parseQuery(query);
  } catch (err) {
    return new ValidationError(err.message);
  }
}

class ValidationError {
  constructor(readonly message: string) {}
}
