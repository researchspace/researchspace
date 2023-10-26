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
import { expect } from 'chai';
import * as sinon from 'sinon';
import ReactSelect from 'react-select';

import { Rdf } from 'platform/api/rdf';
import { SelectInput, SelectInputProps, FieldValue, normalizeFieldDefinition } from 'platform/components/forms';

import { shallow, mount } from 'platform-tests/configuredEnzyme';
import { mockConfig } from 'platform-tests/mocks';

mockConfig();

const DATATYPE = Rdf.iri('http://www.w3.org/2001/XMLSchema-datatypes#string');

const definition = normalizeFieldDefinition({
  id: 'nameProp',
  label: 'labelProp',
  xsdDatatype: DATATYPE,
  minOccurs: 1,
  maxOccurs: 1,
  valueSetPattern: '',
});

const baseInputProps: SelectInputProps = {
  for: 'date',
};

const BASIC_PROPS: SelectInputProps = {
  ...baseInputProps,
  definition,
  handler: SelectInput.makeHandler({ definition, baseInputProps }),
  value: FieldValue.empty,
};

describe('SelectInput Component', () => {
  const baseSelect = shallow(createElement(SelectInput, BASIC_PROPS));
  const select = baseSelect.find(ReactSelect);

  it('render with default parameters', () => {
    expect(select).to.have.length(1);
  });

  it('show correct values', () => {
    const val = FieldValue.fromLabeled({
      value: Rdf.iri('http://www.researchspace.org/resource/example/test'),
      label: 'test',
    });
    BASIC_PROPS.value = val;
    const selectFiled = mount(createElement(SelectInput, BASIC_PROPS));
    expect(selectFiled.find(ReactSelect).props().value).to.be.eql(val);
  });

  it('call callback when value is changed', () => {
    const callback = sinon.spy();
    const props: SelectInputProps = { ...BASIC_PROPS, updateValue: callback };
    const wrapper = shallow(createElement(SelectInput, props));
    wrapper.find(ReactSelect).simulate('change');
    expect(callback.called).to.be.true;
  });
});
