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

import { Props as ReactProps, FormEvent, CSSProperties } from 'react';
import * as React from 'react';
import * as Maybe from 'data.maybe';
import { FormControl, FormGroup } from 'react-bootstrap';

import { Rdf } from 'platform/api/rdf';
import { SparqlUtil, SparqlClient } from 'platform/api/sparql';
import { Component, ComponentContext, ContextTypes } from 'platform/api/components';
import { Action } from 'platform/components/utils';

import { setSearchDomain } from '../commons/Utils';
import { SemanticSimpleSearchBaseConfig } from '../../simple-search/Config';
import {
  InitialQueryContext, InitialQueryContextTypes,
} from './SemanticSearchApi';

interface BaseConfig<T> extends SemanticSimpleSearchBaseConfig {
  /**
   * Custom css styles for the input element
   */
  style?: T

  /**
   * Custom css classes for the input element
   */
  className?: string

  /**
   * Specify search domain category IRI (full IRI enclosed in <>). Required, if component is used together with facets.
   */
  domain?: string

  /**
   * Number of milliseconds to wait after the last keystroke before sending the query.
   *
   * @default 300
   */
  debounce?: number;
}

export interface SemanticSearchKeywordConfig extends BaseConfig<string> {}
interface Config extends BaseConfig<CSSProperties> {}
interface Props extends ReactProps<KeywordSearch>, Config {}

interface State {
  value: string
}

class KeywordSearch extends Component<Props, State> {
  static contextTypes = {...ContextTypes, ...InitialQueryContextTypes};
  static defaultProps = {
    placeholder: 'type to search, minimum 3 symbols ...',
    searchTermVariable: '__token__',
    minSearchTermLength: 3,
    debounce: 300,
  };
  context: ComponentContext & InitialQueryContext;

  private keys = Action<string>();

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {
      value: undefined,
    };
  }

  componentDidMount() {
    setSearchDomain(this.props.domain, this.context);
    this.initialize(SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(this.props.query));
  }

  componentWillReceiveProps(props: Props, context: InitialQueryContext) {
    if (context.searchProfileStore.isJust && context.domain.isNothing) {
      setSearchDomain(props.domain, context);
    }
  }

  render() {
    const {placeholder, style, className} = this.props;
    return <FormGroup controlId='semantic-search-text-input'>
    <FormControl
        className={className}
        style={style}
        value={this.state.value}
        placeholder={placeholder}
        onChange={this.onKeyPress}
      />
    </FormGroup>;
  }

  private initialize = (query: SparqlJs.SelectQuery) =>
    this.keys.$property
      .filter(str => str.length >= this.props.minSearchTermLength)
      .debounce(this.props.debounce)
      .map(this.buildQuery(query))
      .onValue(q => this.context.setBaseQuery(Maybe.Just(q)))

  private onKeyPress = (event: FormEvent<FormControl>) =>
    this.keys((event.target as any).value)

  private buildQuery =
    (baseQuery: SparqlJs.SelectQuery) => (token: string): SparqlJs.SelectQuery => {
      const { searchTermVariable, escapeLuceneSyntax } = this.props;
      const value = escapeLuceneSyntax ? SparqlUtil.makeLuceneQuery(token) : Rdf.literal(token);
      return SparqlClient.setBindings(
        baseQuery, {[searchTermVariable]: value}
      );
    }
}

export default KeywordSearch;
