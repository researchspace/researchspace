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

import { Component, Children, ReactNode } from 'react';
import * as PropTypes from 'prop-types';
import * as Kefir from 'kefir';
import { Just, Nothing, fromNullable } from 'data.maybe';

export interface SparqlQueryEditorContextProps {
  children: ReactNode;
}

export interface ContextQuery {
  query: Data.Maybe<string>;
  repository: Data.Maybe<string>;
}

export interface QueryEditorContext {
  getQuery(): Data.Maybe<string>;
  setQuery(query: string, options?: { silent?: boolean; repository?: string }): void;
  readonly queryChanges: Kefir.Stream<ContextQuery>;
}

export interface ComponentContext {
  queryEditorContext: QueryEditorContext;
}

export const ContextTypes: Record<keyof ComponentContext, any> = {
  queryEditorContext: PropTypes.object,
};

export class SparqlQueryEditorContext extends Component<SparqlQueryEditorContextProps, void> {
  static childContextTypes = ContextTypes;

  private query = Nothing<string>();
  private readonly queryPool = Kefir.pool<ContextQuery>();

  constructor(props: SparqlQueryEditorContextProps) {
    super(props);
    this.queryPool.plug(Kefir.constant({ query: Nothing<string>(), repository: Nothing<string>() }));
  }

  getChildContext(): ComponentContext {
    const queryEditorContext: QueryEditorContext = {
      getQuery: () => this.query,
      setQuery: (query, options = {}) => {
        this.query = Just(query);
        if (!options.silent) {
          this.queryPool.plug(
            Kefir.constant({
              query: this.query,
              repository: fromNullable(options.repository),
            })
          );
        }
      },
      queryChanges: this.queryPool
        .flatMapLatest((query) => Kefir.constant(query))
        .toProperty()
        .changes(),
    };
    return { queryEditorContext };
  }

  render() {
    return Children.only(this.props.children);
  }
}

export default SparqlQueryEditorContext;
