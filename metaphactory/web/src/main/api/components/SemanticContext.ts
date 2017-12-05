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

import { Component, PropTypes, Children, createFactory } from 'react';

import { Rdf, turtle } from 'platform/api/rdf';
import { QueryContext } from 'platform/api/sparql';

export interface Props {
  repository?: string;
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
 *   bindings='{"var1": "http://some-iri",
 *     "var2": "\\"42\\"^^<http://www.w3.org/2001/XMLSchema#integer>"}'>
 *   <semantic-table query="SELECT * WHERE { ?x a ?var1 }"></semantic-table>
 * </semantic-context>
 *
 * @author Alexey Morozov
 */
export class SemanticContextProvider extends Component<Props, void> {
  static childContextTypes = SemanticContextTypes;
  static contextTypes = SemanticContextTypes;

  context: SemanticContext;

  getChildContext(): SemanticContext {
    const parentContext: QueryContext = this.context && this.context.semanticContext || {};
    const {repository, bindings} = deserializeContext(this.props);
    const semanticContext: QueryContext = {
      repository,
      bindings: mergeIfDefined(parentContext.bindings, bindings),
    };
    return {semanticContext};
  }

  render() {
    return Children.only(this.props.children);
  }
}

function deserializeContext(props: Props): QueryContext {
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
