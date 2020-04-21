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
import * as Kefir from 'kefir';
import * as Immutable from 'immutable';
import * as classnames from 'classnames';

import { Rdf } from 'platform/api/rdf';

import { FieldDefinition } from '../FieldDefinition';
import { FieldValue, ErrorKind, LabeledValue, EmptyValue, CompositeValue, FieldError } from '../FieldValues';
import {
  MultipleValuesInput,
  MultipleValuesProps,
  MultipleValuesHandler,
  MultipleValuesHandlerProps,
  ValuesWithErrors,
} from './MultipleValuesInput';

const CHECKBOX_CLASS = 'semantic-form-checkbox-input';

enum CheckboxState {
  Unchecked = 0,
  Checked,
  Indeterminate,
}

export interface CheckboxInputProps extends MultipleValuesProps {
  /**
   * Allow to add custom css-class of Checkbox.
   */
  className?: string;
}

const TRUE_VALUE = Rdf.literal(true);
const FALSE_VALUE = Rdf.literal(false);

/**
 * The component renders as a single checkbox with binary status, i.e. to exclusively handle
 * xsd:boolean values. If the checkbox is checked will persist true^^xsd:boolean
 * and if it is unchecked it will persist to false^^xsd:boolean.
 *
 * @example
 * // default using, set type='checkbox' by default
 * <semantic-form-checkbox-input for='field-name'></semantic-form-checkbox-input>
 *
 */
export class CheckboxInput extends MultipleValuesInput<CheckboxInputProps, {}> {
  constructor(props: CheckboxInputProps, context: any) {
    super(props, context);
  }

  private onValueChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.createNewValues(event.target.checked);
  };

  private createNewValues = (checked: boolean) => {
    const { updateValues, handler } = this.props;
    updateValues(({ values, errors }) => {
      const newValue: LabeledValue = { value: Rdf.literal(checked) };
      let newValues = Immutable.List<FieldValue>();
      newValues = newValues.push(FieldValue.fromLabeled(newValue));
      const validated = handler.validate({ values: newValues, errors: errors });
      return validated;
    });
  };

  private renderCheckbox = (checkboxState: CheckboxState) => {
    const labelClass = `${CHECKBOX_CLASS}__label`;
    const inputClass = `${CHECKBOX_CLASS}__input`;
    const textClass = `${CHECKBOX_CLASS}__checkbox`;
    return (
      <label className={labelClass}>
        <input
          type={'checkbox'}
          className={inputClass}
          onChange={this.onValueChanged}
          checked={checkboxState === CheckboxState.Checked}
          ref={(input) => {
            if (input) {
              input.indeterminate = checkboxState === CheckboxState.Indeterminate;
            }
          }}
        />
        <span className={textClass}></span>
      </label>
    );
  };

  render() {
    const { className, values } = this.props;
    const checkboxState = getCheckboxState(values);
    return (
      <div className={classnames(className, { [CHECKBOX_CLASS]: true })}>{this.renderCheckbox(checkboxState)}</div>
    );
  }

  static makeHandler(props: MultipleValuesHandlerProps<CheckboxInputProps>) {
    return new CheckboxHandler(props);
  }
}

class CheckboxHandler implements MultipleValuesHandler {
  private definition: FieldDefinition;

  constructor(props: MultipleValuesHandlerProps<CheckboxInputProps>) {
    this.definition = props.definition;
  }

  validate({ values, errors }: ValuesWithErrors) {
    const otherErrors = errors.filter((e) => e.kind !== ErrorKind.Input).toList();
    const checkboxErrors = this.appendCheckboxErrors(values, otherErrors);
    return {
      values: values,
      errors: checkboxErrors,
    };
  }

  private appendCheckboxErrors = (
    values: Immutable.List<FieldValue>,
    errors: Immutable.List<FieldError>
  ): Immutable.List<FieldError> => {
    errors = errors.filter((e) => e.kind !== ErrorKind.Configuration).toList();
    if (values.size > 1) {
      errors = errors.push({
        kind: ErrorKind.Configuration,
        message: `Uncorrect data size = ${values.size}. Should be size = 1`,
      });
    }
    if (this.definition.minOccurs > 1) {
      errors = errors.push({
        kind: ErrorKind.Configuration,
        message: `Uncorrect cardinality (minOccurs = ${this.definition.minOccurs}) > 1.`,
      });
    }
    const value = values.first();
    if (value && FieldValue.isComposite(value)) {
      errors = errors.push({
        kind: ErrorKind.Configuration,
        message: `Uncorrect field value type = ${value.type}. Should be "atomic"`,
      });
    }
    if (value && FieldValue.isAtomic(value)) {
      if (!value.value.equals(TRUE_VALUE) && !value.value.equals(FALSE_VALUE)) {
        errors = errors.push({
          kind: ErrorKind.Configuration,
          message: `Uncorrect datatype. Should be "boolean"`,
        });
      }
    }
    return errors;
  };

  finalize(
    values: Immutable.List<FieldValue>,
    owner: EmptyValue | CompositeValue
  ): Kefir.Property<Immutable.List<FieldValue>> {
    const defaultValues = createDefaultValue(values);
    if (defaultValues) {
      return Kefir.constant(defaultValues);
    }
    return Kefir.constant(values);
  }
}

function getCheckboxState(values: Immutable.List<FieldValue>): CheckboxState {
  if (values.size === 0) {
    return CheckboxState.Unchecked;
  } else if (values.size > 1) {
    return CheckboxState.Indeterminate;
  }

  const value = values.first();
  if (FieldValue.isAtomic(value)) {
    if (value.value.equals(TRUE_VALUE)) {
      return CheckboxState.Checked;
    } else if (value.value.equals(FALSE_VALUE)) {
      return CheckboxState.Unchecked;
    }
  } else if (FieldValue.isEmpty(value)) {
    return CheckboxState.Unchecked;
  }
  return CheckboxState.Indeterminate;
}

function createDefaultValue(values: Immutable.List<FieldValue>): Immutable.List<FieldValue> | undefined {
  const isDefaultValue = values.size === 0 || (values.size === 1 && FieldValue.isEmpty(values.first()));
  if (isDefaultValue) {
    const newValue: LabeledValue = { value: Rdf.literal(false) };
    let newValues = Immutable.List<FieldValue>();
    return newValues.push(FieldValue.fromLabeled(newValue));
  }
  return undefined;
}

MultipleValuesInput.assertStatic(CheckboxInput);

export default CheckboxInput;
