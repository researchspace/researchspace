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
 *
 * @example
 * {
 *    $subject ?__relation__ ?date .
 *    ?date crm:P82a_begin_of_the_begin ?begin ;
 *      crm:P82b_end_of_the_end ?end .
 *    FILTER(?begin <= ?__dateEndValue__) .
 *    FILTER(?end >= ?__dateBeginValue__) .
 * }
 *
 * // result:
 * {
 *    $subject ?__relation__ ?date .
 *    ?date crm:P82a_begin_of_the_begin ?begin ;
 *      crm:P82b_end_of_the_end ?end .
 *    BIND(?begin as ?dateEndValue) .
 *    BIND(?end as ?dateBeginValue) .
 * }
 */
export function transformRangePattern(pattern: SparqlJs.Pattern[], range: ValueRange, rangeTo: ValueRange) {
  const clonedPattern = _.cloneDeep(pattern);

  // Replace range filter patterns with bind patterns
  // Find variables names in the ranges filters
  const visitor = new (class extends QueryVisitor {
    public begin: SparqlJs.Term;
    public end: SparqlJs.Term;

    private findSecondVariable(args: SparqlJs.Expression[], variable: string) {
      return _.find(args, (value) => value !== variable) as SparqlJs.Term;
    }

    private hasVariable(args: SparqlJs.Expression[], variable: string): boolean {
      return _.some(args, (value) => value === variable);
    }

    private getBindPattern(variable: SparqlJs.Term, expression: SparqlJs.Expression): SparqlJs.BindPattern {
      return { type: 'bind', variable, expression };
    }

    filter(pattern: SparqlJs.FilterPattern): SparqlJs.Pattern {
      const { type, operator, args } = pattern.expression as SparqlJs.OperationExpression;

      if (type !== 'operation') {
        return super.filter(pattern);
      }

      const rangeVariables = {
        begin: `?${range.begin}` as SparqlJs.Term,
        end: `?${range.end}` as SparqlJs.Term,
      };
      const rangeToVariables = {
        begin: `?${rangeTo.begin}` as SparqlJs.Term,
        end: `?${rangeTo.end}` as SparqlJs.Term,
      };

      if (operator === '>=' && this.hasVariable(args, rangeVariables.begin)) {
        this.end = this.findSecondVariable(args, rangeVariables.begin);
        return this.getBindPattern(rangeToVariables.end, this.end);
      }

      if (operator === '<=' && this.hasVariable(args, rangeVariables.end)) {
        this.begin = this.findSecondVariable(args, rangeVariables.end);
        return this.getBindPattern(rangeToVariables.begin, this.begin);
      }

      return super.filter(pattern);
    }
  })();

  clonedPattern.forEach((p) => visitor.pattern(p));

  if (!visitor.begin || !visitor.end) {
    console.warn(
      'The following query pattern',
      JSON.stringify(pattern),
      "can't be automatically used for selection of facet values,",
      'pattern is expected to have two FILTERs which restrict ranges.'
    );
  }

  return clonedPattern;
}
