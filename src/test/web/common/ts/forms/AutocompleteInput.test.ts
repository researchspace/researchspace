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

import { createElement, HTMLAttributes } from 'react';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { render, cleanup } from '@testing-library/react';

import { Rdf } from 'platform/api/rdf';
import {
  AutocompleteInput,
  AutocompleteInputProps,
  FieldValue,
  normalizeFieldDefinition,
} from 'platform/components/forms';
import { AutoCompletionInput } from 'platform/components/ui/inputs';

import { mockConfig } from 'platform-tests/mocks';

mockConfig();

const DATATYPE = Rdf.iri('http://www.w3.org/2001/XMLSchema-datatypes#string');

const definition = normalizeFieldDefinition({
  id: 'autocomplete1',
  label: 'labelProp',
  xsdDatatype: DATATYPE,
  minOccurs: 1,
  maxOccurs: 1,
  valueSetPattern: '',
});

const baseInputProps: AutocompleteInputProps = {
  for: 'autocomplete1',
};

const completeInputProps: AutocompleteInputProps = {
  ...baseInputProps,
  definition,
  handler: AutocompleteInput.makeHandler({ definition, baseInputProps }),
  value: FieldValue.empty,
};

describe('AutocompleteInput Component', () => {
  let renderStub: sinon.SinonStub;

  beforeEach(() => {
    // Stub the render method of the child component to intercept props
    renderStub = sinon.stub(AutoCompletionInput.prototype, 'render').returns(null);
  });

  afterEach(() => {
    cleanup();
    renderStub.restore();
  });

  it('render with default parameters', () => {
    render(createElement(AutocompleteInput, completeInputProps));
    expect(renderStub.called).to.be.true;
  });

  it('have minimum query limit for request', () => {
    render(createElement(AutocompleteInput, completeInputProps));
    const props = renderStub.lastCall.thisValue.props;
    expect(props.minimumInput).to.be.equal(3);
  });

  it('have template for suggestion', () => {
    const template = `<span title="{{label.value}}">{{label.value}}</span>`;
    render(createElement(AutocompleteInput, completeInputProps));
    const props = renderStub.lastCall.thisValue.props;
    expect(props.templates.suggestion).to.be.equal(template);
  });

  it('call callback when value is changed', () => {
    const callback = sinon.spy();
    const props: AutocompleteInputProps = { ...completeInputProps, updateValue: callback };
    render(createElement(AutocompleteInput, props));
    
    const inputProps = renderStub.lastCall.thisValue.props;
    inputProps.actions.onSelected();
    
    expect(callback.called).to.be.true;
  });
});
