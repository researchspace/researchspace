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
import { DatetimepickerProps } from 'react-datetime';
import { clone } from 'lodash';

import { expect } from 'chai';
import * as sinon from 'sinon';

import { Rdf, vocabularies } from 'platform/api/rdf';

import {
  AtomicValue,
  DatePickerInput,
  DatePickerInputProps as DatePickerProps,
  DatePickerMode,
  FieldValue,
  normalizeFieldDefinition,
} from 'platform/components/forms';
import {
  OUTPUT_UTC_DATE_FORMAT,
  OUTPUT_UTC_TIME_FORMAT,
  utcMomentFromRdfLiteral,
} from 'platform/components/forms/inputs/DatePickerInput';

import { shallow, mount } from 'platform-tests/configuredEnzyme';
import { mockConfig } from 'platform-tests/mocks';

mockConfig();

const DATE_TIME = 'http://www.w3.org/2001/XMLSchema-datatypes#dateTime';
const DATE = 'http://www.w3.org/2001/XMLSchema-datatypes#date';
const TIME = 'http://www.w3.org/2001/XMLSchema-datatypes#time';

const definition = normalizeFieldDefinition({
  id: 'date1',
  label: 'labelProp',
  xsdDatatype: Rdf.iri(DATE_TIME),
  minOccurs: 1,
  maxOccurs: 1,
  selectPattern: '',
});

const baseInputProps: DatePickerProps = {
  for: 'date1',
  definition,
  mode: undefined,
};

const completeInputProps: DatePickerProps = {
  ...baseInputProps,
  handler: DatePickerInput.makeHandler({ definition, baseInputProps }),
  value: FieldValue.fromLabeled({
    value: Rdf.literal('2016-05-23T10:20:13+05:30', vocabularies.xsd.dateTime),
  }),
};

describe('DatePickerInput Component', () => {
  const datepickerComponent = mount(createElement(DatePickerInput, completeInputProps));
  const datepicker = datepickerComponent.find('DatePickerInput');

  it('render with default parameters', () => {
    expect(datepicker).to.have.length(1);
  });

  describe('modes', () => {
    it('can get mode from props', () => {
      const mode: DatePickerMode = 'date';
      let props = clone(completeInputProps);
      props.mode = mode;
      const component = mount(createElement(DatePickerInput, props));
      const componentProps: DatePickerProps = component.props();
      expect(componentProps.mode).to.be.equal(mode);
    });

    describe('date', () => {
      const props = clone(completeInputProps);
      props.definition.xsdDatatype = Rdf.iri(DATE);

      const component = shallow(createElement(DatePickerInput, props));
      const field = component.find('.date-picker-field__date-picker');
      const fieldProps: DatetimepickerProps = field.props();

      it('correct rendered', () => {
        expect(fieldProps.dateFormat).to.eql(OUTPUT_UTC_DATE_FORMAT);
        expect(fieldProps.timeFormat).to.be.null;
      });

      // TODO temporary skip this test because it behaves strangely in EET timezone
      it.skip('have correct default value', () => {
        const momentDateTime = fieldProps.value as any;
        expect(momentDateTime).to.be.an('object');
        expect(momentDateTime.format(`${OUTPUT_UTC_DATE_FORMAT} ${OUTPUT_UTC_TIME_FORMAT}`)).is.eql(
          '2016-05-23 05:50:13'
        );
      });

      it('pass correct value after change', () => {
        const callback = sinon.spy();
        const clonedProps = clone(completeInputProps);
        clonedProps.updateValue = callback;
        clonedProps.definition.xsdDatatype = Rdf.iri(DATE);
        const wrapper = mount(createElement(DatePickerInput, clonedProps));
        wrapper.find('input').simulate('change', { target: { value: '05/11/22' } });
        const reducer: (previous: FieldValue) => AtomicValue = callback.args[0][0];
        const newValue = reducer(clonedProps.value).value;
        expect(newValue.isLiteral() && newValue.datatype.value).to.be.equal(Rdf.iri(DATE).value);
      });
    });

    describe('time', () => {
      const props = clone(completeInputProps);
      props.definition.xsdDatatype = Rdf.iri(TIME);

      const component = shallow(createElement(DatePickerInput, props));
      const field = component.find('.date-picker-field__date-picker');
      const fieldProps: DatetimepickerProps = field.props();

      it('correct render in time mode', () => {
        expect(fieldProps.dateFormat).to.be.null;
        expect(fieldProps.timeFormat).to.be.equal(OUTPUT_UTC_TIME_FORMAT);
      });
    });

    describe('datetime', () => {
      const props = clone(completeInputProps);
      props.definition.xsdDatatype = Rdf.iri(DATE_TIME);

      const component = shallow(createElement(DatePickerInput, props));
      const field = component.find('.date-picker-field__date-picker');
      const fieldProps: DatetimepickerProps = field.props();

      it('correct render in datetime mode', () => {
        expect(fieldProps.dateFormat).to.eql(OUTPUT_UTC_DATE_FORMAT);
        expect(fieldProps.timeFormat).to.be.equal(OUTPUT_UTC_TIME_FORMAT);
      });
    });
  });

  it('call callback when value is changed', () => {
    const callback = sinon.spy();
    const props: DatePickerProps = { ...completeInputProps, updateValue: callback };
    const wrapper = mount(createElement(DatePickerInput, props));
    wrapper.find('input').simulate('change', { target: { value: '05/11/22 11:55:22' } });
    expect(callback.called).to.be.true;
  });
});

describe('localMomentFromRdfLiteral return correct normalized UTC value', () => {
  it('for dateTime is already normalized', () => {
    const dateTime = '2016-05-23T10:20:13Z';
    const value = Rdf.literal(dateTime, vocabularies.xsd.dateTime);
    expect(utcMomentFromRdfLiteral(value).creationData().isUTC).to.be.true;
    expect(utcMomentFromRdfLiteral(value).format()).to.be.eql('2016-05-23T10:20:13Z');
  });

  it('for dateTime with offset +2', () => {
    const dateTime = '2016-05-23T10:20:13+00:00';
    const value = Rdf.literal(dateTime, vocabularies.xsd.dateTime);
    expect(utcMomentFromRdfLiteral(value).creationData().isUTC).to.be.true;
    expect(utcMomentFromRdfLiteral(value).format()).to.be.eql('2016-05-23T10:20:13Z');
  });

  it('for dateTime with offset +2', () => {
    const dateTime = '2016-05-23T10:20:13+02:00';
    const value = Rdf.literal(dateTime, vocabularies.xsd.dateTime);
    expect(utcMomentFromRdfLiteral(value).creationData().isUTC).to.be.true;
    expect(utcMomentFromRdfLiteral(value).format()).to.be.eql('2016-05-23T08:20:13Z');
  });

  it('for dateTime with offset -3', () => {
    const dateTime = '2016-05-23T10:20:13-03:00';
    const value = Rdf.literal(dateTime, vocabularies.xsd.dateTime);
    expect(utcMomentFromRdfLiteral(value).creationData().isUTC).to.be.true;
    expect(utcMomentFromRdfLiteral(value).format()).to.be.eql('2016-05-23T13:20:13Z');
  });

  it('for date with offset', () => {
    const dateTime = '2002-09-24-06:00';
    const value = Rdf.literal(dateTime, vocabularies.xsd.date);
    expect(utcMomentFromRdfLiteral(value).creationData().isUTC).to.be.true;
    expect(utcMomentFromRdfLiteral(value).format()).to.be.eql('2002-09-24T06:00:00Z');
  });

  it('for date without offset', () => {
    const dateTime = '2002-09-24';
    const value = Rdf.literal(dateTime, vocabularies.xsd.date);
    expect(utcMomentFromRdfLiteral(value).creationData().isUTC).to.be.true;
    expect(utcMomentFromRdfLiteral(value).format()).to.be.eql('2002-09-24T00:00:00Z');
  });

  it('for invalid date', () => {
    const dateTime = 'not a date';
    const value = Rdf.literal(dateTime, vocabularies.xsd.dateTime);
    expect(utcMomentFromRdfLiteral(value)).to.be.undefined;
  });

  it('for undefined', () => {
    expect(utcMomentFromRdfLiteral(undefined)).to.be.undefined;
  });
});
