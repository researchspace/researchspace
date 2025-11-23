import { createElement } from 'react';
import { expect } from 'chai';
import * as sinon from 'sinon';
import ReactSelect from 'react-select';
import { render, cleanup } from '@testing-library/react';

import { Rdf } from 'platform/api/rdf';
import { SelectInput, SelectInputProps, FieldValue, normalizeFieldDefinition } from 'platform/components/forms';

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
  let renderStub: sinon.SinonStub;

  beforeEach(() => {
    // Stub ReactSelect render to inspect props
    if (ReactSelect.prototype && ReactSelect.prototype.render) {
        renderStub = sinon.stub(ReactSelect.prototype, 'render').returns(null);
    } else {
        // Fallback or error if it's not a class component (unlikely for v1)
        throw new Error('ReactSelect is not a class component, cannot stub render');
    }
  });

  afterEach(() => {
    cleanup();
    if (renderStub) {
        renderStub.restore();
    }
  });

  it('render with default parameters', () => {
    render(createElement(SelectInput, BASIC_PROPS));
    expect(renderStub.called).to.be.true;
  });

  it('show correct values', () => {
    const val = FieldValue.fromLabeled({
      value: Rdf.iri('http://www.researchspace.org/resource/example/test'),
      label: 'test',
    });
    const props = { ...BASIC_PROPS, value: val };
    render(createElement(SelectInput, props));
    
    const selectProps = renderStub.lastCall.thisValue.props;
    expect(selectProps.value).to.be.eql(val);
  });

  it('call callback when value is changed', () => {
    const callback = sinon.spy();
    const props: SelectInputProps = { ...BASIC_PROPS, updateValue: callback };
    render(createElement(SelectInput, props));
    
    const selectProps = renderStub.lastCall.thisValue.props;
    // Simulate change with undefined (empty) or some value
    // Since we don't care about the value logic inside (parsing), just that it calls updateValue
    selectProps.onChange(); 
    
    expect(callback.called).to.be.true;
  });
});
