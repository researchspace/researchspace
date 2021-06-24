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

import * as assign from 'object-assign';
import * as Kefir from 'kefir';
import * as _ from 'lodash';
import * as SparqlJs from 'sparqljs';
import * as URI from 'urijs';

import { serializeQuery, parseQuerySync } from './SparqlUtil';
import { cloneQuery } from './QueryVisitor';
import { VariableBinder, TextBinder } from './QueryBinder';
import * as turtle from '../rdf/formats/turtle';
import * as Rdf from '../rdf/core/Rdf';
import * as request from 'platform/api/http';
import { requestAsProperty } from 'platform/api/async';

/**
 * Javascript client for SPARQL 1.1 endpoint.
 *
 * @see {@link @see http://www.w3.org/TR/sparql11-protocol/}
 */
module SparqlClient {
  /**
   * SPARQL protocol operations.
   *
   * @see {@link http://www.w3.org/TR/sparql11-protocol/#protocol}
   */
  export enum SparqlOperationType {
    QUERY,
    UPDATE,
  }

  /**
   * Supported SPARQL query forms.
   *
   * @see {@link http://www.w3.org/TR/sparql11-query/#QueryForms}
   */
  export enum SparqlQueryForm {
    SELECT,
    CONSTRUCT,
    ASK,
    DESCRIBE,
  }

  /**
   * String representation for {@link SparqlQueryform}
   */
  export var stringToSparqlQueryForm: Dictionary<SparqlQueryForm> = {
    SELECT: SparqlQueryForm.SELECT,
    CONSTRUCT: SparqlQueryForm.CONSTRUCT,
    ASK: SparqlQueryForm.ASK,
    DESCRIBE: SparqlQueryForm.DESCRIBE,
  };

  const SPARQL_RESULT_ACCEPT_HEADERS = {
    SELECT: {
      JSON: 'application/sparql-results+json',
    },
    CONSTRUCT: {
      TURTLE: 'text/turtle',
    },
  };

  const DefaultResultHeaders = {
    [SparqlQueryForm.CONSTRUCT]: SPARQL_RESULT_ACCEPT_HEADERS.CONSTRUCT.TURTLE,
    [SparqlQueryForm.SELECT]: SPARQL_RESULT_ACCEPT_HEADERS.SELECT.JSON,
    [SparqlQueryForm.ASK]: SPARQL_RESULT_ACCEPT_HEADERS.SELECT.JSON,
    [SparqlQueryForm.DESCRIBE]: SPARQL_RESULT_ACCEPT_HEADERS.CONSTRUCT.TURTLE,
  };

  export interface Dictionary<T> {
    [index: string]: T;
  }

  interface SparqlSelectBinding {
    value: string;
    type: string;
    datatype?: string;
    'xml:lang'?: string;
  }

  export interface SparqlSelectJsonResult {
    head: {
      link: any[];
      vars: string[];
    };
    results: {
      bindings: Dictionary<SparqlSelectBinding>[];
      distinct: boolean;
      ordered: boolean;
    };
  }

  export type Binding = Dictionary<Rdf.Node>;
  export type Bindings = Binding[];

  export interface SparqlSelectResult {
    head: {
      link: any[];
      vars: string[];
    };
    results: {
      bindings: Bindings;
      distinct: boolean;
      ordered: boolean;
    };
  }

  export type Parameters = Dictionary<Rdf.Node>[];

  /**
   * Parametrize query using VALUES clause.
   *
   * Example:
   * query = SELECT ?p WHERE {?s ?p ?o}
   * parameters = [{'p': <example>}, {'p': <example2>}]
   * result = SELECT ?p WHERE {?s ?p ?o . VALUES(?p) { (<example>) (<example2>) }}
   */
  export function prepareQuery(query: string, parameters: Parameters): Kefir.Property<SparqlJs.SparqlQuery> {
    return Kefir.constant(parseQuerySync(query)).map(prepareParsedQuery(parameters));
  }

  export function prepareParsedQuery(parameters: Parameters) {
    return <TQuery extends SparqlJs.Query>(query: TQuery): TQuery => {
      const values = serializeParameters(parameters);
      if (_.isEmpty(values) === false) {
        const queryCopy = _.cloneDeep(query);
        // When query has no where clause we need to add empty one.
        // This can happen in case of simple construct query.
        queryCopy.where = queryCopy.where ? queryCopy.where : [];
        queryCopy.where.unshift({
          type: 'values',
          values: values,
        });
        return queryCopy;
      } else {
        return query;
      }
    };
  }

  function serializeParameters(parameters: Parameters) {
    return _.map(parameters, (tuple) =>
      _.reduce(
        tuple,
        (acc, v, k) => {
          acc['?' + k] = turtle.serialize.nodeToN3(v) as SparqlJs.Term;
          return acc;
        },
        {} as Dictionary<SparqlJs.Term>
      )
    );
  }

  /**
   * Parametrize query by replacing variables or IRIs.
   *
   * @example
   * setBindings(
   *   parseQuery('SELECT * WHERE { ?s ?p <my:obj> }'),
   *   { 'p': Rdf.iri('my:iri'), 'my:obj': Rdf.literal('my_literal') })
   * === parseQuery('SELECT * WHERE { ?s <my:iri> "my_literal"^^xsd:string }')
   */
  export function setBindings<TQuery extends SparqlJs.SparqlQuery>(
    query: TQuery,
    parameters: Dictionary<Rdf.Node>
  ): TQuery {
    const queryCopy = cloneQuery(query);
    new VariableBinder(parameters).sparqlQuery(queryCopy);
    return queryCopy;
  }

  /**
   * Parametrize query by applying specified RegExp to its literals.
   *
   * @example
   * setTextBindings(
   *   parseQuery('SELECT * WHERE { ?s ?p "text TOKEN othertext" }'),
   *   [{test: /TOKEN/, replace: 'replacement' })
   * === parseQuery('SELECT * WHERE { ?s ?p "text replacement othertext" }')
   */
  export function setTextBindings<TQuery extends SparqlJs.SparqlQuery>(
    query: TQuery,
    replacements: Array<{ test: RegExp; replace: string }>
  ) {
    const queryCopy = cloneQuery(query);
    new TextBinder(replacements).sparqlQuery(queryCopy);
    return queryCopy;
  }

  export interface SparqlOptions {
    endpoint?: string;
    context?: QueryContext;
  }

  export interface QueryContext {
    readonly repository?: string;
    readonly bindings?: SparqlContext;

    readonly defaultGraphs?: Array<string>;
    readonly namedGraphs?: Array<string>;

    /**
     * Applicable only to CONSTRUCT/DESCRIBE queries. True if result should be pretty printed.
     */
    readonly prettyPrint?: boolean;

    /**
     * True if the context is a default one and has not been overwritten.
     */
    readonly isDefault?: boolean;
  }

  export interface SparqlContext {
    [binding: string]: Rdf.Node;
  }

  export function construct(
    query: string | SparqlJs.SparqlQuery,
    options?: SparqlOptions
  ): Kefir.Property<Rdf.Triple[]> {
    return graphQuery(query, true, options);
  }

  export function describe(
    query: string | SparqlJs.SparqlQuery,
    options?: SparqlOptions
  ): Kefir.Property<Rdf.Triple[]> {
    return graphQuery(query, false, options);
  }

  export function select(
    query: string | SparqlJs.SparqlQuery,
    options?: SparqlOptions
  ): Kefir.Property<SparqlSelectResult> {
    return sparqlQuery(query, SparqlQueryForm.SELECT, options).map((res) => {
      const selectJson = <SparqlSelectJsonResult>JSON.parse(res);
      return sparqlJsonToSelectResult(selectJson);
    });
  }

  export function sparqlJsonToSelectResult(selectJson: SparqlSelectJsonResult): SparqlSelectResult {
    const bindings = _.map(selectJson.results.bindings, (binding) =>
      _.mapValues(binding, sparqlSelectBindingValueToRdf)
    );
    return {
      head: selectJson.head,
      results: {
        bindings: bindings,
        distinct: selectJson.results.distinct,
        ordered: selectJson.results.ordered,
      },
    };
  }

  export function ask(query: string | SparqlJs.SparqlQuery, options?: SparqlOptions): Kefir.Property<boolean> {
    return sparqlQuery(query, SparqlQueryForm.SELECT, options).map((res) => JSON.parse(res)['boolean']);
  }

  function graphQuery(query: string | SparqlJs.SparqlQuery, isConstruct: boolean, options?: SparqlOptions) {
    return sparqlQuery(query, isConstruct ? SparqlQueryForm.CONSTRUCT : SparqlQueryForm.DESCRIBE, options)
      .flatMap(turtle.deserialize.turtleToTriples)
      .toProperty();
  }

  export function sparqlQuery(query: string | SparqlJs.SparqlQuery, form: SparqlQueryForm, options?: SparqlOptions) {
    const format = DefaultResultHeaders[form];
    return sendSparqlQuery(query, format, options);
  }

  export function sendSparqlQuery(query: string | SparqlJs.SparqlQuery, format: string, options: SparqlOptions = {}) {
    const { endpoint, context } = options;
    return sparqlQueryRequest({
      query,
      endpoint,
      headers: { Accept: format },
      context,
    });
  }

  export function sparqlQueryRequest(params: {
    query: string | SparqlJs.SparqlQuery;
    endpoint: string;
    headers: { [header: string]: string };
    context: QueryContext;
  }): Kefir.Property<string> {
    const { query, endpoint = '/sparql', headers, context = {} } = params;

    let parametrizedEndpoint = new URI(endpoint);
    if (context.repository) {
      parametrizedEndpoint.addQuery({ repository: context.repository });
    }
    if (context.prettyPrint) {
      parametrizedEndpoint.addQuery({ 'prettyPrint': true });
    }
    if (context.defaultGraphs) {
      parametrizedEndpoint.addQuery({ 'default-graph-uri': context.defaultGraphs });
    }
    if (context.namedGraphs) {
      parametrizedEndpoint.addQuery({ 'named-graph-uri': context.namedGraphs });
    }
    let parsedQuery: SparqlJs.SparqlQuery;
    try {
      parsedQuery = typeof query === 'string' ? parseQuerySync(query) : query;
    } catch (e) {
      return Kefir.constantError(e);
    }
    const queryWithContext = context.bindings ? setBindings(parsedQuery, context.bindings) : parsedQuery;
    const preparedQuery = serializeQuery(queryWithContext);

    const header = assign(
      {
        'Content-Type': 'application/sparql-query; charset=utf-8',
      },
      headers
    );

    const req = request.post(parametrizedEndpoint.toString()).send(preparedQuery).set(header);
    return requestAsProperty(req).map((res) => res.text);
  }

  export function executeSparqlUpdate(
    query: SparqlJs.Update | string,
    options: SparqlOptions = {}
  ): Kefir.Property<void> {
    const { endpoint = '/sparql', context = {} } = options;

    let parametrizedEndpoint = endpoint;
    if (context.repository) {
      parametrizedEndpoint += '?' + URI.buildQuery({ repository: context.repository });
    }

    const parsedQuery = typeof query === 'string' ? parseQuerySync(query) : query;
    const queryWithContext = context.bindings ? setBindings(parsedQuery, context.bindings) : parsedQuery;
    const preparedQuery = serializeQuery(queryWithContext);

    const updateRequest = request
      .post(parametrizedEndpoint)
      .send(preparedQuery)
      .set('Content-Type', 'application/sparql-query; charset=utf-8')
      .set('Accept', 'text/boolean');

    return requestAsProperty(updateRequest).map((res) => res.body);
  }

  /**
   * Convert sparql-results+json binding term to internal RDF representation.
   *
   * @see http://www.w3.org/TR/sparql11-results-json/#select-encode-terms
   */
  function sparqlSelectBindingValueToRdf(binding: SparqlSelectBinding): Rdf.Node {
    if (binding.type === 'uri') {
      return Rdf.iri(binding.value);
    } else if (binding.type === 'literal') {
      return sparqlSelectBindingLiteralToRdf(binding);
    } else {
      return Rdf.bnode(binding.value);
    }
  }

  function sparqlSelectBindingLiteralToRdf(binding: SparqlSelectBinding): Rdf.Literal {
    if (!_.isUndefined(binding['xml:lang'])) {
      return Rdf.langLiteral(binding.value, binding['xml:lang']);
    } else if (!_.isUndefined(binding.datatype)) {
      return Rdf.literal(binding.value, Rdf.iri(binding.datatype));
    } else {
      return Rdf.literal(binding.value);
    }
  }
}

export = SparqlClient;
