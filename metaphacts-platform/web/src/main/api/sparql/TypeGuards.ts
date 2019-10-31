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

import * as SparqlJs from 'sparqljs';

export function isQuery(node: any): node is SparqlJs.Query {
  return typeof node === 'object' && node.type === 'query';
}

export function isSelectQuery(query: SparqlJs.Query): query is SparqlJs.SelectQuery {
  return query.queryType === 'SELECT';
}

export function isConstructQuery(query: SparqlJs.Query): query is SparqlJs.ConstructQuery {
  return query.queryType === 'CONSTRUCT';
}

export function isAskQuery(query: SparqlJs.Query): query is SparqlJs.AskQuery {
  return query.queryType === 'ASK';
}

export function isDescribeQuery(query: SparqlJs.Query): query is SparqlJs.DescribeQuery {
  return query.queryType === 'DESCRIBE';
}


export function isStarProjection(variables: any): variables is ['*'] {
  return Array.isArray(variables) && variables.length === 1 && variables[0] === '*';
}

export function isPattern(node: any): node is SparqlJs.Pattern {
  if (typeof node === 'object') {
    switch (node.type) {
      case 'bgp':
      case 'optional':
      case 'union':
      case 'group':
      case 'minus':
      case 'graph':
      case 'service':
      case 'filter':
      case 'values':
        return true;
    }
  }
  return false;
}

export function isGroupPattern(
  pattern: SparqlJs.Pattern
): pattern is SparqlJs.GroupPattern {
  return pattern.type === 'group';
}

export function isBlockPattern(
  pattern: SparqlJs.Pattern
): pattern is SparqlJs.BlockPattern {
  switch (pattern.type) {
    case 'optional':
    case 'union':
    case 'group':
    case 'minus':
    case 'graph':
    case 'service':
      return true;
    default:
      return false;
  }
}

export function isExpression(node: any): node is SparqlJs.Expression {
  if (typeof node === 'string') {
    return true;
  } else if (Array.isArray(node)) {
    return true;
  } else if (typeof node === 'object') {
    switch (node.type) {
      // expressions
      case 'operation':
      case 'functionCall':
      case 'aggregate':
      // expression-like patterns
      case 'bgp':
      case 'group':
        return true;
    }
  }
  return false;
}

export function isQuads(node: any): node is SparqlJs.Quads {
  return (node.type === 'bgp' || node.type === 'graph') && 'triples' in node;
}

export function isTerm(
  node:
    SparqlJs.Expression |
    SparqlJs.PropertyPath |
    SparqlJs.VariableExpression |
    SparqlJs.Term
): node is SparqlJs.Term {
  return typeof node === 'string';
}

export function isVariable(term: any): term is SparqlJs.Term {
  return typeof term === 'string' && term.length > 0 && (term[0] === '?' || term[0] === '$');
}

export function isLiteral(term: any): term is SparqlJs.Term {
  return typeof term === 'string' && term.length > 0 && term[0] === '"';
}

export function isBlank(term: any): term is SparqlJs.Term {
  return typeof term === 'string' && term.length > 1 && term[0] === '_';
}

export function isIri(term: any): term is SparqlJs.Term {
  if (typeof term !== 'string' || term.length === 0) { return false; }
  const first = term[0];
  return first !== '?' && first !== '$' && first !== '"' && first !== '_';
}

export function isUpdateOperation(update: any) {
  return isInsertDeleteOperation(update) || isManagementOperation(update);
}

export function isInsertDeleteOperation(
  update: SparqlJs.UpdateOperation
): update is SparqlJs.InsertDeleteOperation {
  if (typeof update !== 'object') { return false; }
  const updateType = (update as SparqlJs.InsertDeleteOperation).updateType;
  return updateType && (
    updateType === 'insert' ||
    updateType === 'delete' ||
    updateType === 'deletewhere' ||
    updateType === 'insertdelete'
  );
}

export function isManagementOperation(
  update: SparqlJs.UpdateOperation
): update is SparqlJs.ManagementOperation {
  if (typeof update !== 'object') { return false; }
  const type = (update as SparqlJs.ManagementOperation).type;
  return type && (
    type === 'load' ||
    type === 'copy' ||
    type === 'move' ||
    type === 'add'
  );
}
