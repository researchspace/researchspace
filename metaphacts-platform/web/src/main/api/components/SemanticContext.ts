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

import { Component, Children, createFactory } from 'react';
import * as PropTypes from 'prop-types';

import { Rdf, turtle } from 'platform/api/rdf';
import { QueryContext } from 'platform/api/sparql';

export interface SemanticConfigProps {
  /**
   * Repository ID as registered in the platform repository manager.
   * Queries will be executed/evaluated against this repository.
   *
   * @default "default"
   */
  repository?: string;
  /**
   * Specifies the default graph, i.e. will be translated into a FROM <graphiri> clause.
   * Several default graphs will be interpreted as a single merge graph, i.e. according to the SPARQL 1.1 standard: 
   * "A default graph consisting of the RDF merge of the graphs referred to in the FROM clauses."
   * 
   * Defaults to an empty array, which usually means all graphs.
   * However, this may differ across database vendors (for example, in Stardog you will have to configure the database with query.all.graphs=true )
   * 
   * See <a href='https://www.w3.org/TR/rdf-sparql-query/#unnamedGraph' target='_blank'> https://www.w3.org/TR/rdf-sparql-query/#unnamedGraph </a> for details.
   * 
   * This functionality is still beta and not yet well tested.
   */
  defaultGraphs?: Array<string>;
  /**
   * List of named graphs that will restrict any GRAPH ?g{} clause within the query body to the enumerated graphs.
   * 
   * See <a href='https://www.w3.org/TR/rdf-sparql-query/#namedGraphs' target='_blank'>https://www.w3.org/TR/rdf-sparql-query/#namedGraphs</a> for details.
   * 
   * This functionality is still beta and not yet well tested.
   */
  namedGraphs?: Array<string>;
  /**
   * A string indexed map (object), of key value pairs to inject into queries.
   * The key is the plain binding name (without ? or $) and the value is the plain IRI or literal value to be injected.
   * 
   * The interface and implementation is not yet stable and might be changed or even be removed in the future without notice.
   */
  bindings?: { [binding: string]: string | Rdf.Node };
}

export interface SemanticContext {
  readonly semanticContext: QueryContext;
}

export const SemanticContextTypes: { [K in keyof SemanticContext]: any } = {
  semanticContext: PropTypes.object,
};

/**
 * Component that propagates down SPARQL query context.
 * Nested context would be merged with parent one, overriding
 * repository and bindings with the same keys.
 *
 * @example
 * <semantic-context repository='assets'
 *   named-graphs='["http://graph2", "http://graph2"]'
 *   default-graphs='["http://graph3", "http://graph4"]'
 *   bindings='{"var1": "http://some-iri",
 *     "var2": "\\"42\\"^^<http://www.w3.org/2001/XMLSchema#integer>"}'>
 *   <semantic-table query="SELECT * WHERE { ?x a ?var1 }"></semantic-table>
 * </semantic-context>
 *
 * @author Alexey Morozov
 */
export class SemanticContextProvider extends Component<SemanticConfigProps, {}> {
  static childContextTypes = SemanticContextTypes;
  static contextTypes = SemanticContextTypes;

  context: SemanticContext;

  getChildContext(): SemanticContext {
    const parentContext: QueryContext = this.context && this.context.semanticContext || {};
    const {repository, bindings, defaultGraphs, namedGraphs} = deserializeContext(this.props);
    const semanticContext: QueryContext = {
      repository, defaultGraphs, namedGraphs,
      bindings: mergeIfDefined(parentContext.bindings, bindings),
      isDefault: false,
    };
    return {semanticContext};
  }

  render() {
    return Children.only(this.props.children);
  }
}

export class BaseSemanticContextProvider extends SemanticContextProvider {
  getChildContext(): SemanticContext {
    const context = super.getChildContext();
    return {semanticContext: {...context.semanticContext, isDefault: true}};
  }
}

function deserializeContext(props: SemanticConfigProps): QueryContext {
  const bindings: { [binding: string]: Rdf.Node } = {};
  let hasAnyBinding = false;

  if (props.bindings) {
    for (const key in props.bindings) {
      if (!props.bindings.hasOwnProperty(key)) { continue; }
      let value = props.bindings[key];
      if (typeof value === 'string') {
        value = turtle.deserialize.n3ValueToRdf(value);
      }
      bindings[key] = value;
      hasAnyBinding = true;
    }
  }

  return {
    repository: props.repository,
    defaultGraphs: props.defaultGraphs,
    namedGraphs: props.namedGraphs,
    bindings: hasAnyBinding ? bindings : undefined,
  };
}

function mergeIfDefined<T>(
  first: T | undefined,
  second: T | undefined
): T | undefined {
  if (first && second) {
    return {...first as any, ...second as any};
  } else if (first) {
    return first;
  } else if (second) {
    return second;
  } else {
    return undefined;
  }
}

export type component = SemanticContextProvider;
export const component = SemanticContextProvider;
export const factory = createFactory(component);
export default component;
