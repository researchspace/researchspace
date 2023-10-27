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
export const INPUT_XSD_DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ssZZ';

// output format patterns for UTC moments (without timezone offset), compatible with ISO and XSD
export const OUTPUT_UTC_DATE_FORMAT = 'YYYY-MM-DD';
export const OUTPUT_UTC_TIME_FORMAT = 'HH:mm:ss';


export type DatePickerMode = 'date' | 'time' | 'dateTime';
type ViewMode = "years" | "months" | "days" | "time";

export interface DatePickerInputProps extends AtomicValueInputProps {
  mode?: DatePickerMode;
  placeholder?: string;
  visualizationMode?: ViewMode; // the starting selection of the datepicker
  utcOffset?: number; // Possibility to specify the UTC timezone offset (in minutes) manually from props
  end?: boolean; // If true, autofill from keyboard goes to the last day (and or the last month) compatible with input
}

export class DatePickerInput extends AtomicValueInput<DatePickerInputProps, {}> {

  
  private get datatype() {
    return this.props.definition.xsdDatatype || vocabularies.xsd.dateTime;
  }

  mode = this.props.mode || getModeFromDatatype(this.datatype);
  end = this.props.end === true || false; // if prop is present AND true


  // Handle autocomplete with keyboard input
  private handleKeyboardInput(value: string): AtomicValue | EmptyValue {
    const detectedFormat = detectDateFormat(value);
    let convertedValue;

    switch (detectedFormat) {
      case 'YYYY':
        convertedValue = this.end ? moment(`${value}-12-31`).endOf('year').format('YYYY-MM-DD') : `${value}-01-01`;
        break;
      case 'YYYY-MM':
        const [yearMM, monthMM] = value.split('-');
        convertedValue = this.end ? moment(`${yearMM}-${monthMM}-01`).endOf('month').format('YYYY-MM-DD') : `${yearMM}-${monthMM}-01`;
        break;
      case 'MM/YYYY':
        const [monthMY, yearMY] = value.split('/');
        convertedValue = this.end ? moment(`${yearMY}-${monthMY}-01`).endOf('month').format('YYYY-MM-DD') : `${yearMY}-${monthMY}-01`;
        break;
      case 'MM-YYYY':
        const [monthMmY, yearMmY] = value.split('-');
        convertedValue = this.end ? moment(`${yearMmY}-${monthMmY}-01`).endOf('month').format('YYYY-MM-DD') : `${yearMmY}-${monthMmY}-01`;
        break;
      case 'DD/MM/YYYY':
        const [dayDMY, monthDMY, yearDMY] = value.split('/');
        convertedValue = `${yearDMY}-${monthDMY}-${dayDMY}`;
        break;
      default:
        return FieldValue.empty;
    }

    const momentValue = moment(convertedValue, OUTPUT_UTC_DATE_FORMAT);

    // Set time to noon for 'date' mode to prevent timezone issues
    if (momentValue.isValid() && this.mode === 'date') {
      momentValue.set('hour', 12);
      convertedValue = momentValue.format(OUTPUT_UTC_DATE_FORMAT);
    }

    return AtomicValue.set(this.props.value, {
      value: Rdf.literal(convertedValue, this.datatype),
    });
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
    const localMoment = this.utcMomentAsIfItWasLocal(utcMoment);

    const visualizationMode = this.props.visualizationMode;

    const displayedDate = localMoment
      ? localMoment
      : dateLiteral
        ? dateLiteral.value
        : rdfNode && rdfNode.isLiteral()
          ? rdfNode.value
          : undefined;

    const placeholder =
      typeof this.props.placeholder === 'undefined'
        ? defaultPlaceholder(this.props.definition, this.mode)
        : this.props.placeholder;

    return D.div(
      { className: 'date-picker-field' },

      createElement(DateTimePicker, {
        className: 'date-picker-field__date-picker',
        onChange: this.onDateSelected, // for keyboard changes
        closeOnSelect: true,
        value: displayedDate as any, // TODO: fix typings (value could be Moment)
        viewMode: visualizationMode,
        dateFormat: this.mode === 'date' || this.mode === 'dateTime' ? OUTPUT_UTC_DATE_FORMAT : null,
        timeFormat: this.mode === 'time' || this.mode === 'dateTime' ? OUTPUT_UTC_TIME_FORMAT : null,
        inputProps: { placeholder },
      }),

      createElement(ValidationMessages, { errors: FieldValue.getErrors(this.props.value) })
    );
  }


  private onDateSelected = (value: string | Moment) => {
    let parsed;

    // Set to noon to avoid timezone issues, in the case of just date input.
    if (this.mode === 'date' && typeof value !== 'string') {
      value.set('hour', 12);
    }

    if (typeof value === 'string') {
      // if user enter a string without using the date picker
      // we pass direclty to validation
      parsed = this.parse(value);
      parsed = this.handleKeyboardInput(value);
    } else {
      // otherwise we format to UTC
      const utcMoment = this.localMomentAsIfItWasUtc(value);
      const mode = getModeFromDatatype(this.datatype);
      const formattedDate =
        mode === 'date'
          ? utcMoment.format(OUTPUT_UTC_DATE_FORMAT)
          : mode === 'time'
            ? utcMoment.format(OUTPUT_UTC_TIME_FORMAT)
            : utcMoment.format();
      parsed = this.parse(formattedDate);
    }
    this.setAndValidate(parsed);
  };


  private parse(isoDate: string): AtomicValue | EmptyValue {
    if (isoDate.length === 0) {
      return FieldValue.empty;
    }
    return AtomicValue.set(this.props.value, {
      value: Rdf.literal(isoDate, this.datatype),
    });
  }


  private utcMomentAsIfItWasLocal(utcMoment: Moment | undefined): Moment | undefined {
    if (!utcMoment) {
      return undefined;
    }

    // If we are in date mode, we do not want to subtract the timezone offset hours (it would go to the day before)
    if (this.mode === "date") {
      return utcMoment.clone().local();
    } else {
      const localOffset = this.props.utcOffset !== undefined ? this.props.utcOffset : moment().utcOffset();
      return utcMoment.clone().subtract(localOffset, 'm').local();
    }
  }

  private localMomentAsIfItWasUtc(localMoment: Moment) {
    const localOffset = this.props.utcOffset !== undefined ? this.props.utcOffset : moment().utcOffset();
    return localMoment.clone().utc().add(localOffset, 'm');
  }

  static makeHandler = AtomicValueInput.makeAtomicHandler;
}


export function getModeFromDatatype(datatype: Rdf.Iri): DatePickerMode {
  const parsed = XsdDataTypeValidation.parseXsdDatatype(datatype);
  if (parsed && parsed.prefix === 'xsd') {
    switch (parsed.localName) {
      case 'date':
        return 'date';
      case 'time':
        return 'time';
    }
  }
  return 'dateTime';
}


// Detect the format from the keyboard input
function detectDateFormat(value: string): string | null {
  const yearPattern = /^\d{4}$/;                  // YYYY
  const yearMonthPattern = /^\d{4}-\d{2}$/;       // YYYY-MM
  const monthYearSlashPattern = /^\d{2}\/\d{4}$/; // MM/YYYY
  const monthYearDashPattern = /^\d{2}-\d{4}$/;   // MM-YYYY
  const fullDatePattern = /^\d{2}\/\d{2}\/\d{4}$/; // DD/MM/YYYY

  if (yearPattern.test(value)) {
    return 'YYYY';
  } else if (yearMonthPattern.test(value)) {
    return 'YYYY-MM';
  } else if (monthYearSlashPattern.test(value)) {
    return 'MM/YYYY';
  } else if (monthYearDashPattern.test(value)) {
    return 'MM-YYYY';
  } else if (fullDatePattern.test(value)) {
    return 'DD/MM/YYYY';
  }

  return null;
}


function dateLiteralFromRdfNode(node: Rdf.Node | undefined): Rdf.Literal | undefined {
  if (!node || typeof node.isLiteral !== 'function' || !node.isLiteral()) {
    return undefined;
}
  const dateString = node.value;
  const types = [vocabularies.xsd.date, vocabularies.xsd.time, vocabularies.xsd.dateTime];
  return find(
    types.map((type) => Rdf.literal(dateString, type)),
    (literal) => XsdDataTypeValidation.validate(literal).success
  );
}

export function utcMomentFromRdfLiteral(literal: Rdf.Literal | undefined): Moment | undefined {
  if (!literal) {
    return undefined;
  }
  console.log("Literal incoming:")
  console.log(literal);

  if (!moment(literal.value, INPUT_XSD_DATE_FORMAT, true).isValid() && 
    !moment(literal.value, INPUT_XSD_TIME_FORMAT, true).isValid() &&
    !moment(literal.value, OUTPUT_UTC_DATE_FORMAT, true).isValid() &&
    !moment(literal.value, OUTPUT_UTC_TIME_FORMAT, true).isValid() &&
    !moment(literal.value, INPUT_XSD_DATETIME_FORMAT, true).isValid()) {
    console.log(`Invalid date format: ${literal.value}`);
    return undefined;
}
  const mode = getModeFromDatatype(literal.datatype);
  const parsedMoment =
    mode === 'date' ? moment.utc(literal.value, INPUT_XSD_DATE_FORMAT)
    : mode === 'time' ? moment.utc(literal.value, INPUT_XSD_TIME_FORMAT)
    : moment.utc(literal.value, INPUT_XSD_DATETIME_FORMAT);
    console.log("Parsing: ")
    console.log(literal.value)
    console.log("Parsed moment is: ")
    console.log(parsedMoment)
  return parsedMoment.isValid() ? parsedMoment : undefined;
}


function defaultPlaceholder(definition: FieldDefinition, mode: DatePickerMode) {
  const valueType = mode === 'time' ? 'time' : 'date';
  const fieldName = (getPreferredLabel(definition.label) || valueType).toLocaleLowerCase();
  return `Select or enter ${fieldName} here...`;
}

SingleValueInput.assertStatic(DatePickerInput);

export default DatePickerInput;
