/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

import * as React from 'react';
import * as SparqlJs from 'sparqljs';
import * as maybe from 'data.maybe';

import { SparqlUtil } from 'platform/api/sparql';

import { setSearchDomain } from '../commons/Utils';
import { SemanticSearchContext, InitialQueryContext } from './SemanticSearchApi';

export interface SemanticSearchQueryConstantConfig {
  /**
   * SPARQL SELECT query string that should be used as a base query in the search.
   * Should have only one projection variable.
   * In favour of consistency, we recommend to use a variable named `?subject`.
   */
  query: string;

  /**
   * Specify search domain category IRI (full IRI enclosed in <>).
   * Required, if component is used together with facets.
   */
  domain?: string;
}

export interface QueryConstantProps extends SemanticSearchQueryConstantConfig {}

export class QueryConstant extends React.Component<QueryConstantProps, {}> {
  render() {
    return (
      <SemanticSearchContext.Consumer>
        {context => <QueryConstantInner {...this.props} context={context} />}
      </SemanticSearchContext.Consumer>
    );
  }
}

interface InnerProps extends QueryConstantProps {
  context: InitialQueryContext;
}

class QueryConstantInner extends React.Component<InnerProps, {}> {
  componentDidMount() {
    const q = SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(this.props.query);
    this.props.context.setBaseQuery(maybe.Just(q));
  }

  componentWillReceiveProps(props: InnerProps) {
    const {context} = props;
    if (context.searchProfileStore.isJust && context.domain.isNothing) {
      setSearchDomain(props.domain, context);
    }
  }

  render() {
    return null;
  }
}

export default QueryConstant;
