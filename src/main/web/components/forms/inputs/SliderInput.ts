/**
 * ResearchSpace
 * Copyright (C) 2025, PHAROS: The International Consortium of Photo Archives
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import { createElement, createFactory, ReactElement, CSSProperties, FormEvent, ChangeEvent } from 'react';
import * as D from 'react-dom-factories';
import { FormGroup, FormControl } from 'react-bootstrap';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

import { Rdf, vocabularies, XsdDataTypeValidation } from 'platform/api/rdf';

import { FieldDefinition, getPreferredLabel } from '../FieldDefinition';
import { FieldValue, AtomicValue, EmptyValue, FieldError, DataState } from '../FieldValues';
import { SingleValueInput, AtomicValueInput, AtomicValueInputProps } from './SingleValueInput';
import { ValidationMessages } from './Decorations';

type ValidationStyle = 'success' | 'warning' | 'error' | undefined;

export interface SliderInputProps extends AtomicValueInputProps {
  /**
   * The minimum value of the slider
   * @default 0
   */
  min?: number;
  /**
   * The maximum value of the slider
   * @default 100
   */
  max?: number;
  /**
   * Value to be added or subtracted on each step the slider makes
   * @default 1
   */
  step?: number;
  /**
   * Datatype for the slider value, either 'integer' or 'decimal'
   * @default 'integer'
   */
  datatype?: 'integer' | 'decimal';
  /**
   * Whether to show the numeric input field
   * @default false
   */
  showInput?: boolean;
  /**
   * Marks on the slider. Object with keys as slider values and values as mark labels.
   * Example: { 0: 'Low', 50: 'Medium', 100: 'High' }
   * @default undefined
   */
  marks?: Record<number, string>;
}

interface State {
  value: number;
}

export class SliderInput extends AtomicValueInput<SliderInputProps, State> {
  static defaultProps: Partial<SliderInputProps> = {
    min: 0,
    max: 100,
    step: 1,
    datatype: 'integer',
    showInput: false,
  };

  private hasFocus = false;

  constructor(props: SliderInputProps, context: any) {
    super(props, context);
    this.state = this.reformatValue(props);
  }

  componentWillReceiveProps(nextProps: SliderInputProps) {
    if (!this.hasFocus) {
      this.setState(this.reformatValue(nextProps));
    }
  }

  render() {
    return D.div(
      { className: 'slider-field', style: {'width': '100%', margin: '15px 3px 30px 3px'} },
      D.div(
        { className: 'slider-field__inputs' },
        this.renderSlider(),
        this.props.showInput ? this.renderNumericInput() : null
      ),
      createElement(ValidationMessages, { errors: FieldValue.getErrors(this.props.value) })
    );
  }

  private reformatValue(props: SliderInputProps): State {
    const rdfNode = FieldValue.asRdfNode(props.value);
    return {
      value: rdfNode ? parseFloat(rdfNode.value) : this.getMinValue(),
    };
  }

  private getMinValue(): number {
    return this.props.min!;
  }

  private getMaxValue(): number {
    return this.props.max!;
  }

  private getStepValue(): number {
    return this.props.step!;
  }

  private getDatatype(): Rdf.Iri {
    return this.props.datatype === 'integer' ? vocabularies.xsd.integer : vocabularies.xsd.decimal;
  }

  private onSliderChange = (value: number) => {
    this.setState({ value });
    this.setAndValidate(this.createValue(value));
  };

  private onInputChange = (event: FormEvent<FormControl>) => {
    const value = parseFloat((event.target as any).value);
    if (!isNaN(value)) {
      this.setState({ value });
      this.setAndValidate(this.createValue(value));
    }
  };

  private createValue(value: number): AtomicValue | EmptyValue {
    if (isNaN(value)) {
      return FieldValue.empty;
    }

    // For integer datatype, round the value
    if (this.props.datatype !== 'decimal') {
      value = Math.round(value);
    }

    const datatype = this.getDatatype();
    const node = Rdf.literal(value.toString(), datatype);
    return AtomicValue.set(this.props.value, { value: node });
  }

  private getStyle(): ValidationStyle {
    if (this.props.dataState === DataState.Verifying) {
      return undefined;
    }
    const value = this.props.value;
    const errors = FieldValue.getErrors(value);
    if (errors.size > 0) {
      return errors.some(FieldError.isPreventSubmit) ? 'error' : 'warning';
    } else {
      return undefined;
    }
  }

  private renderSlider(): ReactElement<any> {
    return createElement(
      'div',
      { className: 'slider-field__slider-container' },
      createElement(Slider, {
        min: this.getMinValue(),
        max: this.getMaxValue(),
        step: this.getStepValue(),
        value: this.state.value,
        onChange: this.onSliderChange,
        disabled: !this.canEdit(),
        marks: this.props.marks,
        included: false,
      })
    );
  }

  private renderNumericInput(): ReactElement<any> {
    return createElement(
      FormGroup,
      { validationState: this.getStyle() },
      createElement(FormControl, {
        className: 'slider-field__numeric-input',
        value: this.state.value,
        type: 'number',
        min: this.getMinValue(),
        max: this.getMaxValue(),
        step: this.getStepValue(),
        onChange: this.onInputChange,
        onFocus: () => {
          this.hasFocus = true;
        },
        onBlur: () => {
          this.hasFocus = false;
          this.setState(this.reformatValue(this.props));
        },
        readOnly: !this.canEdit(),
      })
    );
  }

  static makeHandler = AtomicValueInput.makeAtomicHandler;
}

SingleValueInput.assertStatic(SliderInput);

export default SliderInput;
