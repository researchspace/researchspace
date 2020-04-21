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
import * as SparqlJs from 'sparqljs';

import { Component, ComponentProps } from 'platform/api/components';
import { Cancellation } from 'platform/api/async';
import { SparqlClient, SparqlUtil, SparqlTypeGuards } from 'platform/api/sparql';
import { ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';
import { TemplateItem } from 'platform/components/ui/template';

export interface SemanticSwitchProps extends ComponentProps {
  query: string;
  cases?: { [caseKey: string]: string };
}

interface State {
  readonly loading?: boolean;
  readonly error?: any;
  readonly selectedCase?: string;
}

/**
 * @example
 * <semantic-switch query='SELECT (?color) ...' cases='{
 *   "blue": "{{> purple}}",
 *   "http://dbpedia.org/resource/Egyptian_blue": "{{> blue}}",
 * }'>
 *   <template id='blue'>...</template>
 *   <template id='purple'>...</template>
 *   <template id='default'>...</template>
 * </semantic-switch>
 *
 * // shorthand version (without 'blue' case)
 * <semantic-switch query='SELECT (?color) ...'>
 *   <template id='purple'>...</template>
 *   <template id='http://dbpedia.org/resource/Egyptian_blue'>...</template>
 *   <template id='default'>...</template>
 * </semantic-switch>
 *
 * // inline templates in cases
 * <semantic-switch query='SELECT (?color) ...' cases='{
 *   "red": "<!-- markup -->"
 *   "blue": "<!-- markup -->",
 *   "http://dbpedia.org/resource/Egyptian_blue": "<!-- markup -->",
 * }'></semantic-switch>
 */
export class SemanticSwitch extends Component<SemanticSwitchProps, State> {
  static readonly defaultProps: Partial<SemanticSwitchProps> = {
    cases: {},
  };

  private readonly cancellation = new Cancellation();

  constructor(props: SemanticSwitchProps, context: any) {
    super(props, context);
    this.state = { loading: true };
  }

  componentDidMount() {
    let switchQuery: SparqlJs.SelectQuery;
    try {
      switchQuery = parseSwitchSelectQuery(this.props.query);
    } catch (error) {
      this.setState({ loading: false, error });
      return;
    }

    const { semanticContext } = this.context;
    this.cancellation.map(SparqlClient.select(switchQuery, { context: semanticContext })).observe({
      value: (result) => this.setResultCase(result),
      error: (error) => this.setState({ loading: false, error }),
    });
  }

  private getCaseTemplate(key: string): string | undefined {
    const propsTemplate = this.props.cases[key];
    if (propsTemplate) {
      return propsTemplate;
    }
    const localScope = this.props.markupTemplateScope;
    const partial = localScope ? localScope.getPartial(key) : undefined;
    if (partial) {
      return partial.source;
    }
    return undefined;
  }

  private setResultCase(result: SparqlClient.SparqlSelectResult) {
    if (result.results.bindings.length === 0) {
      // fallback to default case
      this.setState({ loading: false });
    } else {
      const firstBidning = result.results.bindings[0];
      const caseNode = firstBidning[result.head.vars[0]];
      const selectedCase = caseNode ? caseNode.value : undefined;
      this.setState({ loading: false, selectedCase });
    }
  }

  render() {
    if (this.state.loading) {
      return <Spinner />;
    } else if (this.state.error) {
      return <ErrorNotification errorMessage={this.state.error} />;
    } else {
      const template = this.getCaseTemplate(this.state.selectedCase);
      const withFallback = template === undefined ? this.getCaseTemplate('default') : template;
      return withFallback ? <TemplateItem template={{ source: withFallback }} /> : null;
    }
  }
}

function parseSwitchSelectQuery(querySource: string): SparqlJs.SelectQuery {
  if (!querySource) {
    throw new Error('Missing SELECT Sparql query for <semantic-switch>');
  }
  const query = SparqlUtil.parseQuery(querySource);
  if (query.type !== 'query' || query.queryType !== 'SELECT') {
    throw new Error('Sparql query must be a SELECT query');
  }
  if (SparqlTypeGuards.isStarProjection(query.variables) || query.variables.length !== 1) {
    throw new Error('SELECT query for <semantic-switch> ' + 'must contain only a single projection variable');
  }
  return query;
}

export default SemanticSwitch;
