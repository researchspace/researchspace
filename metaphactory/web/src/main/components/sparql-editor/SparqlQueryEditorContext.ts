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

import { Component, Children, ReactNode, PropTypes } from 'react';
import * as Kefir from 'kefir';
import { Just, Nothing } from 'data.maybe';

export interface SparqlQueryEditorContextProps {
  children: ReactNode;
}

export interface QueryEditorContext {
  getQuery(): Data.Maybe<string>;
  setQuery(query: string, options?: { silent?: boolean }): void;
  readonly queryChanges: Kefir.Stream<Data.Maybe<string>>;
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
  private readonly queryPool = Kefir.pool<Data.Maybe<string>>();

  constructor(props: SparqlQueryEditorContextProps) {
    super(props);
    this.queryPool.plug(Kefir.constant(Nothing<string>()));
  }

  getChildContext(): ComponentContext {
    const queryEditorContext: QueryEditorContext = {
      getQuery: () => this.query,
      setQuery: (query, options = {}) => {
        this.query = Just(query);
        if (!options.silent) {
          this.queryPool.plug(Kefir.constant(this.query));
        }
      },
      queryChanges: this.queryPool
        .flatMapLatest(query => Kefir.constant(query))
        .toProperty()
        .changes(),
    };
    return {queryEditorContext};
  }

  render() {
    return Children.only(this.props.children);
  }
}

export default SparqlQueryEditorContext;
