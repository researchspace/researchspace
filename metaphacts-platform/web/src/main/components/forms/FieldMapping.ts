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

import * as _ from 'lodash';
import {
  Props,
  createElement,
  ReactNode,
  ReactElement,
  ComponentClass,
  Children,
  cloneElement,
} from 'react';
import * as Immutable from 'immutable';
import * as SparqlJs from 'sparqljs';

import { SparqlUtil, SparqlTypeGuards } from 'platform/api/sparql';
import {
  isValidChild, componentDisplayName, hasBaseDerivedRelationship, universalChildren,
} from 'platform/components/utils';

import { FieldDefinition, FieldDefinitionProp } from './FieldDefinition';
import { CompositeValue, FieldError, ErrorKind, DataState, FieldState } from './FieldValues';
import { StaticComponent, StaticFieldProps } from './static';

// explicitely import base input classes from their respective modules instead of
// importing from './input' to prevent cyclic dependencies when importing from CompositeInput
import { SingleValueInput } from './inputs/SingleValueInput';
import {
  MultipleValuesInput, MultipleValuesProps, ValuesWithErrors,
} from './inputs/MultipleValuesInput';
import { CardinalitySupport } from './inputs/CardinalitySupport';
import { CompositeInput } from './inputs/CompositeInput';
import { InputDecorator } from './inputs/Decorations';

export type FieldMapping = InputMapping | StaticMapping | OtherElementMapping;
export namespace FieldMapping {
  export function isInput(mapping: FieldMapping): mapping is InputMapping {
    return 'inputType' in mapping;
  }

  export function isComposite(mapping: FieldMapping): mapping is InputMapping {
    return isInput(mapping) && mapping.singleValueInputType
      && hasBaseDerivedRelationship(CompositeInput, mapping.singleValueInputType);
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

export interface InputMapping {
  inputType: ComponentClass<any>;
  singleValueInputType?: ComponentClass<any>;
  props: MultipleValuesProps;
}

export interface StaticMapping {
  staticType: ComponentClass<any>;
  props: StaticFieldProps;
}

export interface OtherElementMapping {
  child: ReactElement<any>;
  children: any;
}

/**
 * Creates mapping description for single field in a form of `FieldMapping`.
 *
 * Inputs derived from `SingleValueInput` are automatically wrapped by `CardinalitySupport`.
 */
export function mapChildToComponent(child: ReactNode): FieldMapping | undefined {
  if (!isValidChild(child)) { return undefined; }

  const element = child as ReactElement<any>;

  if (hasBaseDerivedRelationship(SingleValueInput, element.type)) {
    const singleValueInputType = element.type as ComponentClass<any>;
    const props: MultipleValuesProps = _.clone(element.props);
    (props as Props<CardinalitySupport>).children = element;
    return {inputType: CardinalitySupport, singleValueInputType, props};
  } else if (hasBaseDerivedRelationship(MultipleValuesInput, element.type)) {
    const props: MultipleValuesProps = _.clone(element.props);
    return {inputType: (element.type as ComponentClass<any>), props};
  } else if (hasBaseDerivedRelationship(StaticComponent, element.type)) {
    const props: StaticFieldProps = _.clone(element.props);
    return {staticType: (element.type as ComponentClass<any>), props};
  } else if ('children' in element.props) {
    return {child, children: element.props.children} as any;
  } else {
    return undefined;
  }
}

export interface FieldConfiguration {
  inputs: Immutable.Map<string, InputMapping>;
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
  children: ReactNode,
): FieldConfiguration {
  const inputs = Immutable.Map<string, InputMapping>().asMutable();
  const errors: FieldError[] = [];

  collectFieldConfiguration(definitions, children, inputs, errors);
  inputs.forEach((mapping, key) => {
    const definition = definitions.get(key);
    if (definition) {
      collectDefinitionErrors(definition, errors);
    }
  });

  return {inputs: inputs.asImmutable(), errors: Immutable.List(errors)};
}

function collectFieldConfiguration(
  definitions: Immutable.Map<string, FieldDefinition>,
  children: ReactNode,
  collectedInputs: Immutable.Map<string, InputMapping>,
  collectedErrors: FieldError[],
): void {
  return Children.forEach(children, child => {
    const mapping = mapChildToComponent(child);
    if (!mapping) { return; }

    if (FieldMapping.isInput(mapping)) {
      const {props} = mapping;
      if (props.for) {
        const definition = definitions.get(props.for);
        if (!definition) {
          collectedErrors.push({
            kind: ErrorKind.Configuration,
            message: `Field definition '${props.for}' not found`,
          });
        }
        collectedInputs.set(props.for, mapping);
      } else {
        collectedErrors.push({
          kind: ErrorKind.Configuration,
          message: `Missing 'for' attribute on ${componentDisplayName(child)}`,
        });
      }
    } else if (FieldMapping.isStatic(mapping)) {
      const {staticType, props} = mapping;
      if (props.for) {
        const definition = definitions.get(props.for);
        if (!definition) {
          collectedErrors.push({
            kind: ErrorKind.Configuration,
            message: `Field definition '${props.for}' not found`,
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
  children: ReactNode,
  model: CompositeValue,
  getDataState: (fieldId: string) => DataState,
  onValuesChanged: (
    field: FieldDefinition,
    reducer: (previous: ValuesWithErrors) => ValuesWithErrors,
  ) => void,
  onInputMounted: (inputId: string, element: MultipleValuesInput<any, any>) => void,
) {
  return universalChildren(Children.map(children, child => {
    const mapping = mapChildToComponent(child);
    if (!mapping) {
      return child;
    } else if (FieldMapping.isInput(mapping)) {
      let {inputType, props} = mapping;
      if (!props.for) { return null; }
      props.definition = model.definitions.get(props.for);
      if (!props.definition) { return null; }
      const state = model.fields.get(props.for, FieldState.empty);
      props.dataState = getDataState(props.for);
      props.values = state.values;
      props.errors = state.errors;
      props.updateValues = reducer => onValuesChanged(props.definition, reducer);
      // save a reference to mapped component for validation
      // and lazy selectPattern evaluation
      const onMounted = (input: MultipleValuesInput<any, any>) => {
        onInputMounted(props.for, input);
      };
      return createElement(
        InputDecorator,
        props,
        createElement(inputType, {...props, ref: onMounted})
      );
    } else if (FieldMapping.isStatic(mapping)) {
      const {staticType, props} = mapping;
      if (props.for) {
        props.definition = model.definitions.get(props.for);
        if (!props.definition) { return null; }
      }
      props.model = model;
      return createElement(staticType, props);
    } else if (FieldMapping.isOtherElement(mapping)) {
      const mappedChildren = universalChildren(renderFields(
        mapping.children,
        model,
        getDataState,
        onValuesChanged,
        onInputMounted,
      ));
      return cloneElement(mapping.child, {}, mappedChildren);
    } else {
      throw new Error('Invalid mapping');
    }
  }));
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
    store('autosuggestionPattern',
      validateQueryPattern(definition.autosuggestionPattern, 'SELECT'));
  }
  for (const constraint of definition.constraints) {
    store('askPattern', validateQueryPattern(constraint.validatePattern, 'ASK'));
  }
}

function validateInsertPattern(pattern: string): ValidationError | undefined {
  const query = parseQuery(pattern);
  if (query instanceof ValidationError) { return query; }
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
  if (query instanceof ValidationError) { return query; }
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

function validateQueryPattern(
  pattern: string,
  queryType: SparqlJs.Query['queryType']
): ValidationError | undefined {
  const query = parseQuery(pattern);
  if (query instanceof ValidationError) { return query; }
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
