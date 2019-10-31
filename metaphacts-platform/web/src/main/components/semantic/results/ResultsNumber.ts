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

import { createElement } from 'react';
import * as Maybe from 'data.maybe';
import * as _ from 'lodash';
import * as SparqlJs from 'sparqljs';

import { Component } from 'platform/api/components';
import { BuiltInEvents, trigger } from 'platform/api/events';
import { QueryVisitor, SparqlClient, SparqlUtil } from 'platform/api/sparql';

import { Spinner } from 'platform/components/ui/spinner';
import { TemplateItem } from 'platform/components/ui/template';

export interface Props {
  /**
   * SPARQL query
   */
  query: string;

  /**
   * Handlebars template that will be rendered on query execution.
   * Special variables will be available in the template:
   * - numberOfResults
   * - totalNumberOfResults
   * - hasLimit
   */
  template?: string;

  /**
   * ID for issuing component events.
   */
  id?: string;
}

export interface State {
  number?: Data.Maybe<number>;
  totalNumber?: Data.Maybe<number>;
  isLoading?: boolean;
}

/**
 * This component render number of SPARQL query results.
 * If query has a limit and number of results is larger than a limit,
 * this component will render also total number of results.
 */
export class ResultsNumberComponent extends Component<Props, State> {
  private limit: number;

  static defaultProps = {
    template: `
        showing {{numberOfResults}} {{#if hasLimit}} of {{totalNumberOfResults}} {{/if}}
    `,
  };

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {
      number: Maybe.Nothing<number>(),
      totalNumber: Maybe.Nothing<number>(),
      isLoading: false,
    };
  }

  public componentDidMount() {
    this.calcResultsNumber(this.props.query);
  }

  public componentWillReceiveProps(nextProps: Props) {
    if (!_.isEqual(nextProps.query, this.props.query)) {
      this.calcResultsNumber(nextProps.query);
    }
  }

  private calcResultsNumber = (query: string) => {
    this.setState({
      isLoading: true,
    });

    const countQuery =
      this.prepareCountQuery(
        SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(query)
      );
    const loading = SparqlClient.select(countQuery, {context: this.context.semanticContext})
      .map(res => parseInt(res.results.bindings[0]['count'].value))
      .onValue(this.updateCounts)
      .onError(this.onError);

    if (this.props.id) {
      trigger({
        eventType: BuiltInEvents.ComponentLoading,
        source: this.props.id,
        data: loading,
      });
    }
  }

  /**
   * Wraps query into 'select (count(*) as ?count) {}'.
   * Calculates value of limit.
   * Removes all limits from query.
   */
  private prepareCountQuery = (query: SparqlJs.SelectQuery): string => {
    // calculate value of limit
    // and remove all limits from query by iterate through all nested queries
    const visitor = new (class extends QueryVisitor {
      public limits = [];
      select(select: SparqlJs.SelectQuery): SparqlJs.Query | SparqlJs.Pattern {
        if (select.limit) {
          this.limits.push(select.limit);
          delete select.limit;
        }
        return super.select(select);
      }
    });
    visitor.sparqlQuery(query);

    this.limit = visitor.limits.length ? Math.min(...visitor.limits) : undefined;

    // remove prefixes to wrap query
    query.prefixes = {};

    // wrap query into 'select (count(*) as ?count) {}'
    return `SELECT (COUNT(*) AS ?count) WHERE {{${SparqlUtil.serializeQuery(query)}}}`;
  }

  /**
   * Calculates and sets number of results and total number of results
   */
  private updateCounts = (number: number) => {
    this.setState({
      number: Maybe.Just(this.limit <= number ? this.limit : number),
      totalNumber: this.limit && this.limit < number ? Maybe.Just(number) : Maybe.Nothing<number>(),
      isLoading: false,
    });
  }

  private onError = (error) => {
    throw error;
  }

  render() {
    if (this.state.number.isJust && !this.state.isLoading) {
      return createElement(TemplateItem, {
        template: {
          source: this.props.template,
          options: {
            'numberOfResults': this.state.number.get(),
            'totalNumberOfResults': this.state.totalNumber.getOrElse(undefined),
            'hasLimit': this.state.totalNumber.isJust,
          },
        },
      });
    } else if (this.state.isLoading) {
      return createElement(Spinner);
    } else {
      return null;
    }
  }
}

export default ResultsNumberComponent;
