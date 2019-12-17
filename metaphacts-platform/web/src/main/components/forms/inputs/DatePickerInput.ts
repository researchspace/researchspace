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

import { find } from 'lodash';
import { createElement } from 'react';
import * as D from 'react-dom-factories';

import * as DateTimePicker from 'react-datetime';

import * as moment from 'moment';
import Moment = moment.Moment;

import { Rdf, vocabularies, XsdDataTypeValidation } from 'platform/api/rdf';

import { FieldDefinition, getPreferredLabel } from '../FieldDefinition';
import { FieldValue, AtomicValue, EmptyValue } from '../FieldValues';
import { SingleValueInput, AtomicValueInput, AtomicValueInputProps } from './SingleValueInput';
import { ValidationMessages } from './Decorations';

import './datetime.scss';

// input format patterns include timezone offset to be compatible with XSD specification
export const INPUT_XSD_DATE_FORMAT = 'YYYY-MM-DDZZ';
export const INPUT_XSD_TIME_FORMAT = 'HH:mm:ssZZ';
// output format patterns for UTC moments (without timezone offset), compatible with ISO and XSD
export const OUTPUT_UTC_DATE_FORMAT = 'YYYY-MM-DD';
export const OUTPUT_UTC_TIME_FORMAT = 'HH:mm:ss';

export type DatePickerMode = 'date' | 'time' | 'dateTime';

export interface DatePickerInputProps extends AtomicValueInputProps {
  mode?: DatePickerMode;
  placeholder?: string;
}

export class DatePickerInput extends AtomicValueInput<DatePickerInputProps, {}> {
  private get datatype() {
    return this.props.definition.xsdDatatype || vocabularies.xsd.dateTime;
  }

  render() {
    const rdfNode = FieldValue.asRdfNode(this.props.value);
    const dateLiteral = dateLiteralFromRdfNode(rdfNode);
    const utcMoment = utcMomentFromRdfLiteral(dateLiteral);
    // Important! react-datetime becomes really buggy when Moment value
    // with "UTC" internal representation is provided as value, so we need to:
    // 1. intially convert it to "local" internal representation
    //    as if current time zone was UTC+00;
    // 2. after date picker returns changed Momeent value we should
    //    convert it back using `localMomentAsIfItWasUtc()`
    const localMoment = utcMomentAsIfItWasLocal(utcMoment);

    const mode = this.props.mode || getModeFromDatatype(this.datatype);

    const displayedDate = (
      localMoment ? localMoment :
      dateLiteral ? dateLiteral.value :
      (rdfNode && rdfNode.isLiteral()) ? rdfNode.value :
      undefined
    );

    const placeholder = typeof this.props.placeholder === 'undefined'
      ? defaultPlaceholder(this.props.definition, mode) : this.props.placeholder;

    return D.div(
      {className: 'date-picker-field'},

      createElement(DateTimePicker, {
        className: 'date-picker-field__date-picker',
        onChange: this.onDateSelected, // for keyboard changes
        closeOnSelect: true,
        value: displayedDate as any, // TODO: fix typings (value could be Moment)
        viewMode: mode === 'time' ? 'time' : 'days',
        dateFormat: (mode === 'date' || mode === 'dateTime') ? OUTPUT_UTC_DATE_FORMAT : null,
        timeFormat: (mode === 'time' || mode === 'dateTime') ? OUTPUT_UTC_TIME_FORMAT : null,
        inputProps: {placeholder},
      }),

      createElement(ValidationMessages, {errors: FieldValue.getErrors(this.props.value)})
    );
  }

  private onDateSelected = (value: string | Moment) => {
    let parsed;
    if (typeof value === 'string') {
      // if user enter a string without using the date picker
      // we pass direclty to validation
      parsed = this.parse(value);
    } else {
      // otherwise we format to UTC
      const utcMoment = localMomentAsIfItWasUtc(value);
      const mode = getModeFromDatatype(this.datatype);
      const formattedDate = (
        mode === 'date' ? utcMoment.format(OUTPUT_UTC_DATE_FORMAT) :
        mode === 'time' ? utcMoment.format(OUTPUT_UTC_TIME_FORMAT) :
        utcMoment.format()
      );
      parsed = this.parse(formattedDate);
    }
    this.setAndValidate(parsed);
  }

  private parse(isoDate: string): AtomicValue | EmptyValue {
    if (isoDate.length === 0) { return FieldValue.empty; }
    return AtomicValue.set(this.props.value, {
      value: Rdf.literal(isoDate, this.datatype),
    });
  }

  static makeHandler = AtomicValueInput.makeAtomicHandler;
}

export function getModeFromDatatype(datatype: Rdf.Iri): DatePickerMode {
  const parsed = XsdDataTypeValidation.parseXsdDatatype(datatype);
  if (parsed && parsed.prefix === 'xsd') {
    switch (parsed.localName) {
      case 'date': return 'date';
      case 'time': return 'time';
    }
  }
  return 'dateTime';
}

function dateLiteralFromRdfNode(node: Rdf.Node | undefined): Rdf.Literal | undefined {
  if (!node || !node.isLiteral()) { return undefined; }
  const dateString = node.value;
  const types = [vocabularies.xsd.date, vocabularies.xsd.time, vocabularies.xsd.dateTime];
  return find(
    types.map(type => Rdf.literal(dateString, type)),
    literal => XsdDataTypeValidation.validate(literal).success);
}

export function utcMomentFromRdfLiteral(literal: Rdf.Literal | undefined): Moment | undefined {
  if (!literal) { return undefined; }
  const mode = getModeFromDatatype(literal.datatype);
  const parsedMoment = (
    mode === 'date' ? moment.utc(literal.value, INPUT_XSD_DATE_FORMAT) :
    mode === 'time' ? moment.utc(literal.value, INPUT_XSD_TIME_FORMAT) :
    moment.utc(literal.value)
  );
  return parsedMoment.isValid() ? parsedMoment : undefined;
}

function utcMomentAsIfItWasLocal(utcMoment: Moment | undefined): Moment | undefined {
  if (!utcMoment) { return undefined; }
  const localOffset = moment().utcOffset();
  return utcMoment.clone().subtract(localOffset, 'm').local();
}

function localMomentAsIfItWasUtc(localMoment: Moment) {
  const localOffset = moment().utcOffset();
  return localMoment.clone().utc().add(localOffset, 'm');
}

function defaultPlaceholder(definition: FieldDefinition, mode: DatePickerMode) {
  const valueType = mode === 'time' ? 'time' : 'date';
  const fieldName = (getPreferredLabel(definition.label) || valueType).toLocaleLowerCase();
  return `Select or enter ${fieldName} here...`;
}

SingleValueInput.assertStatic(DatePickerInput);

export default DatePickerInput;
