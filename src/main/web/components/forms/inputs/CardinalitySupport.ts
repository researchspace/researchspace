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

import { uniqueId } from 'lodash';
import * as Immutable from 'immutable';
import * as Kefir from 'kefir';

import { ReactNode, Children, createElement, cloneElement, ReactElement, ClassAttributes } from 'react';
import * as D from 'react-dom-factories';
import * as classnames from 'classnames';
import { Button } from 'react-bootstrap';

import {
  isValidChild,
  universalChildren,
} from 'platform/components/utils';

import { FieldDefinition, getPreferredLabel } from '../FieldDefinition';
import {
  FieldValue,
  EmptyValue,
  CompositeValue,
  DataState,
  ErrorKind,
  FieldError,
  mergeDataState,
} from '../FieldValues';

import { SingleValueInput, SingleValueInputProps, SingleValueHandler } from './SingleValueInput';
import {
  MultipleValuesInput,
  MultipleValuesProps,
  MultipleValuesHandler,
  MultipleValuesHandlerProps,
  ValuesWithErrors,
  checkCardinalityAndDuplicates,
} from './MultipleValuesInput';
import { InputKind, InputReactElement, elementHasInputType, elementIsSingleValueInput } from './InputCommpons';

export interface CardinalitySupportProps extends MultipleValuesProps {
  children?: ReactNode;
}

const COMPONENT_NAME = 'cardinality-support';

type ChildInput = SingleValueInput<SingleValueInputProps, unknown>;

/**
 * Wraps {@link SingleValueInput} and exposes self as {@link MultipleValuesInput}
 * by duplicating input component for each field value.
 *
 * This component validates cardinality of field and produces corresponding errors
 * through {@link Props.onValuesChanged}.
 */
export class CardinalitySupport extends MultipleValuesInput<CardinalitySupportProps, {}> {
  /**
   * React element keys corresponding to field values, to prevent incorrect
   * virtual DOM merging when adding or deleting values.
   */
  private valueKeys: string[] = [];

  private readonly inputs = new Map<string, ChildInput[]>();
  private lastRenderedDataState: DataState | undefined;

  private getHandler(): CardinalitySupportHandler {
    const { handler } = this.props;
    if (!(handler instanceof CardinalitySupportHandler)) {
      throw new Error('Invalid value handler for CardinalitySupport');
    }
    return handler;
  }

  shouldComponentUpdate(nextProps: CardinalitySupportProps, nextState: {}) {
    if (this.state !== nextState) {
      return true;
    }
    const previous = this.props;
    return !(
      this.dataState() === this.lastRenderedDataState &&
      previous.renderHeader === nextProps.renderHeader &&
      previous.definition === nextProps.definition &&
      previous.dataState === nextProps.dataState &&
      previous.errors === nextProps.errors &&
      (previous.values === nextProps.values ||
        (previous.values.size === nextProps.values.size &&
          previous.values.every((item, index) => item === nextProps.values.get(index))))
    );
  }

  render(): ReactElement<any> {
    const definition = this.props.definition;
    if (definition.maxOccurs === 0) {
      return D.div({});
    }

    const { dataState, readonly } = this.props;
    this.lastRenderedDataState = this.dataState();

    const size = this.props.values.size;
    const canEdit = readonly != true && (dataState === DataState.Ready || dataState === DataState.Verifying);
    const canAddValue = canEdit && size < definition.maxOccurs;
    const canRemoveValue = canEdit && size > definition.minOccurs && size > 0;
    const fieldLabel = (this.props.label || getPreferredLabel(definition.label) || 'value').toLowerCase();

    return D.div(
      { className: COMPONENT_NAME },

      this.renderChildren(canRemoveValue),

      canAddValue
        ? D.a(
            {
              className: classnames({
                [`${COMPONENT_NAME}__add-value`]: true,
                [`${COMPONENT_NAME}__add-value--first`]: size === 0,
                [`${COMPONENT_NAME}__add-value--another`]: size > 0,
              }),
              onClick: this.addNewValue,
            },
            `+ Add ${fieldLabel}`
          )
        : null
    );
  }

  private renderChildren(canRemoveValue: boolean) {
    this.ensureValueKeys(this.props.values.size);

    const childIsInputGroup = isInputGroup(this.props.children);

    // if we don't want to render header and cardinality is 1 then there there is no reason to show the group borders and other styles
    const canCollapseGroup =
      this.props.renderHeader === false &&
      this.props.definition.minOccurs === 1 &&
      this.props.definition.maxOccurs === 1;

    let className = childIsInputGroup ? `${COMPONENT_NAME}__group-instance` : `${COMPONENT_NAME}__single-instance`;
    if (canCollapseGroup) {
      className = className + ` ${COMPONENT_NAME}_no-header`;
    }

    return this.props.values.map((value, index) =>
      D.div(
        { key: this.valueKeys[index], className },
        renderChildInputs(
          this.props,
          this.getHandler(),
          value,
          this.valueKeys[index],
          (reducer) => {
            this.onValuesChanged((values) => values.update(index, reducer));
          },
          (key, inputIndex, input) => {
            let refs = this.inputs.get(key);
            if (!refs) {
              refs = [];
              this.inputs.set(key, refs);
            }
            refs[inputIndex] = input;
          }
        ),
        canRemoveValue
          ? createElement(
              Button,
              {
                className: COMPONENT_NAME + '__remove-value',
                onClick: () => this.removeValue(index),
              },
              D.span({ className: 'fa fa-times' })
            )
          : undefined
      )
    );
  }

  private ensureValueKeys(valueCount: number) {
    while (this.valueKeys.length < valueCount) {
      this.valueKeys.push(uniqueId());
    }
  }

  private addNewValue = () => {
    this.onValuesChanged(() => this.props.values.push(FieldValue.empty));
  };

  private removeValue = (valueIndex: number) => {
    this.valueKeys.splice(valueIndex, 1);
    this.onValuesChanged(() => this.props.values.remove(valueIndex));
  };

  private onValuesChanged(reducer: (previous: Immutable.List<FieldValue>) => Immutable.List<FieldValue>) {
    const handler = this.getHandler();
    this.props.updateValues((previous) => {
      const newValues = reducer(previous.values);
      const validated = handler.validate({ values: newValues, errors: previous.errors }, false);
      return validated;
    });
  }

  dataState(): DataState {
    let result = DataState.Ready;
    for (const key of this.valueKeys) {
      const refs = this.inputs.get(key);
      if (!refs) {
        result = mergeDataState(result, DataState.Loading);
        continue;
      }
      for (const ref of refs) {
        if (ref) {
          result = mergeDataState(result, ref.dataState());
        }
      }
    }
    return result;
  }

  static makeHandler(props: MultipleValuesHandlerProps<CardinalitySupportProps>): CardinalitySupportHandler {
    return new CardinalitySupportHandler(props);
  }
}

function renderChildInputs(
  this: void,
  inputProps: CardinalitySupportProps,
  inputHandler: CardinalitySupportHandler,
  value: FieldValue,
  key: string,
  updateValue: (reducer: (value: FieldValue) => FieldValue) => void,
  onInputMount: (key: string, inputIndex: number, input: ChildInput | null) => void
) {
  let nextIndex = 0;
  function mapChildren(this: void, children: ReactNode) {
    return universalChildren(
      Children.map(children, (child) => {
        if (isValidChild(child)) {
          const element = child as InputReactElement;
          if (elementIsSingleValueInput(element)) {
            const inputIndex = nextIndex;
            nextIndex++;

            if (inputIndex > inputHandler.handlers.length) {
              throw new Error(`Missing handler for cardinality field ${inputProps.for} at index ${inputIndex}`);
            }
            const handler = inputHandler.handlers[inputIndex];

            const props: SingleValueInputProps & ClassAttributes<ChildInput> = {
              for: inputProps.for,
              handler,
              definition: inputProps.definition,
              dataState: inputProps.dataState,
              value: value,
              updateValue,
              ref: (input) => onInputMount(key, inputIndex, input),
            };
            return cloneElement(element, props);
          } else if (element.props.children) {
            return cloneElement(element, {}, mapChildren(element.props.children));
          }
        }
        return child;
      })
    );
  }
  return mapChildren(inputProps.children);
}

class CardinalitySupportHandler implements MultipleValuesHandler {
  readonly definition: FieldDefinition;
  readonly handlers: ReadonlyArray<SingleValueHandler>;

  constructor(props: MultipleValuesHandlerProps<CardinalitySupportProps>) {
    this.definition = props.definition;
    this.handlers = findInputs(props.baseInputProps.children).map((input) => {
      return SingleValueInput.getHandlerOrDefault(input.type as any, {
        definition: this.definition,
        baseInputProps: input.props,
      });
    });
  }

  /**
   * Performs cardinality validation of field and
   * validates its values with wrapped {@link SingleValueInput}.
   */
  validate({ values, errors }: ValuesWithErrors, validateByChildInput = true) {
    const otherErrors = errors.filter((e) => e.kind !== ErrorKind.Input).toList();
    const cardinalityErrors = this.validateCardinality(values);
    return {
      values: validateByChildInput ? values.map(this.validateThoughChildInputs) : values,
      errors: otherErrors.concat(cardinalityErrors),
    };
  }

  private validateThoughChildInputs = (value: FieldValue) => {
    if (FieldValue.isEmpty(value)) {
      return value;
    }
    const cleanValue = FieldValue.setErrors(value, FieldError.noErrors);
    // combine errors from every child input
    let validated: FieldValue = cleanValue;
    for (const handler of this.handlers) {
      validated = handler.validate(validated);
    }
    return validated;
  };

  private validateCardinality(values: Immutable.List<FieldValue>): Immutable.List<FieldError> {
    let preparedValues = values;
    for (const handler of this.handlers) {
      if (handler.finalizeSubject) {
        preparedValues = values.map((v) => {
          // finalize subject to distinguish composites
          return FieldValue.isComposite(v) ? handler.finalizeSubject(FieldValue.empty, v) : v;
        });
      }
    }
    return checkCardinalityAndDuplicates(preparedValues, this.definition);
  }

  finalize(
    values: Immutable.List<FieldValue>,
    owner: EmptyValue | CompositeValue
  ): Kefir.Property<Immutable.List<FieldValue>> {
    let finalizing = Kefir.constant(values);
    for (const handler of this.handlers) {
      finalizing = finalizing
        .flatMap((intermediates) => {
          const tasks = intermediates.map((value) => handler.finalize(value, owner)).toArray();
          if (tasks.length > 0) {
            return Kefir.zip(tasks)
              .map((properties) => Immutable.List(properties))
              .toProperty();
          } else {
            return Kefir.constant(Immutable.List<FieldValue>());
          }
        })
        .toProperty();
    }
    return finalizing;
  }
}

function findInputs(inputChildren: ReactNode): ReactElement<SingleValueInputProps>[] {
  const foundInputs: ReactElement<SingleValueInputProps>[] = [];

  function collectInputs(children: ReactNode) {
    Children.forEach(children, (child) => {
      if (isValidChild(child)) {
        const element = child as InputReactElement;
        if (elementIsSingleValueInput(element)) {
          foundInputs.push(element);
        } else if (element.props.children) {
          collectInputs(element.props.children);
        }
      }
    });
  }

  collectInputs(inputChildren);
  return foundInputs;
}

function isInputGroup(children: ReactNode) {
  const childCount = Children.count(children);
  if (childCount !== 1) {
    return childCount > 1;
  }
  const child = Children.toArray(children)[0] as InputReactElement;
  if (!isValidChild(child)) {
    return true;
  }
  return (
    elementHasInputType(child, InputKind.CompositeInput) ||
      elementHasInputType(child, InputKind.FormSwitch) ||
      !elementIsSingleValueInput(child)
  );
}

MultipleValuesInput.assertStatic(CardinalitySupport);

export default CardinalitySupport;
