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
import * as React from 'react';
import * as Maybe from 'data.maybe';
import * as Kefir from 'kefir';
import * as _ from 'lodash';
import { FormControl, FormGroup } from 'react-bootstrap';
import * as SparqlJs from 'sparqljs';

import { Rdf } from 'platform/api/rdf';
import { SparqlUtil, SparqlClient } from 'platform/api/sparql';
import { Component } from 'platform/api/components';
import { Action } from 'platform/components/utils';
import { defaultKeywordSearchConfig, textConfirmsToConfig } from "platform/components/shared/KeywordSearchConfig";

import { setSearchDomain } from '../commons/Utils';
import { SemanticSimpleSearchBaseConfig } from '../../simple-search/Config';
import { SemanticSearchContext, InitialQueryContext } from './SemanticSearchApi';
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
}

export interface SemanticSearchKeywordConfig extends BaseConfig<string> {}

interface KeywordSearchProps extends BaseConfig<React.CSSProperties> {}

class KeywordSearch extends Component<KeywordSearchProps, {}> {
  render() {
    return (
      <div className='keyword-search-container'>
        <Icon iconType='rounded ' iconName='search' symbol />
        <SemanticSearchContext.Consumer>
          {(context) => <KeywordSearchInner {...this.props} context={context} />}
        </SemanticSearchContext.Consumer>
      </div>
    );
  }
}

interface InnerProps extends KeywordSearchProps {
  context: InitialQueryContext;
}

interface State {
  value: string;
}

class KeywordSearchInner extends React.Component<InnerProps, State> {
  static defaultProps: Partial<KeywordSearchProps> = {
    placeholder: 'Search all, minimum 3 characters',
    className: "input-keyword-search",
    searchTermVariable: '__token__',
    debounce: 300,
    ... defaultKeywordSearchConfig
  };

  private keys: Action<string>;

  constructor(props: InnerProps) {
    super(props);
    const value = props.initialInput || '';
    this.state = {
      value,
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
    const { placeholder, style, className } = this.props;
    return (
      <FormGroup controlId="semantic-search-text-input">
        <FormControl
          className={className}
          style={style}
          value={this.state.value}
          placeholder={placeholder}
          onChange={this.onKeyPress}
        />
      </FormGroup>
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
    this.setState({ value: (event.target as any).value }, () => this.keys(this.state.value));
  }

  private buildQuery = (baseQuery: SparqlJs.SelectQuery) => (token: string): SparqlJs.SelectQuery => {
    const {
      searchTermVariable, escapeLuceneSyntax,
      tokenizeLuceneQuery, minTokenLength
    } = this.props;
    const value = SparqlUtil.makeLuceneQuery(
      token, escapeLuceneSyntax, tokenizeLuceneQuery, minTokenLength
    );
    return SparqlClient.setBindings(baseQuery, { [searchTermVariable]: value });
  };
}

export default KeywordSearch;
