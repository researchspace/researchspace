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

import * as N3 from 'n3';
import * as SparqlJs from 'sparqljs';

import { SparqlUtil, QueryVisitor, SparqlTypeGuards } from 'platform/api/sparql';

import {
  Value,
  ValidatedTreeConfig,
  ValidatedSimpleTreeConfig,
  ValidatedFullTreeConfig,
  State,
} from './FieldEditorState';

export function collectStateErrors(state: State): Error[] {
  const errors: Error[] = [];
  const collectError = (value: Value) => {
    if (value.error) {
      errors.push(value.error);
    }
  };

  const values = [
    state.id,
    state.description,
    state.xsdDatatype,
    state.min,
    state.max,
    state.order,
    state.testSubject,
    state.selectPattern,
    state.insertPattern,
    state.deletePattern,
    state.askPattern,
    state.valueSetPattern,
    state.autosuggestionPattern,
  ];
  for (const value of values) {
    value.map(collectError);
  }

  state.label.forEach(({ value }) => collectError(value));
  state.domain.forEach(collectError);
  state.range.forEach(collectError);
  state.defaults.forEach(collectError);
  state.treePatterns.map(collectTreeConfigErrors);
  return errors;
}

export function collectTreeConfigErrors(config: ValidatedTreeConfig): Error[] {
  const errors: Error[] = [];
  const collectError = (value: Value | undefined) => {
    if (value && value.error) {
      errors.push(value.error);
    }
  };

  if (config.type === 'simple') {
    collectError(config.schemePattern);
    collectError(config.relationPattern);
  } else {
    collectError(config.rootsQuery);
    collectError(config.childrenQuery);
    collectError(config.parentsQuery);
    collectError(config.searchQuery);
  }

  return errors;
}

/**
 * Returns a valid IRI value observable if supplied value is valid IRI string,
 * an error observable otherwise.
 */
export function validateIri(v: string): Value {
  if (!N3.Util.isIRI(v)) {
    return {
      value: v,
      error: new Error('Identifier must be a valid full IRI string.'),
    };
  }
  return { value: v };
}

/**
 * Returns a valid value (SPARQL select) string if supplied queryString is a valid
 * SPARQL SELECT query and fulfills all constraints e.g. has at least ?value ?subject
 * projection variable.
 * Returns an error observable otherwise.
 */
export function validateLabel(v: string): Value {
  if (v.length > 0) {
    return { value: v };
  }
  return {
    value: v,
    error: new Error('Label should be meaningful and have at least one character.'),
  };
}

/**
 * Returns a valid min value observable if value is >= 0, an error observable otherwise.
 */
export function validateMin(v: string): Value {
  const num = Number(v);
  if (Number.isInteger(num) && num >= 0) {
    return { value: v };
  } else {
    return {
      value: v,
      error: new Error('Min. Cardinality must be >= 0'),
    };
  }
}

/**
 * Returns a valid max observable value if value is >=1 or unbound, an error observable otherwise.
 */
export function validateMax(v: string): Value {
  const num = Number(v);
  if (v === 'unbound' || (Number.isInteger(num) && num >= 1)) {
    return { value: v };
  } else {
    return {
      value: v,
      error: new Error('Max. Cardinality must be >= 1 or unbound'),
    };
  }
}

/**
 * Returns a valid order observable value if value is >= 0 or unbound,
 * an error observable otherwise.
 */
export function validateOrder(v: string): Value {
  const num = Number(v);
  if (Number.isInteger(num) && num >= 0) {
    return { value: v };
  } else {
    return {
      value: v,
      error: new Error('Order must be >= 0'),
    };
  }
}
/**
 * Returns a valid value (SPARQL insert) observable if supplied queryString is a valid
 * SPARQL INSERT query and fulfills all constraints e.g. containing ?value ?subject.
 * Returns an error observable otherwise.
 */
export function validateInsert(query: string): Value {
  const error =
    `Insert pattern must be a valid SPARQL UPDATE INSERT query ` + `and must have a $subject and $value variable.`;
  return validateQuery({ query, type: 'insertdelete', variables: ['subject', 'value'], error });
}

/**
 * Returns a valid value  (SPARQL delete) observable if supplied queryString is a valid
 * SPARQL DELETE query and fulfills all constraints e.g. containing ?value ?subject.
 * Returns an error observable otherwise.
 */
export function validateDelete(query: string): Value {
  const error =
    `Delete pattern must be a valid SPARQL UPDATE DELETE query ` + `and must have a $subject and $value variable.`;
  return validateQuery({ query, type: 'insertdelete', variables: ['subject', 'value'], error });
}

/**
 * Returns a valid value (SPARQL select) observable if supplied queryString is a valid
 * SPARQL SELECT query and fulfills all constraints e.g. containing ?value ?subject.
 * Returns an error observable otherwise.
 */
export function validateSelect(query: string): Value {
  return validateQuery({
    query,
    type: 'SELECT',
    variables: ['subject', 'value'],
    projection: ['value'],
    error:
      `Select pattern must be a valid SPARQL SELECT query, ` +
      `must have a $subject and $value variable ` +
      `and must expose a ?value projection variable.`,
  });
}

/**
 * Returns a valid value (SPARQL ask) observable if supplied queryString is a valid
 * SPARQL ask query and fulfills all constraints.
 * Returns an error observable otherwise.
 */
export function validateAsk(query: string): Value {
  const error = `Ask validation pattern must be a valid SPARQL ASK query.`;
  return validateQuery({ query, type: 'ASK', error });
}

/**
 * Returns a valid value (SPARQL select) observable if supplied queryString is a valid
 * SPARQL SELECT query and fulfills all constraints e.g. has at least ?value ?subject
 * projection variable.
 * Returns an error observable otherwise.
 */
export function validateValueSet(query: string): Value {
  const error =
    `Select valueset pattern must be a valid SPARQL SELECT query ` + `and must expose a ?value projection variable.`;
  return validateQuery({ query, type: 'SELECT', projection: ['value'], error });
}

/**
 * Returns a valid value (SPARQL select) observable if supplied queryString is a valid
 * SPARQL SELECT query and fulfills all constraints e.g. has at least ?value ?subject
 * projection variable.
 * Returns an error observable otherwise.
 */
export function validateAutosuggestion(query: string): Value {
  const error =
    `Select autosuggestion pattern must be a valid SPARQL SELECT query ` +
    `and must expose a ?value and ?label projection variable.`;
  // TODO check also on existence of ?token, needs to be done with string contains
  // const containsToken = queryString.indexOf('"?token"')  !== -1;
  return validateQuery({ query, type: 'SELECT', projection: ['value', 'label'], error });
}

export function validateTreeConfig(config: ValidatedTreeConfig): ValidatedTreeConfig {
  if (config.type === 'simple') {
    const result: ValidatedSimpleTreeConfig = {
      type: 'simple',
      schemePattern: config.schemePattern
        ? validateQuery({
            patterns: config.schemePattern.value,
            variables: ['item'],
            error: 'Tree scheme pattern must be a valid SPARQL pattern ' + 'and must expose an ?item variable.',
          })
        : undefined,
      relationPattern: config.relationPattern
        ? validateQuery({
            patterns: config.relationPattern.value,
            variables: ['item', 'parent'],
            error:
              'Tree relation pattern must be a valid SPARQL pattern ' +
              'and must expose an ?item and ?parent variables.',
          })
        : undefined,
    };
    return result;
  } else {
    const result: ValidatedFullTreeConfig = {
      type: 'full',
      rootsQuery: validateQuery({
        query: config.rootsQuery ? config.rootsQuery.value : undefined,
        type: 'SELECT',
        projection: ['item', 'label', 'hasChildren'],
        error:
          'Tree roots pattern must be a valid SPARQL SELECT query ' +
          'and must expose a ?item, ?label and ?hasChildren projection variables.',
      }),
      childrenQuery: validateQuery({
        query: config.childrenQuery ? config.childrenQuery.value : undefined,
        type: 'SELECT',
        variables: ['parent'],
        projection: ['item', 'label', 'hasChildren'],
        error:
          'Tree children pattern must be a valid SPARQL SELECT query, ' +
          'must have a ?parent variable ' +
          'and must expose a ?item, ?label and ?hasChildren projection variables.',
      }),
      parentsQuery: validateQuery({
        query: config.parentsQuery ? config.parentsQuery.value : undefined,
        type: 'SELECT',
        projection: ['item', 'parent', 'parentLabel'],
        error:
          'Tree parents pattern must be a valid SPARQL SELECT query ' +
          'and must expose a ?item, ?parent and ?parentLabel projection variables.',
      }),
      searchQuery: validateQuery({
        query: config.searchQuery ? config.searchQuery.value : undefined,
        type: 'SELECT',
        projection: ['item', 'score', 'label', 'hasChildren'],
        error:
          'Tree search pattern must be a valid SPARQL SELECT query ' +
          'and must expose a ?item, ?score, ?label and ?hasChildren projection variables.',
      }),
    };
    return result;
  }
}

interface ValidateQueryParams {
  query?: string;
  patterns?: string;
  type?: SparqlJs.Query['queryType'] | SparqlJs.InsertDeleteOperation['updateType'];
  variables?: ReadonlyArray<string>;
  projection?: ReadonlyArray<string>;
  error: string;
}

function validateQuery(params: ValidateQueryParams): Value {
  const { query, patterns, type, variables = [], projection = [], error } = params;

  if (typeof query !== 'string' && typeof patterns !== 'string') {
    return { value: '', error: new Error(error) };
  }

  let value: string;
  let queryInfo: QueryInfo;
  try {
    if (query) {
      value = query;
      const parsedQuery = SparqlUtil.parseQuery(query);
      queryInfo = collectQueryInfo({ query: parsedQuery });
    } else if (patterns) {
      value = patterns;
      const parsedPatterns = SparqlUtil.parsePatterns(patterns);
      queryInfo = collectQueryInfo({ patterns: parsedPatterns });
    }
  } catch (e) {
    return { value, error: e };
  }

  const { queryType, allVariables, projectionVariables } = queryInfo;
  const hasCorrectType = !type || queryType === type;
  const projectionSet = new Set(projectionVariables);
  const hasEveryVariable = variables.every((v) => allVariables.has(v));
  const hasEveryProjection = projection.every((v) => projectionSet.has(v));

  if (hasCorrectType && hasEveryVariable && hasEveryProjection) {
    return { value };
  } else {
    return { value, error: new Error(error) };
  }
}

export interface QueryInfo {
  queryType: string;
  allVariables: Set<string>;
  projectionVariables: string[];
}

/**
 * Traverses the query AST of the specified {@SparqlJs.SparqlQuery} and
 * collects information into a {@QueryInfo} object including information on the
 * query type and whether certain variables exist.
 *
 * In addition we collect extract information of which projection variables are being used.
 */
export function collectQueryInfo(params: { query?: SparqlJs.SparqlQuery; patterns?: SparqlJs.Pattern[] }): QueryInfo {
  const visitor = new (class extends QueryVisitor {
    allVariables = new Set<string>();
    queryType: string;

    variableTerm(variable: SparqlJs.Term) {
      const name = variable.substr(1);
      this.allVariables.add(name);
      return super.variableTerm(variable);
    }

    query(query: SparqlJs.Query): SparqlJs.Query {
      this.queryType = query.queryType;
      return super.query(query);
    }

    insertDelete(operation: SparqlJs.InsertDeleteOperation) {
      this.queryType = operation.updateType;
      return super.insertDelete(operation);
    }
  })();

  const { query, patterns } = params;
  let projectionVariables: string[] = [];

  if (query) {
    visitor.sparqlQuery(query);
    if (query.type === 'query' && query.queryType === 'SELECT' && !SparqlTypeGuards.isStarProjection(query.variables)) {
      projectionVariables = query.variables.map((v) =>
        SparqlTypeGuards.isTerm(v) ? v.substr(1) : v.variable.substr(1)
      );
    }
  } else if (patterns) {
    patterns.forEach((p) => visitor.pattern(p));
  }

  return {
    queryType: visitor.queryType,
    allVariables: visitor.allVariables,
    projectionVariables: projectionVariables,
  };
}
