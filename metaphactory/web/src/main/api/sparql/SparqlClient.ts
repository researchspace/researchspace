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

import * as assign from 'object-assign';
import * as Kefir from 'kefir';
import * as _ from 'lodash';
import * as URI from 'urijs';

import { serializeQuery, parseQuerySync } from './SparqlUtil';
import { cloneQuery } from './QueryVisitor';
import { VariableBinder, TextBinder } from './QueryBinder';
import * as turtle from '../rdf/formats/turtle';
import Rdf = require('../rdf/core/Rdf');
import streamingHttp = require('../sparql/streamingHttp');
import * as request from 'superagent';

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
    QUERY, UPDATE,
  }

  /**
   * Supported SPARQL query forms.
   *
   * @see {@link http://www.w3.org/TR/sparql11-query/#QueryForms}
   */
  export enum SparqlQueryForm {
    SELECT, CONSTRUCT, ASK, DESCRIBE,
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

  var SPARQL_RESULT_ACCEPT_HEADERS = {
    SELECT: {
      JSON: 'application/sparql-results+json',
    },
    CONSTRUCT: {
      TURTLE: 'text/turtle',
    },
  };

  var DefaultResultHeaders = {
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

  interface SparqlSelectJsonResult {
    head: {
      link: any [];
      vars: string [];
    };
    results: {
      bindings: Dictionary<SparqlSelectBinding> [];
      distinct: boolean;
      ordered: boolean;
    }
  }

  export type Binding = Dictionary<Rdf.Node>;
  export type Bindings = Binding [];

  export interface SparqlSelectResult {
    head: {
      link: any [];
      vars: string [];
    };
    results: {
      bindings: Bindings;
      distinct: boolean;
      ordered: boolean;
    }
  }

  export type Parameters = Dictionary<Rdf.Node>[];

  export function accumulateStringStream(stream: Kefir.Stream<string>): Kefir.Property<string> {
    return stream.scan((acc, x) => acc + x, '').last();
  }

  export function stringStreamAsJson(stream: Kefir.Stream<string>): Kefir.Property<{}> {
    return accumulateStringStream(stream).map(JSON.parse);
  }

  /**
   * Parametrize query using VALUES clause.
   *
   * Example:
   * query = SELECT ?p WHERE {?s ?p ?o}
   * parameters = [{'p': <example>}, {'p': <example2>}]
   * result = SELECT ?p WHERE {?s ?p ?o . VALUES(?p) { (<example>) (<example2>) }}
   */
  export function prepareQuery(
    query: string , parameters: Parameters
  ): Kefir.Property<SparqlJs.SparqlQuery> {
    return Kefir.constant(parseQuerySync(query)).map(prepareParsedQuery(parameters));
  }

  export function prepareParsedQuery(parameters: Parameters) {
    return (query: SparqlJs.Query): SparqlJs.Query => {
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
    return _.map(parameters, tuple =>
      _.reduce(tuple, (acc, v, k) => {
          acc['?' + k] = turtle.serialize.nodeToN3(v) as SparqlJs.Term;
          return acc;
        }, {} as Dictionary<SparqlJs.Term>
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
    query: TQuery, replacements: Array<{ test: RegExp, replace: string }>
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
  }

  export interface SparqlContext {
    [binding: string]: Rdf.Node;
  }

  export function construct(
    query: string | SparqlJs.SparqlQuery, options?: SparqlOptions
  ): Kefir.Property<Rdf.Triple[]> {
    return graphQuery(query, true, options);
  }

  export function describe(
    query: string | SparqlJs.SparqlQuery, options?: SparqlOptions
  ): Kefir.Property<Rdf.Triple[]> {
    return graphQuery(query, false, options);
  }

  export function select(
    query: string | SparqlJs.SparqlQuery, options?: SparqlOptions
  ): Kefir.Property<SparqlSelectResult> {
    return stringStreamAsJson(
      streamSparqlQuery(query, SparqlQueryForm.SELECT, options)
    ).map(res => {
      var selectJson = <SparqlSelectJsonResult>res;
      return sparqlJsonToSelectResult(selectJson);
    });
  }

  export function sparqlJsonToSelectResult(selectJson: SparqlSelectJsonResult): SparqlSelectResult {
    var bindings = _.map(
      selectJson.results.bindings,
      binding => _.mapValues(binding, sparqlSelectBindingValueToRdf));
    return {
      head: selectJson.head,
      results: {
        bindings: bindings,
        distinct: selectJson.results.distinct,
        ordered: selectJson.results.ordered,
      },
    };
  }

  export function ask(
    query: string | SparqlJs.SparqlQuery, options?: SparqlOptions
  ): Kefir.Property<boolean> {
    return stringStreamAsJson(
      streamSparqlQuery(query, SparqlQueryForm.SELECT, options)
    ).map(res => res['boolean']);
  }

  function graphQuery(
    query: string | SparqlJs.SparqlQuery, isConstruct: boolean, options?: SparqlOptions
  ) {
    return accumulateStringStream(
      streamSparqlQuery(
        query, isConstruct ? SparqlQueryForm.CONSTRUCT : SparqlQueryForm.DESCRIBE, options
      )
    ).flatMap(
      turtle.deserialize.turtleToTriples
    ).toProperty();
  }

  export function streamSparqlQuery(
    query: string | SparqlJs.SparqlQuery, form: SparqlQueryForm, options?: SparqlOptions
  ) {
    const format = DefaultResultHeaders[form];
    return sendStreamSparqlQuery(query, format, options);
  }

  export function sendStreamSparqlQuery(
    query: string | SparqlJs.SparqlQuery, format: string, options: SparqlOptions = {}
  ) {
    const {endpoint, context} = options;
    return streamingSparqlQueryRequest({
      query,
      endpoint,
      headers: {'Accept': format},
      context,
    });
  }

  export function streamingSparqlQueryRequest(params: {
    query: string | SparqlJs.SparqlQuery;
    endpoint: string;
    headers: { [header: string]: string };
    context: QueryContext;
  }) {
    const {query, endpoint = '/sparql', headers, context = {}} = params;

    let parametrizedEndpoint = endpoint;
    if (context.repository) {
      parametrizedEndpoint += '?' + URI.buildQuery({repository: context.repository});
    }

    const parsedQuery = typeof query === 'string' ? parseQuerySync(query) : query;
    const queryWithContext = context.bindings
      ? setBindings(parsedQuery, context.bindings) : parsedQuery;
    const preparedQuery = serializeQuery(queryWithContext);

    const header = assign({
      'Content-Type': 'application/sparql-query; charset=utf-8',
    }, headers);
    return streamingHttp('POST', parametrizedEndpoint, preparedQuery, header, false);
  }

  export function executeSparqlUpdate(
    query: SparqlJs.Update | string, options: SparqlOptions = {}
  ): Kefir.Property<void> {
    const {endpoint = '/sparql', context = {}} = options;

    let parametrizedEndpoint = endpoint;
    if (context.repository) {
      parametrizedEndpoint += '?' + URI.buildQuery({repository: context.repository});
    }

    const parsedQuery = typeof query === 'string' ? parseQuerySync(query) : query;
    const queryWithContext = context.bindings
      ? setBindings(parsedQuery, context.bindings) : parsedQuery;
    const preparedQuery = serializeQuery(queryWithContext);

    const updateRequest = request
      .post(parametrizedEndpoint)
      .send(preparedQuery)
      .set('Content-Type', 'application/sparql-query; charset=utf-8')
      .set('Accept', 'text/boolean');

    return Kefir.fromNodeCallback<void>(
      cb => updateRequest.end((err, res) =>
        cb(err != null ? Error(err.response.statusText) : null, res.body))
    ).toProperty();
  }

  /**
   * Convert sparql-results+json binding term to internal RDF representation.
   *
   * @see http://www.w3.org/TR/sparql11-results-json/#select-encode-terms
   */
  function sparqlSelectBindingValueToRdf(binding: SparqlSelectBinding): Rdf.Node {
    if (binding.type == 'uri') {
      return Rdf.iri(binding.value);
    } else if (binding.type == 'literal') {
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
