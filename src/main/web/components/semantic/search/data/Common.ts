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

import { OrderedMap } from 'immutable';
import * as _ from 'lodash';
import * as SparqlJs from 'sparqljs';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient, QueryVisitor } from 'platform/api/sparql';

export interface Resource {
  readonly iri: Rdf.Iri;
  readonly label: string;
  readonly description?: string;
  readonly tuple: SparqlClient.Binding;
}
export type Resources = OrderedMap<Rdf.Iri, Resource>;

import { Record, List } from 'immutable';

export interface EntityI {
  iri: Rdf.Iri;
  label: string;
  tuple: SparqlClient.Binding;
}

export type Entity = Record.IRecord<EntityI>;
export type Entities = List<Entity>;
export const Entity = Record<EntityI>({
  iri: null,
  label: null,
  tuple: null,
});

export function bindingsToEntities(
  bindings: SparqlClient.Bindings,
  iriBindingName: string,
  labelBindingName: string
): List<Entity> {
  var entities = _.map(bindings, (binding) => bindingToEntity(binding, iriBindingName, labelBindingName));
  return List(entities);
}

export function bindingToEntity(
  binding: SparqlClient.Binding,
  iriBindingName: string,
  labelBindingName: string
): Entity {
  var iri = binding[iriBindingName];
  return Entity({
    tuple: binding,
    iri: <Rdf.Iri>iri,
    label: binding[labelBindingName].value,
  });
}

export type ValueRange = { begin: string; end: string };

/**
 * Replaces filters which restrict ranges with bind patterns.
 * This function identifies filters containing specific range comparisons (e.g., ?var <= ?value)
 * within a SPARQL query pattern, removes those filters, and adds equivalent BIND clauses.
 * It handles both simple filters and complex filters where these comparisons might be deeply nested.
 *
 * @example
 * // Input pattern with a complex filter:
 * {
 *   $subject crm:P108i_was_produced_by/crm:P9_consists_of* /crm:P4_has_time-span ?timeSpan .
 *   ?timeSpan crm:P82a_begin_of_the_begin ?begin .
 *   ?timeSpan crm:P82b_end_of_the_end ?end .
 *   FILTER ((!BOUND(?begin) || ?begin <= ?__dateEndValue__) && (!BOUND(?end) || ?end >= ?__dateBeginValue__))
 * }
 * // Given range = { begin: 'begin', end: 'end' }
 * // and rangeTo = { begin: 'dateBeginValue', end: 'dateEndValue' }
 *
 * // Resulting pattern:
 * {
 *   $subject crm:P108i_was_produced_by/crm:P9_consists_of* /crm:P4_has_time-span ?timeSpan .
 *   ?timeSpan crm:P82a_begin_of_the_begin ?begin .
 *   ?timeSpan crm:P82b_end_of_the_end ?end .
 *   BIND(?__dateEndValue__ AS ?dateBeginValue) .
 *   BIND(?__dateBeginValue__ AS ?dateEndValue) .
 * }
 */
export function transformRangePattern(pattern: SparqlJs.Pattern[], range: ValueRange, rangeTo: ValueRange) {
  class RangeFilterTransformVisitor extends QueryVisitor {
    public rangeBeginVar: SparqlJs.Term;
    public rangeEndVar: SparqlJs.Term;
    public bindAsBeginVar: SparqlJs.Term;
    public bindAsEndVar: SparqlJs.Term;

    public extractedValueForLTECondition: SparqlJs.Term = null; // Stores X from rangeEndVar <= X
    public extractedValueForGTECondition: SparqlJs.Term = null; // Stores Y from rangeBeginVar >= Y
    private _currentFilterContainsRelevantComparison: boolean = false;

    constructor(currentRange: ValueRange, currentRangeTo: ValueRange) {
      super();
      this.rangeBeginVar = `?${currentRange.begin}` as SparqlJs.Term;
      this.rangeEndVar = `?${currentRange.end}` as SparqlJs.Term;
      this.bindAsBeginVar = `?${currentRangeTo.begin}` as SparqlJs.Term;
      this.bindAsEndVar = `?${currentRangeTo.end}` as SparqlJs.Term;
    }

    // Add this overridden method:
    pattern(p: SparqlJs.Pattern): SparqlJs.Pattern | null {
      if (p.type === 'filter') {
        return this.filter(p as SparqlJs.FilterPattern);
      } else {
        // For non-filter patterns (bgp, optional, group, etc.),
        // we still need to traverse them in case they contain nested filters.
        // The super.pattern(p) call will ensure our overridden 'filter' and 'operation'
        // methods are invoked for any relevant parts within 'p'.
        // The base QueryVisitor methods for these patterns (like bgp, block)
        // often modify 'p' in-place and return undefined.
        // We must return 'p' itself to keep it in the pattern list.
        super.pattern(p); // Traverses p, potentially modifying it in-place
        return p; // Return the (potentially modified) pattern itself
      }
    }

    private hasVariable(args: SparqlJs.Expression[], variable: string): boolean {
      return _.some(args, (value) => value === variable);
    }

    private findSecondVariable(args: SparqlJs.Expression[], variable: string): SparqlJs.Term {
      return _.find(args, (value) => value !== variable) as SparqlJs.Term;
    }

    filter(filterPattern: SparqlJs.FilterPattern): SparqlJs.Pattern | null {
      this._currentFilterContainsRelevantComparison = false; // Reset for this top-level filter
      // Traverse the expression within the filter. Our overridden 'operation' method will be called.
      this.expression(filterPattern.expression);

      if (this._currentFilterContainsRelevantComparison) {
        return null; // Remove this filter pattern as it contained a relevant comparison
      }
      return filterPattern; // Keep other unrelated filters
    }

    operation(opExpr: SparqlJs.OperationExpression): SparqlJs.Expression {
      // Check for ?rangeEndVar <= X (e.g., ?end <= ?__dateEndValue__)
      if (opExpr.operator === '<=' && this.hasVariable(opExpr.args, this.rangeEndVar)) {
        if (!this.extractedValueForLTECondition) {
          this.extractedValueForLTECondition = this.findSecondVariable(opExpr.args, this.rangeEndVar);
        }
        this._currentFilterContainsRelevantComparison = true;
      }
      // Check for ?rangeBeginVar >= Y (e.g., ?begin >= ?__dateBeginValue__)
      else if (opExpr.operator === '>=' && this.hasVariable(opExpr.args, this.rangeBeginVar)) {
        if (!this.extractedValueForGTECondition) {
          this.extractedValueForGTECondition = this.findSecondVariable(opExpr.args, this.rangeBeginVar);
        }
        this._currentFilterContainsRelevantComparison = true;
      }

      // Continue traversal for nested operations
      return super.operation(opExpr);
    }
  }

  const visitor = new RangeFilterTransformVisitor(range, rangeTo);
  const clonedPattern = _.cloneDeep(pattern);

  // Apply the visitor to each top-level pattern.
  // visitor.pattern(p) will return null if p is a filter to be removed,
  // or p (with its internals potentially modified if p is a group-like pattern)
  const intermediatePatterns: (SparqlJs.Pattern | null)[] = [];
  for (const p of clonedPattern) {
    const result = visitor.pattern(p);
    intermediatePatterns.push(result);
  }

  // Recursively remove nulls from the pattern structure
  function removeNullsRecursively(patterns: (SparqlJs.Pattern | null)[]): SparqlJs.Pattern[] {
    if (!patterns) return [];
    const result: SparqlJs.Pattern[] = [];
    for (const p of patterns) {
      if (p === null) {
        continue;
      }
      // Check for group-like patterns that have a 'patterns' property
      // Add other block pattern types if necessary (e.g., union, minus, service)
      if (p.type === 'group' || p.type === 'optional' || p.type === 'graph' || 
          p.type === 'service' || p.type === 'union' || p.type === 'minus') {
        const blockPattern = p as SparqlJs.BlockPattern; // Common base for group, optional etc.
        if (blockPattern.patterns) {
          blockPattern.patterns = removeNullsRecursively(blockPattern.patterns);
        }
      }
      result.push(p);
    }
    return result;
  }

  const processedPatterns = removeNullsRecursively(intermediatePatterns);

  // Add BIND clauses based on what the visitor extracted
  // These are added at the top level of the processed patterns,
  // consistent with the example where BINDs appear after the group from which a filter was removed.
  if (visitor.extractedValueForLTECondition) {
    processedPatterns.push({
      type: 'bind',
      variable: visitor.bindAsBeginVar, // This is ?${rangeTo.begin} (e.g. ?dateBeginValue)
      expression: visitor.extractedValueForLTECondition,
    });
  }

  if (visitor.extractedValueForGTECondition) {
    processedPatterns.push({
      type: 'bind',
      variable: visitor.bindAsEndVar, // This is ?${rangeTo.end} (e.g. ?dateEndValue)
      expression: visitor.extractedValueForGTECondition,
    });
  }

  if (!visitor.extractedValueForLTECondition || !visitor.extractedValueForGTECondition) {
    console.warn(
      'The following query pattern',
      JSON.stringify(pattern),
      "can't be automatically used for selection of facet values,",
      'pattern is expected to have filter conditions restricting both begin and end of the range.'
    );
  }

  return processedPatterns;
}
