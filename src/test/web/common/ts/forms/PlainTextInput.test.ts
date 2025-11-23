import { createElement } from 'react';
import * as sinon from 'sinon';
import { clone } from 'lodash';
import { expect } from 'chai';
import { render, screen, fireEvent } from '@testing-library/react';

import { Rdf } from 'platform/api/rdf';
import { PlainTextInput, PlainTextInputProps, FieldValue } from 'platform/components/forms';
import { mockConfig } from 'platform-tests/mocks';

import { PROPS as BASIC_PROPS } from './fixturies/FieldProps';

mockConfig();

describe('Plain Text Component', () => {
  describe('render', () => {
    it('with default parameters', () => {
      render(createElement(PlainTextInput, BASIC_PROPS));
      expect(screen.getByRole('textbox')).to.exist;
    });
  });

  it('call callback when value is changed', () => {
    const callback = sinon.spy();
    const props: PlainTextInputProps = { ...BASIC_PROPS, updateValue: callback };
    render(createElement(PlainTextInput, props));
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new value' } });
    
    expect(callback.called).to.be.true;
  });

  it('render input when multiline option is false', () => {
    render(createElement(PlainTextInput, BASIC_PROPS));
    const input = screen.getByRole('textbox');
    expect(input.tagName).to.equal('INPUT');
  });

  it('render textarea when multiline option is true', () => {
    const props: PlainTextInputProps = { ...BASIC_PROPS, multiline: true };
    render(createElement(PlainTextInput, props));
    const input = screen.getByRole('textbox');
    expect(input.tagName).to.equal('TEXTAREA');
  });

  describe('languages', () => {
    const propsWithLang: PlainTextInputProps = { ...BASIC_PROPS, languages: ['lang1', 'lang2'] };

    it('render language select list', () => {
      const { container } = render(createElement(PlainTextInput, propsWithLang));
      expect(container.querySelector('.plain-text-field__language')).to.exist;
    });

    it('without language select when languages not exist', () => {
      const { container } = render(createElement(PlainTextInput, BASIC_PROPS));
      expect(container.querySelector('.plain-text-field__language')).to.not.exist;
    });

    it("show empty language when default don't exist", () => {
      render(createElement(PlainTextInput, propsWithLang));
      expect(screen.getByText('No language')).to.exist;
    });

    it('show default language when its langLiteral', () => {
      const langLiteral = Rdf.langLiteral('value', 'language');
      let props = clone(BASIC_PROPS);
      props.value = FieldValue.fromLabeled({ value: langLiteral });
      
      render(createElement(PlainTextInput, props));
      
      // We look for the text 'language' which should be displayed in the select
      expect(screen.getByText('language')).to.exist;
    });

    it('show "No language" if literal', () => {
      const props: PlainTextInputProps = { ...BASIC_PROPS, languages: ['lang1', 'lang2'] };
      render(createElement(PlainTextInput, props));
      expect(screen.getByText('No language')).to.exist;
    });
  });
});
