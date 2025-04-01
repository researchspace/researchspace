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
import * as React from 'react';
import * as Maybe from 'data.maybe';
import * as Kefir from 'kefir';
import * as _ from 'lodash';
import { FormControl, FormGroup } from 'react-bootstrap';
import * as SparqlJs from 'sparqljs';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

import { Rdf } from 'platform/api/rdf';
import { SparqlUtil, SparqlClient } from 'platform/api/sparql';
import { Component } from 'platform/api/components';
import { Action } from 'platform/components/utils';
import { defaultKeywordSearchConfig, textConfirmsToConfig } from "platform/components/shared/KeywordSearchConfig";

import { setSearchDomain } from 'platform/components/semantic/search/commons/Utils';
import { SemanticSimpleSearchBaseConfig } from 'platform/components/semantic/simple-search/Config';
import { SemanticSearchContext, InitialQueryContext } from 'platform/components/semantic/search/web-components/SemanticSearchApi';
import Icon from 'platform/components/ui/icon/Icon';

export interface BaseConfig<T> extends SemanticSimpleSearchBaseConfig {
  /**
   * Custom css styles for the input element
   */
  style?: T;

  /**
   * Custom css classes for the input element
   */
  className?: string;

  /**
   * Specify search domain category IRI (full IRI enclosed in <>).
   * Required, if component is used together with facets.
   */
  domain?: string;

  /**
   * Number of milliseconds to wait after the last keystroke before sending the query.
   *
   * @default 300
   */
  debounce?: number;

  /**
   * The minimum value of the slider
   * @default 0
   */
  min?: number;

  /**
   * The maximum value of the slider
   * @default 100
   */
  max?: number;

  /**
   * Value to be added or subtracted on each step the slider makes
   * @default 1
   */
  step?: number;

  /**
   * Variable name for the AI assist value in the query
   * @default '__aiAssist__'
   */
  aiAsistVariable?: string;

  /**
   * Marks on the slider. Object with keys as slider values and values as mark labels.
   * Example: { 0: 'Metadata', 50: ' ', 100: 'Visual Similarity' }
   * @default undefined
   */
  marks?: Record<number, string>;

  /**
   * Default value for the slider when the component is first rendered
   * @default min value (0 if not specified)
   */
  defaultSliderValue?: number;
}

export interface KeywordSearchWithSliderConfig extends BaseConfig<string> {}

interface KeywordSearchWithSliderProps extends BaseConfig<React.CSSProperties> {}

class KeywordSearchWithSlider extends Component<KeywordSearchWithSliderProps, {}> {
  render() {
    return (
      <SemanticSearchContext.Consumer>
        {(context) => <KeywordSearchWithSliderInner {...this.props} context={context} />}
      </SemanticSearchContext.Consumer>
    );
  }
}

interface InnerProps extends KeywordSearchWithSliderProps {
  context: InitialQueryContext;
}

interface State {
  value: string;
  sliderValue: number;
}

class KeywordSearchWithSliderInner extends React.Component<InnerProps, State> {
  static defaultProps: Partial<KeywordSearchWithSliderProps> = {
    placeholder: 'Search all, minimum 3 characters',
    className: "input-keyword-search",
    searchTermVariable: '__token__',
    aiAsistVariable: '__aiAssist__',
    debounce: 300,
    min: 0,
    max: 100,
    step: 1,
    ... defaultKeywordSearchConfig
  };

  private keys: Action<string>;

  constructor(props: InnerProps) {
    super(props);
    const value = props.initialInput || '';
    this.state = {
      value,
      sliderValue: props.defaultSliderValue !== undefined ? props.defaultSliderValue : (props.min || 0),
    };

    this.keys = Action<string>(value); 
  }

  componentDidMount() {
    setSearchDomain(this.props.domain, this.props.context);
    this.initialize(this.props);
  }

  componentWillReceiveProps(props: InnerProps) {
    const { context } = props;
    if (context.searchProfileStore.isJust && context.domain.isNothing) {
      setSearchDomain(props.domain, context);
    }
  }

  render() {
    const { placeholder, style, className, min, max, step } = this.props;
    const isInputEmpty = _.isEmpty(this.state.value);
    
    return (
      <div>
        <div className='keyword-search-container'>
          <Icon iconType='rounded ' iconName='search' symbol />
          <FormGroup controlId="semantic-search-text-input">
            <FormControl
              className={className}
              style={style}
              value={this.state.value}
              placeholder={placeholder}
              onChange={this.onKeyPress}
            />
          </FormGroup>
        </div>
        <div className='slider-field' style={{'width': '100%', margin: '15px 0px 15px 0px', display: 'flex', alignItems: 'center', paddingRight: '4px'}}>
          <div style={{ marginRight: '15px', fontWeight: 'bold' }}>AI Assist:</div>
          <div className='slider-field__slider-container' style={{'flex': '1'}}>
            <Slider
              min={min}
              max={max}
              step={step}
              value={this.state.sliderValue}
              onChange={this.onSliderChange}
              disabled={isInputEmpty}
              included={false}
              marks={this.props.marks}
            />
          </div>
        </div>
      </div>
    );
  }

  private initialize = (props: InnerProps) => {
    const query = SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(props.query);
    const defaultQuery = props.defaultQuery
      ? Maybe.Just(SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(props.defaultQuery))
      : Maybe.Nothing<SparqlJs.SelectQuery>();

    const queryProp = this.keys.$property
      .filter((str) => textConfirmsToConfig(str, this.props))
      .debounce(this.props.debounce)
      .map(this.buildQuery(query));

    const defaultQueryProp = this.keys.$property
      .filter((str) => _.isEmpty(str))
      .map(() => defaultQuery.get());

    const initializers = [queryProp];
    if (props.defaultQuery) {
      initializers.push(defaultQueryProp);
    }

    Kefir.merge(initializers).onValue((q) => this.props.context.setBaseQuery(Maybe.Just(q)));
  };

  private onKeyPress = (event: React.FormEvent<FormControl>) => {
    const newValue = (event.target as any).value;
    this.setState({ value: newValue }, () => this.keys(this.state.value));
  }

  private onSliderChange = (value:  number | number[]) => {
    this.setState({ sliderValue: value as number }, () => {
      if (!_.isEmpty(this.state.value)) {
        this.keys(this.state.value);
      }
    });
  }

  private buildQuery = (baseQuery: SparqlJs.SelectQuery) => (token: string): SparqlJs.SelectQuery => {
    const {
      searchTermVariable, aiAsistVariable, escapeLuceneSyntax,
      tokenizeLuceneQuery, minTokenLength
    } = this.props;
    
    const value = SparqlUtil.makeLuceneQuery(
      token, escapeLuceneSyntax, tokenizeLuceneQuery, minTokenLength
    );
    
    // Create bindings with both the search term and the AI assist value
    const bindings = {
      [searchTermVariable]: value,
      [aiAsistVariable!]: Rdf.literal(this.state.sliderValue.toString(), Rdf.iri('http://www.w3.org/2001/XMLSchema#decimal')),
    };
    
    return SparqlClient.setBindings(baseQuery, bindings);
  };
}

export default KeywordSearchWithSlider;
