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

import * as _ from 'lodash';

import * as SearchModel from '../search/Model';

/**
 * Representation of Facet's state.
 */
export interface Ast {
  conjuncts: Conjuncts
}

export type Conjuncts = Array<FacetRelationConjunct>;
export type FacetRelationConjunct = SearchModel.RelationConjunct<FacetRelationDisjunct>;
export type FacetRelationDisjunct =
  SearchModel.ResourceDisjunct | SearchModel.DateRangeDisjunct |
  SearchModel.LiteralDisjunct | SearchModel.NumericRangeDisjunct;

export { DateRange, Literal, NumericRange } from '../search/Model';
export type FacetValue =
  SearchModel.Resource | SearchModel.DateRange | SearchModel.Literal | SearchModel.NumericRange;

/**
 * Only for Resource and Literal facet values
 */
export function partialValueEquals(x: FacetValue, y: FacetValue): boolean {
  if (_.has(x, 'literal') && _.has(y, 'literal')) {
    return (x as SearchModel.Literal).literal.equals((y as SearchModel.Literal).literal);
  } else if (_.has(x, 'iri') && _.has(y, 'iri')) {
    return (x as SearchModel.Resource).iri.equals((y as SearchModel.Resource).iri);
  } else {
    return false;
  }
}
