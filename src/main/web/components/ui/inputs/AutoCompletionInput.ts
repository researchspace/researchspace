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

import { Props, createElement } from 'react';
import * as assign from 'object-assign';
import * as SparqlJs from 'sparqljs';

import { Component, ComponentContext } from 'platform/api/components';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { Rdf } from 'platform/api/rdf';
import { Droppable } from 'platform/components/dnd';

import { BaseProps, AbstractAutoCompletionInput } from './AbstractAutoCompletionInput';

export interface AutoCompletionInputProps extends Props<AutoCompletionInput>, BaseProps {
  query: string | SparqlJs.SparqlQuery;
  escapeLuceneSyntax?: boolean;
  tokenizeLuceneQuery?: boolean;
  droppable?: {
    query: string;
    styles?: {
      enabled: React.CSSProperties;
      disabled: React.CSSProperties;
      enabledHover?: React.CSSProperties
    };
    components?: {
      disabledHover?: any;
    };
  };
  defaultQuery?: string | SparqlJs.SparqlQuery;
  actions?: {
    onSelected?: (selected: SparqlClient.Binding | SparqlClient.Binding[]) => void;
  };
  multi?: boolean;
}

const SEARCH_INPUT_VARIABLE = '__token__';
export class AutoCompletionInput extends Component<AutoCompletionInputProps, {}> {
  private autoCompletion: AbstractAutoCompletionInput;

  constructor(props: AutoCompletionInputProps, context: ComponentContext) {
    super(props, context);
  }

  render() {
    const result = createElement(
      AbstractAutoCompletionInput,
      assign(
        {
          ref: (comp) => {
            this.autoCompletion = comp;
          },
        },
        this.props,
        {
          queryFn: this.executeQuery(this.props.query),
          defaultQueryFn: this.props.defaultQuery ? this.executeQuery(this.props.defaultQuery) : undefined,
          templates: this.props.templates || undefined,
          actions: {
            onSelected: this.props.actions.onSelected,
          },
        }
      )
    );
    if (this.props.droppable) {
      return createElement(
        Droppable,
        {
          query: this.props.droppable.query,
          dropStyles: this.props.droppable.styles,
          dropComponents: this.props.droppable.components,
          onDrop: (drop: Rdf.Iri) => {
            this.autoCompletion.setValue(drop);
          },
        },
        result
      );
    } else {
      return result;
    }
  }

  getValue(): SparqlClient.Binding | ReadonlyArray<SparqlClient.Binding> {
    return this.autoCompletion.getValue();
  }

  focus() {
    return null; // this.refs.input.focus();
  }

  private executeQuery = (query: string | SparqlJs.SparqlQuery) => (token: string, tokenVariable: string) => {
    const parsedQuery: SparqlJs.SparqlQuery =
      typeof query === 'string'
        ? this.replaceTokenAndParseQuery(query as string, tokenVariable, token)
        : (query as SparqlJs.SparqlQuery);
    const { escapeLuceneSyntax, tokenizeLuceneQuery } = this.props;
    const queryParam = SparqlUtil.makeLuceneQuery(token, escapeLuceneSyntax, tokenizeLuceneQuery);
    const queryWithToken = SparqlClient.setBindings(parsedQuery, { [SEARCH_INPUT_VARIABLE]: queryParam });
    const context = this.context.semanticContext;
    return SparqlClient.select(queryWithToken, { context: context }).map((res) => res.results.bindings);
  };

  private replaceTokenAndParseQuery = (queryString: string, tokenVariable: string, token: string) => {
    let parametrized = queryString;
    if (queryString.indexOf(SEARCH_INPUT_VARIABLE) === -1) {
      parametrized = queryString.replace(new RegExp('\\?' + tokenVariable), token);
      if (parametrized !== queryString) {
        console.warn('Please use new $__token__ variable in autocomplete search.');
      }
    }
    return SparqlUtil.parseQuerySync(parametrized);
  };
}
