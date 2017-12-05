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

import {
  isValidChild, componentDisplayName, hasBaseDerivedRelationship, universalChildren,
} from 'platform/components/utils';

import { FieldDefinition } from './FieldDefinition';
import { CompositeValue, FieldError, ErrorKind, DataState } from './FieldValues';
import { StaticComponent, StaticFieldProps } from './static';

// explicitely import base input classes from their respective modules instead of
// importing from './input' to prevent cyclic dependencies when importing from CompositeInput
import { SingleValueInput } from './inputs/SingleValueInput';
import {
  MultipleValuesInput, MultipleValuesProps, ValuesWithErrors,
} from './inputs/MultipleValuesInput';
import { CardinalitySupport } from './inputs/CardinalitySupport';
import { InputDecorator } from './inputs/Decorations';

export type FieldMapping = InputMapping | StaticMapping | OtherElementMapping;
export namespace FieldMapping {
  export function isInput(mapping: FieldMapping): mapping is InputMapping {
    return 'inputType' in mapping;
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
export function mapChildToComponent(
  child: ReactElement<any> | string | number
): FieldMapping | undefined {
  if (!isValidChild(child)) { return undefined; }

  const element = child as ReactElement<any>;

  if (hasBaseDerivedRelationship(SingleValueInput, element.type)) {
    const props: MultipleValuesProps = _.clone(element.props);
    (props as Props<CardinalitySupport>).children = element;
    return {inputType: CardinalitySupport, props};
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
  const errors = Immutable.List<FieldError>().asMutable();
  collectFieldConfiguration(definitions, children, inputs, errors);
  return {inputs: inputs.asImmutable(), errors: errors.asImmutable()};
}

function collectFieldConfiguration(
  definitions: Immutable.Map<string, FieldDefinition>,
  children: ReactNode,
  collectedInputs: Immutable.Map<string, InputMapping>,
  collectedErrors: Immutable.List<FieldError>,
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
      const state = model.fields.get(props.for);
      props.dataState = getDataState(props.for);
      props.values = state.values;
      props.errors = state.errors;
      props.valueSet = state.valueSet;
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
