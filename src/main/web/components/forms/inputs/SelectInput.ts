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

import { createElement } from 'react';
import * as D from 'react-dom-factories';
import ReactSelect from 'react-select';
import * as Immutable from 'immutable';

import { Cancellation } from 'platform/api/async/Cancellation';
import { Rdf } from 'platform/api/rdf';

import { TemplateItem } from 'platform/components/ui/template';

import { FieldDefinition, getPreferredLabel } from '../FieldDefinition';
import { FieldValue, AtomicValue, EmptyValue, SparqlBindingValue, ErrorKind, DataState } from '../FieldValues';
import { SingleValueInput, AtomicValueInput, AtomicValueInputProps } from './SingleValueInput';
import { ValidationMessages } from './Decorations';
import { queryValues } from '../QueryValues';

export interface SelectInputProps extends AtomicValueInputProps {
  template?: string;
  placeholder?: string;
}

interface State {
  valueSet?: Immutable.List<SparqlBindingValue>;
}

const SELECT_TEXT_CLASS = 'select-text-field';
const OPTION_CLASS = SELECT_TEXT_CLASS + 'option';

export class SelectInput extends AtomicValueInput<SelectInputProps, State> {
  private readonly cancellation = new Cancellation();

  private isLoading = true;

  constructor(props: SelectInputProps, context: any) {
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
      this.cancellation.map(queryValues(definition.valueSetPattern)).observe({
        value: (valueSet) => {
          this.isLoading = false;
          this.setState({ valueSet: Immutable.List(valueSet) });
          this.props.updateValue((v) => v);
        },
        error: (error) => {
          console.error(error);
          this.isLoading = false;
          this.props.updateValue((v) => {
            const nonEmpty = FieldValue.isEmpty(v) ? FieldValue.fromLabeled({ value: Rdf.iri('') }) : v;
            const errors = FieldValue.getErrors(nonEmpty).push({
              kind: ErrorKind.Loading,
              message: `Failed to load value set`,
            });
            return FieldValue.setErrors(nonEmpty, errors);
          });
        },
      });
    } else {
      this.isLoading = false;
    }
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private onValueChanged = (value?: SparqlBindingValue) => {
    this.setAndValidate(this.parseValue(value));
  };

  private parseValue(value: SparqlBindingValue): AtomicValue | EmptyValue {
    // this is for testing purpose only i.e. checking whether callback is called
    if (!value) {
      return FieldValue.empty;
    }

    const findCorresponding = this.state.valueSet.find((v) => v.value.equals(value.value));
    if (!findCorresponding) {
      return FieldValue.empty;
    }

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
      return D.span({ id: option.label, className: OPTION_CLASS }, option.label || option.value.value);
    }
  };

  private valueRenderer = (v: AtomicValue | undefined) => {
    // that is if user adds a new input which get's empty as initial field value
    if (!v) {
      return;
    }

    let valueSet = this.state.valueSet;
    if (valueSet) {
      // try to find the selected value in the pre-computed valueSet
      const bindingValue = valueSet.find((setValue) => setValue.value.equals(v.value));
      // if existing, then use optionRenderer to exploit the template and additional bindings
      if (bindingValue) {
        return this.optionRenderer(bindingValue);
      }
    }

    // fallback rendering i.e. if recovering from state or saved value
    // but value is not any longer in dynamically (on every initialization) computed set
    return D.span({ id: v.label, className: OPTION_CLASS }, v.label || v.value.value);
  };

  render() {
    const definition = this.props.definition;
    const options = this.state.valueSet ? this.state.valueSet.toArray() : new Array<SparqlBindingValue>();

    const inputValue = this.props.value;
    const selectedValue = FieldValue.isAtomic(inputValue) ? inputValue : undefined;

    const placeholder =
      typeof this.props.placeholder === 'undefined'
        ? this.createDefaultPlaceholder(definition)
        : this.props.placeholder;

    return D.div(
      { className: SELECT_TEXT_CLASS },

      createElement(ReactSelect, {
        name: definition.id,
        placeholder: placeholder,
        onChange: this.onValueChanged,
        disabled: !this.canEdit(),
        options: options,
        value: selectedValue,
        optionRenderer: this.optionRenderer,
        valueRenderer: this.valueRenderer,
      }),

      createElement(ValidationMessages, { errors: FieldValue.getErrors(this.props.value) })
    );
  }

  private createDefaultPlaceholder(definition: FieldDefinition): string {
    const fieldName = (getPreferredLabel(definition.label) || 'entity').toLocaleLowerCase();
    return `Select ${fieldName} here...`;
  }

  static makeHandler = AtomicValueInput.makeAtomicHandler;
}

SingleValueInput.assertStatic(SelectInput);

export default SelectInput;
