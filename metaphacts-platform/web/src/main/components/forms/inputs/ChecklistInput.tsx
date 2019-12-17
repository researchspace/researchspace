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

import * as React from 'react';
import * as Immutable from 'immutable';
import * as classnames from 'classnames';

import { Cancellation } from 'platform/api/async';

import { FieldValue, SparqlBindingValue, ErrorKind, DataState } from '../FieldValues';
import {
  MultipleValuesInput,
  MultipleValuesProps,
  MultipleValuesHandlerProps,
  CardinalityCheckingHandler
} from './MultipleValuesInput';
import { queryValues } from '../QueryValues';

const CHECKLIST_CLASS = 'semantic-form-checklist-input';

export type ChecklistType = 'radio' | 'checkbox';

export interface ChecklistInputProps extends MultipleValuesProps {
  /**
   * Allow to add custom css-class of Checklist.
   */
  className?: string;

  /**
   * Allow to add custom css-class of Checklist item .
   */
  classItemName?: string;

  /**
   * Allow to transform items(checkboxes or radio-buttons) in a row.
   * By default all items arranged vertically.
   */
  row?: boolean;

  /**
   * Allow to select one of two types 'checkbox' | 'radio'.
   * By default is 'checkbox'.
   */
  type?: ChecklistType;
}

interface State {
  readonly valueSet?: Immutable.List<SparqlBindingValue>;
}

/**
 * Form component to select one or several items from list.
 *
 * @example
 * // default using, set type='checkbox' by default
 * <semantic-form-checklist-input for='field-name'></semantic-form-checklist-input>
 *
 * // using with row=true transforms items(checkboxes or radio-buttons) in a row
 * <semantic-form-checklist-input for='field-name' row=true></semantic-form-checklist-input>
 *
 * // can use one of two types(checkbox, radio) or without type
 * <semantic-form-checklist-input for='field-name' type='checkbox'></semantic-form-checklist-input>
 * <semantic-form-checklist-input for='field-name' type='radio'></semantic-form-checklist-input>
 */

export class ChecklistInput extends MultipleValuesInput<ChecklistInputProps, State> {
  private readonly cancellation = new Cancellation();
  private isLoading = true;

  constructor(props: ChecklistInputProps, context: any) {
    super(props, context);
    this.state = {
      valueSet: Immutable.List<SparqlBindingValue>(),
    };
  }

  dataState(): DataState {
    if (this.isLoading) {
      return DataState.Loading;
    }
    return DataState.Ready;
  }

  componentDidMount() {
    const { definition } = this.props;
    if (definition.valueSetPattern) {
      this.cancellation.map(
        queryValues(definition.valueSetPattern)
      ).observe({
        value: valueSet => {
          this.isLoading = false;
          this.setState({valueSet: Immutable.List(valueSet)});
          this.props.updateValues(v => v);
        },
        error: error => {
          console.error(error);
          this.isLoading = false;
          this.props.updateValues(({values, errors}) => {
            const otherErrors = errors.filter(e => e.kind === ErrorKind.Loading).toList();
            otherErrors.push({
              kind: ErrorKind.Loading,
              message: `Failed to load value set`,
            });
            return {values, errors: otherErrors};
          });
        }
      });
    } else {
      this.isLoading = false;
    }
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private onValueChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {updateValues, handler} = this.props;
    const {valueSet} = this.state;
    const checked = event.target.checked;
    updateValues(({values, errors}) => {
      let newValues: Immutable.List<SparqlBindingValue> = Immutable.List<SparqlBindingValue>();
      if (this.checkType() === 'checkbox') {
        // Look for previous values if they are existing.
        const previousValues = values.filter(value => {
          return FieldValue.isAtomic(value) && value.value.value !== event.target.value;
        }).toList();
        newValues = valueSet.filter(value => {
          const isEqualValues = value.value.value === event.target.value;
          // Current value compare with items from previous selection.
          const previouslyChecked = previousValues.
            some(valueToCheck => FieldValue.isAtomic(valueToCheck) &&
              valueToCheck.value.equals(value.value));
          return checked
                 ? (previouslyChecked || isEqualValues)
                 : (previouslyChecked && !isEqualValues);
        }).toList();
      }
      if (this.checkType() === 'radio') {
        newValues = valueSet.filter(value => {
          const isEqualValues = value.value.value === event.target.value;
          return checked && isEqualValues;
        }).toList();
      }
      const validated = handler.validate({
        values: newValues.map(value => FieldValue.fromLabeled(value)),
        errors: errors,
      });
      return validated;
    });
  }

  private checkType = () => {
    const { type } = this.props;
    return (
      type === 'checkbox' ? 'checkbox' :
      type === 'radio' ? 'radio' :
      'checkbox'
    );
  }

  private renderCheckItem = (value: SparqlBindingValue, checked: boolean, key: string) => {
    const { classItemName } = this.props;
    const type = this.checkType();
    const labelClass = `${CHECKLIST_CLASS}__label`;
    const inputClass = `${CHECKLIST_CLASS}__input`;
    const textClass = type === 'radio' ?
      `${CHECKLIST_CLASS}__radio` :
      `${CHECKLIST_CLASS}__checkbox`;
    return <div key={key} className={classnames(`${CHECKLIST_CLASS}`, classItemName)}>
      <label className={labelClass}>
        {value.label}
        <input type={type}
          className={inputClass}
          onChange={this.onValueChanged}
          value={value.value.value}
          checked={checked} />
        <span className={textClass}></span>
      </label>
    </div>;
  }

  private renderChecklist = ( options: SparqlBindingValue[] ) => {
    const { values } = this.props;
    return options.map((option, index) => {
      const checked = values.toArray().some(value => {
        return FieldValue.isAtomic(value) && value.value.equals(option.value);
      });
      return this.renderCheckItem(option, checked, `${option.value.value}-${index}`);
    });
  }

  render() {
    const { row, className } = this.props;
    const options = this.state.valueSet
      ? this.state.valueSet.toArray()
      : [];

    return (
      <div className={classnames(className, {[`${CHECKLIST_CLASS}_row`]: row})}>
        {this.renderChecklist(options)}
      </div>
    );
  }

  static makeHandler(props: MultipleValuesHandlerProps<ChecklistInputProps>) {
    return new CardinalityCheckingHandler(props);
  }
}

MultipleValuesInput.assertStatic(ChecklistInput);

export default ChecklistInput;
