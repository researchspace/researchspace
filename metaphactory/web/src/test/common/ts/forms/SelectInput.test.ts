/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

import { createElement } from 'react';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { mount, shallow } from 'enzyme';
import * as Immutable from 'immutable';

import { Rdf } from 'platform/api/rdf';
import {
  SelectInput, SelectInputProps, SparqlBindingValue, FieldValue, normalizeFieldDefinition,
} from 'platform/components/forms';

const DATATYPE = Rdf.iri('http://www.w3.org/2001/XMLSchema-datatypes#string');

const VALUE: SparqlBindingValue = {
  value: Rdf.literal('http://www.metaphacts.com/resource/example/test'),
  label: 'label',
  binding: {
    value: Rdf.literal('http://www.metaphacts.com/resource/example/test'),
    label: Rdf.literal('label'),
  },
};

const BASIC_PROPS: SelectInputProps = {
  definition: normalizeFieldDefinition({
    id: 'nameProp',
    label: 'labelProp',
    xsdDatatype: DATATYPE,
    minOccurs: 1,
    maxOccurs: 1,
    valueSetPattern: '',
  }),
  for: 'date',
  value: FieldValue.empty,
  valueSet: Immutable.List<SparqlBindingValue>([VALUE]),
};

describe('SelectInput Component', () => {
  const baseSelect = shallow(createElement(SelectInput, BASIC_PROPS));
  const select = baseSelect.find('Select');

  it('render with default parameters', () => {
    expect(select).to.have.length(1);
  });

  it('show correct values', () => {
    const val = FieldValue.fromLabeled({
      value: Rdf.iri('http://www.metaphacts.com/resource/example/test'),
      label: 'test',
    });
    BASIC_PROPS.value = val;
    const selectFiled = mount(createElement(SelectInput, BASIC_PROPS));
    expect(selectFiled.find('SelectInput').props().value).to.be.eql(val);
  });

  it('call callback when value is changed', () => {
    const callback = sinon.spy();
    const props: SelectInputProps = {...BASIC_PROPS, updateValue: callback};
    const wrapper = shallow(createElement(SelectInput, props));
    wrapper.find('Select').simulate('change');
    expect(callback.called).to.be.true;
  });
});
