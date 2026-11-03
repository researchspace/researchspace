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

/**
 * <semantic-form-historical-year-input for='date'></semantic-form-historical-year-input>
 *
 * A text input for xsd:gYear that accepts "30BC", "30 BC", "30 BCE", "AD 30", "1886" or "-30".
 * It stores "-0030"^^xsd:gYear and, when the form is reloaded, shows "30 BC" again.
 * See HistoricalYear.ts for the storage convention.
 */
import { createElement, FormEvent } from 'react';
import * as D from 'react-dom-factories';
import { FormGroup, FormControl } from 'react-bootstrap';

import { Rdf, vocabularies, XsdDataTypeValidation } from 'platform/api/rdf';

import { FieldValue, AtomicValue, EmptyValue, FieldError, ErrorKind } from '../FieldValues';
import {
  SingleValueInput,
  SingleValueHandlerProps,
  AtomicValueInput,
  AtomicValueInputProps,
  AtomicValueHandler,
} from './SingleValueInput';
import { ValidationMessages } from './Decorations';
import { parseHistoricalYear, toGYearLexical, formatGYear } from './HistoricalYear';

const XSD_GYEAR = Rdf.iri('http://www.w3.org/2001/XMLSchema#gYear');

export interface HistoricalYearInputProps extends AtomicValueInputProps {
  placeholder?: string;
  /** Years below this get an "AD" prefix when displayed (default 1000). */
  adBelow?: number;
}

interface State {
  text: string;
}

export class HistoricalYearInput extends AtomicValueInput<HistoricalYearInputProps, State> {
  private hasFocus = false;

  constructor(props: HistoricalYearInputProps, context: any) {
    super(props, context);
    this.state = { text: this.displayText(props) };
  }

  componentWillReceiveProps(nextProps: HistoricalYearInputProps) {
    super.componentWillReceiveProps(nextProps);
    if (!this.hasFocus) {
      this.setState({ text: this.displayText(nextProps) });
    }
  }

  /** Stored literal -> "30 BC" */
  private displayText(props: HistoricalYearInputProps): string {
    const node = FieldValue.asRdfNode(props.value);
    return node ? formatGYear(node.value, { adBelow: props.adBelow }) : '';
  }

  private onChange = (event: FormEvent<FormControl>) => {
    const text = (event.target as any).value as string;
    this.setState({ text });
    this.setAndValidate(this.createValue(text));
  };

  private createValue(text: string): AtomicValue | EmptyValue {
    if (text.trim().length === 0) {
      return FieldValue.empty;
    }
    const year = parseHistoricalYear(text);
    // Text that can't be parsed is kept as typed; HistoricalYearHandler flags it.
    const lexical = year === undefined ? text.trim() : toGYearLexical(year);
    return AtomicValue.set(this.props.value, {
      value: Rdf.literal(lexical, XSD_GYEAR),
    });
  }

  render() {
    const errors = FieldValue.getErrors(this.props.value);
    const hasError = errors.some(FieldError.isPreventSubmit);
    return D.div(
      { className: 'plain-text-field' },
      createElement(
        FormGroup,
        { validationState: hasError ? 'error' : undefined },
        createElement(FormControl, {
          className: 'plain-text-field__text',
          type: 'text',
          value: this.state.text,
          placeholder: this.props.placeholder ?? 'e.g. 30 BC, AD 79, 1886',
          onChange: this.onChange,
          onFocus: () => {
            this.hasFocus = true;
          },
          onBlur: () => {
            this.hasFocus = false;
            // normalise what was typed: "30bc" -> "30 BC"
            this.setState({ text: this.displayText(this.props) });
          },
        })
      ),
      createElement(ValidationMessages, { errors })
    );
  }

  static makeHandler(props: SingleValueHandlerProps<HistoricalYearInputProps>) {
    return new HistoricalYearHandler(props);
  }
}

/**
 * Standard atomic validation, plus an input error for anything that is not a historical
 * year, including year 0 ("0000" is valid xsd:gYear syntax, but Blazegraph rejects it and
 * it has no meaning in BC/AD numbering).
 */
class HistoricalYearHandler extends AtomicValueHandler {
  constructor(props: SingleValueHandlerProps<HistoricalYearInputProps>) {
    // A field without an xsdDatatype is normalised to xsd:anyURI; for this input assume xsd:gYear.
    const declared = props.definition && props.definition.xsdDatatype;
    const unset = !declared || XsdDataTypeValidation.sameXsdDatatype(declared, vocabularies.xsd.anyURI);
    const definition = props.definition && { ...props.definition, xsdDatatype: unset ? XSD_GYEAR : declared };
    super({ ...props, definition });
  }

  validate(selected: EmptyValue): EmptyValue;
  validate(selected: FieldValue): AtomicValue;
  validate(selected: FieldValue): AtomicValue | EmptyValue {
    const validated = super.validate(selected);
    if (FieldValue.isEmpty(validated)) {
      return validated;
    }
    const node = FieldValue.asRdfNode(validated);
    if (node && node.isLiteral() && parseHistoricalYear(node.value) === undefined) {
      const hasInputError = validated.errors.some((e) => e.kind === ErrorKind.Input);
      if (!hasInputError) {
        return AtomicValue.set(validated, {
          errors: validated.errors.push({
            kind: ErrorKind.Input,
            message: `"${node.value}" is not a year. Use e.g. 30 BC, AD 79 or 1886 (there is no year 0).`,
          }),
        });
      }
    }
    return validated;
  }
}

SingleValueInput.assertStatic(HistoricalYearInput);

export default HistoricalYearInput;
