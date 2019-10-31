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

import { Component, ComponentProps } from 'platform/api/components';
import { Cancellation } from 'platform/api/async';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';
import { TemplateItem } from 'platform/components/ui/template';

export interface SemanticIfProps extends ComponentProps {
  /**
   * Sparql ASK query to determine whether to display `then` or `else`
   * template.
   */
  query: string;
  then?: string;
  else?: string;
}

interface State {
  readonly loading?: boolean;
  readonly error?: any;
  readonly askResult?: boolean;
}

/**
 * @example
 * <semantic-if query='ASK query' then='{{> then}}' else='{{> else}}'>
 *   <template id='then'><!-- then markup --></template>
 *   <template id='else'><!-- else markup --></template>
 * </semantic-if>
 *
 * // shorthand for the above
 * <semantic-if query='ASK query'>
 *   <template id='then'><!-- then markup --></template>
 *   <template id='else'></template>
 * </semantic-if>
 *
 * // use inline templates, leave 'else' template empty
 * <semantic-if query='ASK query' then='<!-- then markup -->'></semantic-if>
 */
export class SemanticIf extends Component<SemanticIfProps, State> {
  private readonly cancellation = new Cancellation();

  constructor(props: SemanticIfProps, context: any) {
    super(props, context);
    this.state = {loading: true};
  }

  componentDidMount() {
    let askQuery: SparqlJs.AskQuery;
    try {
      askQuery = parseAskQuery(this.props.query);
    } catch (error) {
      this.setState({loading: false, error});
      return;
    }

    const {semanticContext} = this.context;
    this.cancellation.map(
      SparqlClient.ask(askQuery, {context: semanticContext}),
    ).observe({
      value: askResult => this.setState({loading: false, askResult}),
      error: error => this.setState({loading: false, error}),
    });
  }

  private getTemplate(key: 'then' | 'else'): string | undefined {
    const propsTemplate = this.props[key];
    if (propsTemplate) { return propsTemplate; }
    const localScope = this.props.markupTemplateScope;
    const partial = localScope ? localScope.getPartial(key) : undefined;
    if (partial) {
      return partial.source;
    }
    return undefined;
  }

  render() {
    if (this.state.loading) {
      return <Spinner />;
    } else if (this.state.error) {
      return <ErrorNotification errorMessage={this.state.error} />;
    } else {
      const {askResult} = this.state;
      const template = this.getTemplate(askResult ? 'then' : 'else');
      return template ? <TemplateItem template={{source: template}} /> : null;
    }
  }
}

function parseAskQuery(queryText: string): SparqlJs.AskQuery {
  if (!queryText) {
    throw new Error('Missing ASK Sparql query for <semantic-if>');
  }
  const query = SparqlUtil.parseQuery(queryText);
  if (query.type !== 'query' || query.queryType !== 'ASK') {
    throw new Error('Sparql query must be an ASK query');
  }
  return query;
}

export default SemanticIf;
