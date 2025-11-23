
import { createElement } from 'react';
import { clone } from 'lodash';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Rdf, vocabularies } from 'platform/api/rdf';

import {
  AtomicValue,
  DatePickerInput,
  DatePickerInputProps as DatePickerProps,
  FieldValue,
  normalizeFieldDefinition,
} from 'platform/components/forms';
import { utcMomentFromRdfLiteral } from 'platform/components/forms/inputs/DatePickerInput';

import { mockConfig } from 'platform-tests/mocks';

mockConfig();

const DATE_TIME = 'http://www.w3.org/2001/XMLSchema-datatypes#dateTime';
const DATE = 'http://www.w3.org/2001/XMLSchema-datatypes#date';

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
  it('renders with default parameters', () => {
    render(createElement(DatePickerInput, completeInputProps));
    expect(screen.getByRole('textbox')).to.exist;
  });

  it('calls callback when value is changed', async () => {
    const callback = sinon.spy();
    const props: DatePickerProps = { ...completeInputProps, updateValue: callback };
    render(createElement(DatePickerInput, props));
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '2022-11-05 11:55:22');
    input.blur();
    expect(callback.called).to.be.true;
  });
 
/* TODO: FIX NEEDED HERE AS THIS DOES NOT PASS */
/*
  it('pass correct value after change', async () => {
    const callback = sinon.spy();
    const clonedProps = clone(completeInputProps);
    clonedProps.updateValue = callback;
    clonedProps.definition.xsdDatatype = Rdf.iri(DATE);
    render(createElement(DatePickerInput, clonedProps));
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '2022-11-05');
    input.blur();

    // In a real scenario, we would check the input's value or what is rendered.
    // Here we check if the callback was called, and inspect the arguments it was called with.
    expect(callback.called).to.be.true;
    const reducer: (previous: FieldValue) => AtomicValue = callback.args[0][0];
    const newValue = reducer(clonedProps.value).value;
    expect(newValue?.isLiteral() && newValue.datatype.value).to.be.equal(Rdf.iri(DATE).value);
  }); */
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
