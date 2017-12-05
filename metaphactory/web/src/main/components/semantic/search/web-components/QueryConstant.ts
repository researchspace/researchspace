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

import { Props as ReactProps,
         Component,
       } from 'react';
import * as maybe from 'data.maybe';

import { SparqlUtil } from 'platform/api/sparql';

import { setSearchDomain } from '../commons/Utils';
import {
  InitialQueryContext, InitialQueryContextTypes,
} from './SemanticSearchApi';

export interface SemanticSearchQueryConstantConfig {
  /**
   * SPARQL SELECT query string that should be used as a base query in the search. Should have only one projection variable. In favour of consistency, we recommend to use a variable named `?subject`.
   */
  query: string

  /**
   * Specify search domain category IRI (full IRI enclosed in <>). Required, if component is used together with facets.
   */
  domain?: string
}

interface Props extends ReactProps<QueryConstant>, SemanticSearchQueryConstantConfig {}

export class QueryConstant extends Component<Props, {}> {
  static contextTypes = InitialQueryContextTypes;
  context: InitialQueryContext;

  constructor(props: Props, context: InitialQueryContext) {
    super(props, context);
  }

  componentDidMount() {
    const q = SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(this.props.query);
    this.context.setBaseQuery(maybe.Just(q));
  }

  componentWillReceiveProps(props: Props, context: InitialQueryContext) {
    if (context.searchProfileStore.isJust && context.domain.isNothing) {
      setSearchDomain(props.domain, context);
    }
  }

  render() {
    return null;
  }
}

export default QueryConstant;
