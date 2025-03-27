/**
 * ResearchSpace
 * Copyright (C) 2025, PHAROS: The International Consortium of Photo Archives
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
import { FormEvent, ChangeEvent } from 'react';
import { FormControl } from 'react-bootstrap';

import { FieldValue, AtomicValue, EmptyValue } from '../FieldValues';
import { PlainTextInput, PlainTextInputProps, PlainTextInputState } from './PlainTextInput';
import { AtomicValueInput } from './SingleValueInput';
import { 
  KeywordSearchConfig, 
  defaultKeywordSearchConfig, 
  textConfirmsToConfig, 
  luceneTokenize 
} from 'platform/components/shared/KeywordSearchConfig';

export interface KeywordInputProps extends PlainTextInputProps, KeywordSearchConfig {
}

interface KeywordInputState extends PlainTextInputState {
}

export class KeywordInput extends PlainTextInput<KeywordInputProps, KeywordInputState> {
  static defaultProps = defaultKeywordSearchConfig;

  declare state: KeywordInputState;

  constructor(props: KeywordInputProps, context: any) {
    super(props, context);
    this.state = this.reformatText(props);
  }

  componentWillReceiveProps(nextProps: KeywordInputProps) {}

  protected onTextChanged = (event: FormEvent<FormControl> | ChangeEvent<HTMLTextAreaElement>) => {
    const text = (event.target as any).value;
    const language = this.state.language;
    const isValid = this.validateInput(text);
    
    this.setState({ text, language });
    
    if (isValid) {
      this.setAndValidate(this.createValue(text, language));
    } else {
      this.setAndValidate(FieldValue.empty);
    }
  };

  private validateInput(text: string): boolean {
    const props = this.props as KeywordInputProps;
    const config: KeywordSearchConfig = {
      escapeLuceneSyntax: props.escapeLuceneSyntax,
      minSearchTermLength: props.minSearchTermLength,
      tokenizeLuceneQuery: props.tokenizeLuceneQuery,
      minTokenLength: props.minTokenLength,
    };
    
    return textConfirmsToConfig(text, config);
  }

  protected createValue(text: string, language: string): AtomicValue | EmptyValue {
    if (text.length === 0) {
      return FieldValue.empty;
    }

    const props = this.props as KeywordInputProps;
    
    if (props.tokenizeLuceneQuery) {
      const tokens = luceneTokenize(
        text, 
        props.escapeLuceneSyntax, 
        props.tokenizeLuceneQuery, 
        props.minTokenLength
      );
      
      if (tokens.length === 0) {
        return FieldValue.empty;
      }
      
      text = tokens.join(' ');
    } else if (props.escapeLuceneSyntax) {
      const tokens = luceneTokenize(
        text, 
        props.escapeLuceneSyntax, 
        false, 
        0
      );
      text = tokens.join(' ');
    }
    
    return super.createValue(text, language);
  }

  static makeHandler = AtomicValueInput.makeAtomicHandler;
}

export default KeywordInput;
