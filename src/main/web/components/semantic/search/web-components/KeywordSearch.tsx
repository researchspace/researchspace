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

import * as Model from 'platform/components/semantic/search/data/search/Model';
import { SparqlUtil, SparqlClient } from 'platform/api/sparql';
import { Component } from 'platform/api/components';
import { Action } from 'platform/components/utils';

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

  /**
   * Persist search term in URL history state
   * 
   * @default true
   */
  persistInHistory?: boolean;
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
    minSearchTermLength: 3,
    debounce: 300,
    persistInHistory: true,
    escapeLuceneSyntax: true,
  };

  private keys = Action<string>();
  private persist = Action<string>();

  constructor(props: InnerProps) {
    super(props);
    this.state = {
      value: undefined,
    };
  }

  componentDidMount() {
    setSearchDomain(this.props.domain, this.props.context);
    this.initialize(this.props);
    this.retrieveStateFromHistory(true);
  }

  componentDidUpdate(prevProps: InnerProps) {
    const prevContext = prevProps.context;
    const nextContext = this.props.context;

    if (!_.isEqual(prevContext.baseQueryStructure, nextContext.baseQueryStructure)) {
      this.retrieveStateFromHistory(true);
    }

    if (nextContext.searchProfileStore.isJust && nextContext.domain.isNothing) {
      setSearchDomain(this.props.domain, nextContext);
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

  private extractTextFromBaseQueryStructure(): string | null {
    const { baseQueryStructure } = this.props.context;
    if (baseQueryStructure.isNothing) return null;
    const search = baseQueryStructure.get();
    const first = search?.conjuncts?.[0];
    if (!first || first.kind !== Model.ConjunctKinds.Text) return null;
    const d0 = first.disjuncts?.[0];
    if (!d0 || d0.kind !== Model.TextDisjunctKind) return null;
    const val = d0.value as string;
    return typeof val === 'string' ? val : null;
  }

  private initialize = (props: InnerProps) => {
    const query = SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(props.query);
    const defaultQuery = props.defaultQuery
      ? Maybe.Just(SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(props.defaultQuery))
      : Maybe.Nothing<SparqlJs.SelectQuery>();

    const queryProp = this.keys.$property
      .filter((str) => str.length >= this.props.minSearchTermLength)
      .debounce(this.props.debounce)
      .map(this.buildQuery(query));

    const defaultQueryProp = this.keys.$property
      .filter((str) => props.defaultQuery && _.isEmpty(str))
      .map(() => defaultQuery.get());

    const initializers = [queryProp];
    if (props.defaultQuery) {
      initializers.push(Kefir.constant(defaultQuery.get()), defaultQueryProp);
    }

    Kefir.merge(initializers).onValue((q) => this.props.context.setBaseQuery(Maybe.Just(q)));
    
    if (this.props.persistInHistory) {
      this.persist.$property
        .debounce(this.props.debounce)
        .onValue((val) => this.saveStateIntoHistory(val));
    }
  };

  private onKeyPress = (event: React.FormEvent<FormControl>) => {
    const v = (event.target as any).value as string;
    this.setState({ value: v });
    this.keys(v);
    this.persist(v);
  }

  private retrieveStateFromHistory = (emit: boolean) => {
    const text = this.extractTextFromBaseQueryStructure();
    if (text != null && text !== this.state.value) {
      this.setState({ value: text });
      if (emit) {
        this.keys(text);
        this.persist(text)
      }
    }
  };

  private buildQuery = (baseQuery: SparqlJs.SelectQuery) => (token: string): SparqlJs.SelectQuery => {
    const { searchTermVariable, escapeLuceneSyntax, tokenizeLuceneQuery } = this.props;
    const value = SparqlUtil.makeLuceneQuery(token, escapeLuceneSyntax, tokenizeLuceneQuery);
    return SparqlClient.setBindings(baseQuery, { [searchTermVariable]: value });
  };
  
  private saveStateIntoHistory = (text: string) => {
    const { context } = this.props;
    const domain = context.domain.isJust ? context.domain.get() : null;
    if (!domain) return;

    const search: Model.Search = {
      domain,
      conjuncts: [{
        uniqueId: 0,
        kind: Model.ConjunctKinds.Text,
        range: domain,
        conjunctIndex: [0],
        disjuncts: [{
          kind: Model.TextDisjunctKind,
          value: text,
          disjunctIndex: [0, 0],
        }],
      }],
    } as any;

    context.setBaseQueryStructure(Maybe.Just(search));
  };
}

export default KeywordSearch;
