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

import { DOM as D, createElement } from 'react';
import * as ReactSelect from 'react-select';

import { TemplateItem } from 'platform/components/ui/template';

import { FieldDefinition } from '../FieldDefinition';
import { FieldValue, AtomicValue, EmptyValue, SparqlBindingValue } from '../FieldValues';
import { AtomicValueInput, AtomicValueInputProps } from './SingleValueInput';
import { ValidationMessages } from './Decorations';

export interface SelectInputProps extends AtomicValueInputProps {
  template?: string;
  placeholder?: string;
}

const SELECT_TEXT_CLASS = 'select-text-field';
const OPTION_CLASS = SELECT_TEXT_CLASS + 'option';

export class SelectInput extends AtomicValueInput<SelectInputProps, {}> {
  constructor(props: SelectInputProps, context: any) {
    super(props, context);
    this.onValueChanged = this.onValueChanged;
  }

  private onValueChanged = (value?: SparqlBindingValue) => {
    this.setAndValidate(this.parseValue(value));
  }

  private parseValue(value: SparqlBindingValue): AtomicValue | EmptyValue {
    // this is for testing purpose only i.e. checking whether callback is called
    if (!value) { return FieldValue.empty; }

    const findCorresponding = this.props.valueSet
      .find(v => v.value.equals(value.value));
    if (!findCorresponding) { return FieldValue.empty; }

    // turn into field value for standard validation calls
    const corresponding: Partial<AtomicValue> = {
      value: findCorresponding.value,
      label: findCorresponding.label,
    };
    return AtomicValue.set(this.props.value, corresponding);
  }

  private optionRenderer = (option: SparqlBindingValue) => {
    if (this.props.template !== undefined) {
      return createElement(TemplateItem, {
        template: {
          source: this.props.template,
          options: option.binding,
        },
      });
    } else {
      // default option template
      return D.span(
        {id: option.label, className: OPTION_CLASS}, option.label || option.value.value
      );
    }
  }

  private valueRenderer = (v: AtomicValue | undefined) => {
    // that is if user adds a new input which get's empty as initial field value
    if (!v) { return; }

    let valueSet = this.props.valueSet;
    if (valueSet) {
      // try to find the selected value in the pre-computed valueSet
      const bindingValue = valueSet.find(setValue => setValue.value.equals(v.value));
      // if existing, then use optionRenderer to exploit the template and additional bindings
      if (bindingValue) {
        return this.optionRenderer(bindingValue);
      }
    }

    // fallback rendering i.e. if recovering from state or saved value
    // but value is not any longer in dynamically (on every initialization) computed set
    return D.span(
      {id: v.label, className: OPTION_CLASS}, v.label || v.value.value
    );
  }

  render() {
    const definition = this.props.definition;
    const options = this.props.valueSet
      ? this.props.valueSet.toArray()
      : new Array<SparqlBindingValue>();

    const inputValue = this.props.value;
    const selectedValue = FieldValue.isAtomic(inputValue) ? inputValue : undefined;

    const placeholder = typeof this.props.placeholder === 'undefined'
      ? this.createDefaultPlaceholder(definition) : this.props.placeholder;

    return D.div(
      {className: SELECT_TEXT_CLASS},

      createElement(ReactSelect, {
        name: definition.id,
        placeholder: placeholder,
        onChange: this.onValueChanged,
        disabled: !this.canEdit,
        options: options,
        value: selectedValue,
        optionRenderer: this.optionRenderer,
        valueRenderer: this.valueRenderer,
      }),

      createElement(ValidationMessages, {errors: FieldValue.getErrors(this.props.value)}),
    );
  }

  private createDefaultPlaceholder(definition: FieldDefinition): string {
    return `Select ${(definition.label || 'entity').toLocaleLowerCase()} here...`;
  }
}

export default SelectInput;
