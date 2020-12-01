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
import * as maybe from 'data.maybe';

import { SparqlUtil, SparqlClient } from 'platform/api/sparql';

import { setSearchDomain } from '../commons/Utils';
import { SemanticSearchContext, InitialQueryContext } from './SemanticSearchApi';
import { Dictionary } from 'platform/api/sparql/SparqlClient';
import { Cancellation } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';
import { listen, Event } from 'platform/api/events';


export interface QueryConstantParameter {
  /**
   * 
   */
  dataType?: string;

  /**
   * 
   */
  value: string;
}

export interface SemanticSearchQueryConstantConfig {
  /**
   * SPARQL SELECT query string that should be used as a base query in the search.
   * Should have only one projection variable.
   * In favour of consistency, we recommend to use a variable named `?subject`.
   */
  query: string;


  /**
   * 
   */
  parameters?: Dictionary<QueryConstantParameter>;

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
        {(context) => <QueryConstantInner {...this.props} context={context} />}
      </SemanticSearchContext.Consumer>
    );
  }
}

interface InnerProps extends QueryConstantProps {
  context: InitialQueryContext;
}

class QueryConstantInner extends React.Component<InnerProps, {}> {
  private cancelation = new Cancellation();

  componentDidMount() {
    const { parameters } = this.props;

    this.executeQuery(parameters);

    this.cancelation
      .map(
        listen({
          eventType: SemanticSearchQueryConstantSetParameters,
        })
      )
      .onValue(this.setParameters);
  }

  componentWillReceiveProps(props: InnerProps) {
    const { context } = props;
    if (context.searchProfileStore.isJust && context.domain.isNothing) {
      setSearchDomain(props.domain, context);
    }
  }

  private setParameters = (event: Event<any>) => {
    this.executeQuery(event.data);
  };

  /**
   * 
   * @param query 
   */
  private executeQuery(parameters: Dictionary<QueryConstantParameter>) {
    const { query } = this.props;

    this.props.context.setBaseQuery(maybe.Just(this.injectParameters(SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(query), parameters)));
  }

  /**
   * 
   * @param query: SparsqlJs.SelectQuery
   */
  private injectParameters(query: SparqlJs.SelectQuery, parameters: any) {

    const tmpParams: Dictionary<Rdf.Node> = {};

    for (const key in parameters) {
      tmpParams[key] = Rdf.literal(parameters[key].value);
    }

    return SparqlClient.setBindings(query, tmpParams);
  }

  render() {
    return null;
  }
}

export default QueryConstant;
export const SemanticSearchQueryConstantSetParameters = 'SemanticSearch.QueryConstant.SetParameters';