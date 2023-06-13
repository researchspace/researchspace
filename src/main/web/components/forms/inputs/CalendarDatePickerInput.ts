/**
 * CalendarDatePicker
 * Copyright (C) 2023, Robert Casties, MPIWG
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

import DatePicker from 'react-multi-date-picker';
import DateObject from 'react-date-object';
import * as GregorianCalendar from 'react-date-object/calendars/gregorian';
import * as JulianCalendar from 'date-object/calendars/cjs/julian';
import * as ArabicCalendar from 'react-date-object/calendars/arabic';
import * as PersianCalendar from 'react-date-object/calendars/persian';
import * as JalaliCalendar from 'react-date-object/calendars/jalali';
import * as IndianCalendar from 'react-date-object/calendars/indian';
import * as GregorianEnLocale from 'react-date-object/locales/gregorian_en';
import * as ArabicEnLocale from 'react-date-object/locales/arabic_en';
import * as PersianEnLocale from 'react-date-object/locales/persian_en';
import * as IndianEnLocale from 'react-date-object/locales/indian_en';

import { Rdf, vocabularies, XsdDataTypeValidation } from 'platform/api/rdf';

import { FieldDefinition, getPreferredLabel } from '../FieldDefinition';
import { FieldValue, AtomicValue, EmptyValue } from '../FieldValues';
import { SingleValueInput, AtomicValueInput, AtomicValueInputProps } from './SingleValueInput';
import { ValidationMessages } from './Decorations';

import './calendardate.scss';

// input format patterns include timezone offset to be compatible with XSD specification(?)
export const INPUT_XSD_DATE_FORMAT = 'YYYY-MM-DD';
// output format patterns for UTC moments (without timezone offset), compatible with ISO and XSD
export const ISO_DATE_FORMAT = 'YYYY-MM-DD';

export type DatePickerMode = 'day' | 'year';
export type DatePickerCalendar = 'gregorian' | 'islamic' | 'persian' | 'jalali' | 'indian' | 'julian';

export interface CalendarDatePickerInputProps extends AtomicValueInputProps {
  mode?: DatePickerMode;
  yearstart?: boolean;
  yearend?: boolean;
  calendar?: DatePickerCalendar;
  calendarselector?: boolean;
  placeholder?: string;
}

export interface CalendarDatePickerInputState {
  mode?: DatePickerMode;
  calendar?: DatePickerCalendar;
}

export class CalendarDatePickerInput extends AtomicValueInput<CalendarDatePickerInputProps, CalendarDatePickerInputState> {
  constructor(props: CalendarDatePickerInputProps, context: any) {
    super(props, context);
    this.state = {
      mode: props.mode || 'day',
      calendar: props.calendar || 'gregorian',
    };
  }

  private get datatype() {
    return this.props.definition.xsdDatatype || vocabularies.xsd.dateTime;
  }
  
  render() {
    const rdfNode = FieldValue.asRdfNode(this.props.value);
    const dateLiteral = dateLiteralFromRdfNode(rdfNode);
    const dateObject = dateObjectFromRdfLiteral(dateLiteral);

    // mode: day, year
    const mode = this.state.mode || this.props.mode || 'day';
    let format = 'YYYY-MM-DD';
    let yearPicker = false;
    if (mode === 'year') {
      yearPicker = true;
      format = 'YYYY';
      dateObject?.setFormat(format);
    }
    
    // calendar: gregorian, islamic, ...
    const calendar = this.state.calendar || this.props.calendar || 'gregorian';
    let calendarObject: any;
    let localeObject: any;
    switch (calendar) {
      case 'gregorian':
        calendarObject = GregorianCalendar;
        localeObject = GregorianEnLocale;
        break;
      case 'islamic':
        calendarObject = ArabicCalendar;
        localeObject = ArabicEnLocale;
        break;
      case 'persian':
        calendarObject = PersianCalendar;
        localeObject = PersianEnLocale;
        break;
      case 'jalali':
        calendarObject = JalaliCalendar;
        localeObject = PersianEnLocale;
        break;
      case 'indian':
        calendarObject = IndianCalendar;
        localeObject = IndianEnLocale;
        break;
      case 'julian':
        calendarObject = JulianCalendar;
        localeObject = GregorianEnLocale;
        break;
    }

    const displayedDate = dateObject
      ? dateObject
      : dateLiteral
      ? dateLiteral.value
      : rdfNode && rdfNode.isLiteral()
      ? rdfNode.value
      : undefined;

    const placeholder =
      typeof this.props.placeholder === 'undefined'
        ? defaultPlaceholder(this.props.definition, mode)
        : this.props.placeholder;

    return D.div(
      { className: 'date-picker-field' + this.props.calendarselector ? ' with-selector' : '' },

      createElement(DatePicker, {
        inputClass: 'form-control',
        onChange: this.onDateSelected, // for keyboard changes
        onlyYearPicker: yearPicker,
        calendar: calendarObject,
        locale: localeObject,
        value: displayedDate,
        format: format,
        placeholder: placeholder
      }),
      
      // create calendar selector element if necessary
      this.props.calendarselector ? D.label(
        { className: 'caldate-label'}, 
        'Calendar',
        D.select(
          { value: this.state.calendar, onChange: this.onCalendarChange }, 
          D.option({value: 'gregorian'}, 'gregorian'),
          D.option({value: 'islamic'}, 'islamic'),
          D.option({value: 'persian'}, 'persian'),
          D.option({value: 'jalali'}, 'jalali'),
          D.option({value: 'indian'}, 'indian'),
          D.option({value: 'julian'}, 'julian'),
        )
      ) : null,

      createElement(ValidationMessages, { errors: FieldValue.getErrors(this.props.value) })
    );
  }

  componentDidUpdate(prevProps) {
    if (prevProps.mode !== this.props.mode) {
      this.setState({mode: this.props.mode});
    }
    if (prevProps.calendar !== this.props.calendar) {
      this.setState({calendar: this.props.calendar});
    }
  }

  private onCalendarChange = (event: any) => {
    const value = event.target.value;
    this.setState({ calendar : value });
  }

  onDateSelected = (value: string | DateObject) => {
    let parsed: AtomicValue | EmptyValue;
    if (!value) {
      parsed = EmptyValue;
    } else if (typeof value === 'string') {
      // if user enter a string without using the date picker
      // we pass directly to validation 
      // TODO: convert to gregorian? 
      parsed = this.parse(value);
    } else {
      // assume value is date object and convert to gregorian calendar
      const calendarDate = new DateObject(value);
      if (this.state.mode === 'year') {
        // set day to first or last in year mode
        if (this.props.yearstart) {
          calendarDate.toFirstOfYear();
        } else if (this.props.yearend) {
          calendarDate.toLastOfYear();
        }
      }
      const isoDate = calendarDate.convert(GregorianCalendar).format(ISO_DATE_FORMAT);
      parsed = this.parse(isoDate);
    }
    this.setAndValidate(parsed);
  };

  private parse(isoDate: string): AtomicValue | EmptyValue {
    if (isoDate.length === 0) {
      return FieldValue.empty;
    }
    if (isoDate.length < 10) {
      // fix missing leading zeroes
      isoDate = '0'.repeat(10 - isoDate.length) + isoDate;
    }
    return AtomicValue.set(this.props.value, {
      value: Rdf.literal(isoDate, this.datatype),
    });
  }

  static makeHandler = AtomicValueInput.makeAtomicHandler;
}

function dateLiteralFromRdfNode(node: Rdf.Node | undefined): Rdf.Literal | undefined {
  if (!node || !node.isLiteral()) {
    return undefined;
  }
  const dateString = node.value;
  const types = [vocabularies.xsd.date, vocabularies.xsd.time, vocabularies.xsd.dateTime];
  return find(
    types.map((type) => Rdf.literal(dateString, type)),
    (literal) => XsdDataTypeValidation.validate(literal).success
  );
}

export function dateObjectFromRdfLiteral(literal: Rdf.Literal | undefined): DateObject | undefined {
  if (!literal) {
    return undefined;
  }
  const parsedDate = new DateObject({date: literal.value, format: INPUT_XSD_DATE_FORMAT});
  return parsedDate;
}

function defaultPlaceholder(definition: FieldDefinition, mode: DatePickerMode) {
  const fieldName = (getPreferredLabel(definition.label) || mode).toLocaleLowerCase();
  return `Select or enter ${fieldName} here...`;
}

SingleValueInput.assertStatic(CalendarDatePickerInput);

export default CalendarDatePickerInput;
