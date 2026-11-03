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
import * as sinon from 'sinon';
import { expect } from 'chai';

import { Rdf } from 'platform/api/rdf';
import {
  AtomicValue,
  EmptyValue,
  FieldValue,
  FieldError,
  normalizeFieldDefinition,
  HistoricalYearInput,
  HistoricalYearInputProps,
  parseHistoricalYear,
  toGYearLexical,
  formatGYear,
} from 'platform/components/forms';

import { mount } from 'platform-tests/configuredEnzyme';
import { mockConfig } from 'platform-tests/mocks';

import { PROPS as BASIC_PROPS } from './fixturies/FieldProps';

mockConfig();

const XSD_GYEAR = Rdf.iri('http://www.w3.org/2001/XMLSchema#gYear');

function propsFor(xsdDatatype?: Rdf.Iri, value: AtomicValue | EmptyValue = FieldValue.empty): HistoricalYearInputProps {
  const definition = normalizeFieldDefinition({
    id: 'year',
    label: 'Year',
    xsdDatatype,
    maxOccurs: 1,
    selectPattern: '',
  });
  const baseInputProps = { for: 'year' };
  return {
    ...BASIC_PROPS,
    definition,
    handler: HistoricalYearInput.makeHandler({ definition, baseInputProps }),
    value,
  };
}

/** Types text into the input and returns the value the form would store. */
function typeInto(props: HistoricalYearInputProps, text: string) {
  const callback = sinon.spy();
  const wrapper = mount(createElement(HistoricalYearInput, { ...props, updateValue: callback }));
  wrapper.find('input').simulate('change', { target: { value: text } });
  expect(callback.called).to.be.true;
  return callback.lastCall.args[0](FieldValue.empty);
}

describe('HistoricalYear conversion', () => {
  it('parses BC years in common spellings', () => {
    for (const text of ['30BC', '30 BC', '30bc', '30 B.C.', '30 BCE', '-30', '-0030', '-0030Z']) {
      expect(parseHistoricalYear(text), text).to.equal(-30);
    }
  });

  it('parses AD years', () => {
    for (const text of ['AD 30', '30 AD', '30 CE', '30', '0030']) {
      expect(parseHistoricalYear(text), text).to.equal(30);
    }
    expect(parseHistoricalYear('1886')).to.equal(1886);
    expect(parseHistoricalYear('12026')).to.equal(12026);
  });

  it('rejects year zero and unparseable text', () => {
    for (const text of ['0', '0 BC', '0000', 'abc', '30 XY', '']) {
      expect(parseHistoricalYear(text), text).to.be.undefined;
    }
  });

  it('writes xsd:gYear lexical forms without a year zero', () => {
    expect(toGYearLexical(-30)).to.equal('-0030');
    expect(toGYearLexical(-1)).to.equal('-0001');
    expect(toGYearLexical(1)).to.equal('0001');
    expect(toGYearLexical(800)).to.equal('0800');
    expect(toGYearLexical(12026)).to.equal('12026');
  });

  it('formats stored values for display', () => {
    expect(formatGYear('-0030')).to.equal('30 BC');
    expect(formatGYear('0079')).to.equal('AD 79');
    expect(formatGYear('1886')).to.equal('1886');
    expect(formatGYear('0079', { adBelow: 0 })).to.equal('79');
    expect(formatGYear('not a year')).to.equal('not a year');
  });

  it('round-trips typed input through storage', () => {
    for (const [typed, shown] of [
      ['30BC', '30 BC'],
      ['44 BCE', '44 BC'],
      ['AD 79', 'AD 79'],
      ['1886', '1886'],
    ]) {
      expect(formatGYear(toGYearLexical(parseHistoricalYear(typed)))).to.equal(shown);
    }
  });
});

describe('HistoricalYearInput component', () => {
  it('shows a stored BC year as "30 BC"', () => {
    const props = propsFor(XSD_GYEAR, FieldValue.fromLabeled({ value: Rdf.literal('-0030', XSD_GYEAR) }));
    const wrapper = mount(createElement(HistoricalYearInput, props));
    expect(wrapper.find('input').prop('value')).to.equal('30 BC');
  });

  it('stores "30BC" as "-0030"^^xsd:gYear', () => {
    for (const datatype of [XSD_GYEAR, undefined]) {
      const value = typeInto(propsFor(datatype), '30BC');
      const node = FieldValue.asRdfNode(value) as Rdf.Literal;
      expect(node.value).to.equal('-0030');
      expect(node.datatype.value).to.equal(XSD_GYEAR.value);
      expect(FieldValue.getErrors(value).some(FieldError.isPreventSubmit)).to.be.false;
    }
  });

  it('blocks saving text that is not a year, including year 0', () => {
    for (const text of ['abc', '0', '0000', '0 BC']) {
      const value = typeInto(propsFor(XSD_GYEAR), text);
      expect(FieldValue.getErrors(value).some(FieldError.isPreventSubmit), text).to.be.true;
    }
  });
});
