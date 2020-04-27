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

import * as moment from 'moment';
import * as _ from 'lodash';
import * as SparqlJs from 'sparqljs';

import { Rdf } from 'platform/api/rdf';
import { Resource } from '../Common';
export { Resource, Resources } from '../Common';

import { Category, Relation } from '../profiles/Model';
export { Category, Relation, Categories, Relations, RelationKey, AvailableDomains } from '../profiles/Model';

export interface Search {
  readonly domain: Category;
  readonly conjuncts: Conjuncts;
}

export type Conjunct = RelationConjunct | TextConjunct;
export type Conjuncts = Array<Conjunct>;

export type ConjunctIndex = Array<number>;
export type DisjunctIndex = Array<number>;

export const ConjunctKinds: {
  Relation: 'Relation';
  Text: 'Text';
} = {
  Relation: 'Relation',
  Text: 'Text',
};
export type ConjunctKind = typeof ConjunctKinds.Relation | typeof ConjunctKinds.Text;
export interface RelationConjunct<D = RelationDisjunct> {
  readonly kind: typeof ConjunctKinds.Relation;
  readonly relation: Relation;
  conjunctIndex: ConjunctIndex;
  uniqueId?: number;
  readonly range: Category;
  readonly disjuncts: Array<D>;
}

export interface TextConjunct {
  readonly kind: typeof ConjunctKinds.Text;
  conjunctIndex: ConjunctIndex;
  uniqueId?: number;
  readonly range: Category;
  readonly disjuncts: Array<TextDisjunct>;
}

export type Disjunct = RelationDisjunct | TextDisjunct;
export type Disjuncts = Array<Disjunct>;

export type RelationDisjunct =
  | EntityDisjunct
  | TemporalDisjunct
  | SpatialDisjunct
  | LiteralDisjunct
  | NumericRangeDisjunct;

export type EntityDisjunct = ResourceDisjunct | SetDisjunct | SavedSearchDisjunct | SearchDisjunct;

export type TemporalDisjunct =
  | DateDisjunct
  | DateRangeDisjunct
  | DateDeviationDisjunct
  | YearDisjunct
  | YearRangeDisjunct
  | YearDeviationDisjunct;

export type DateDisjunctValue = DateValue | DateRange | DateDeviation | YearValue | YearRange | YearDeviation;

export type SpatialDisjunct = SpatialDistanceDisjunct | SpatialBoundingBoxDisjunct;

export const EntityDisjunctKinds: {
  Resource: 'Resource';
  Set: 'Set';
  SavedSearch: 'SavedSearch';
  Search: 'Search';
} = {
  Resource: 'Resource',
  Set: 'Set',
  SavedSearch: 'SavedSearch',
  Search: 'Search',
};
export const TextDisjunctKind = 'Text';
export const TemporalDisjunctKinds: {
  Date: 'Date';
  DateRange: 'DateRange';
  DateDeviation: 'DateDeviation';
  Year: 'Year';
  YearRange: 'YearRange';
  YearDeviation: 'YearDeviation';
} = {
  Date: 'Date',
  DateRange: 'DateRange',
  DateDeviation: 'DateDeviation',
  Year: 'Year',
  YearRange: 'YearRange',
  YearDeviation: 'YearDeviation',
};

export const SpatialDisjunctKinds: {
  Distance: 'Distance';
  BoundingBox: 'BoundingBox';
} = {
  Distance: 'Distance',
  BoundingBox: 'BoundingBox',
};

export const LiteralDisjunctKind = 'Literal';
export const NumericRangeDisjunctKind = 'NumericRange';

export interface ResourceDisjunct extends AbstractDisjunct<Resource> {
  readonly kind: typeof EntityDisjunctKinds.Resource;
}
export interface SetDisjunct extends AbstractDisjunct<Resource> {
  readonly kind: typeof EntityDisjunctKinds.Set;
}

export interface SavedSearchValue {
  query: SparqlJs.SelectQuery;
  label: string;
}

export interface SavedSearchDisjunct extends AbstractDisjunct<SavedSearchValue> {
  readonly kind: typeof EntityDisjunctKinds.SavedSearch;
}
export interface SearchDisjunct extends AbstractDisjunct<Search> {
  readonly kind: typeof EntityDisjunctKinds.Search;
}
export interface TextDisjunct extends AbstractDisjunct<string> {
  readonly kind: typeof TextDisjunctKind;
}

export interface DateDisjunct extends AbstractDisjunct<DateValue> {
  readonly kind: typeof TemporalDisjunctKinds.Date;
}
export interface DateRangeDisjunct extends AbstractDisjunct<DateRange> {
  readonly kind: typeof TemporalDisjunctKinds.DateRange;
}
export interface DateDeviationDisjunct extends AbstractDisjunct<DateDeviation> {
  readonly kind: typeof TemporalDisjunctKinds.DateDeviation;
}
export interface YearDisjunct extends AbstractDisjunct<YearValue> {
  readonly kind: typeof TemporalDisjunctKinds.Year;
}
export interface YearRangeDisjunct extends AbstractDisjunct<YearRange> {
  readonly kind: typeof TemporalDisjunctKinds.YearRange;
}
export interface YearDeviationDisjunct extends AbstractDisjunct<YearDeviation> {
  readonly kind: typeof TemporalDisjunctKinds.YearDeviation;
}

export interface SpatialDistanceDisjunct extends AbstractDisjunct<SpatialDistance> {
  readonly kind: typeof SpatialDisjunctKinds.Distance;
}
export interface SpatialBoundingBoxDisjunct extends AbstractDisjunct<SpatialBoundingBox> {
  readonly kind: typeof SpatialDisjunctKinds.BoundingBox;
}

export interface LiteralDisjunct extends AbstractDisjunct<Literal> {
  readonly kind: typeof LiteralDisjunctKind;
}
export interface NumericRangeDisjunct extends AbstractDisjunct<NumericRange> {
  readonly kind: typeof NumericRangeDisjunctKind;
}

export type DateValue = moment.Moment;
export interface DateRange {
  readonly begin: DateValue;
  readonly end: DateValue;
}
export interface DateDeviation {
  readonly date: DateValue;
  readonly deviation: number;
}
export interface YearValue {
  readonly year: number;
  readonly epoch: string;
}
export interface YearRange {
  readonly begin: YearValue;
  readonly end: YearValue;
}
export interface YearDeviation {
  readonly year: YearValue;
  readonly deviation: number;
}

// coordinate is always expected in WGS-84 coordinate system
export interface Coordinate {
  lat: number;
  long: number;
}

export interface SpatialDistance {
  readonly center: Coordinate;
  readonly distance: any;
}

export interface SpatialBoundingBox {
  readonly southWest: Coordinate;
  readonly northEast: Coordinate;
}

export interface Literal {
  readonly literal: Rdf.Literal;
}
export interface NumericRange {
  readonly begin: number;
  readonly end: number;
}

interface AbstractDisjunct<T> {
  disjunctIndex: DisjunctIndex;
  readonly kind: DisjunctKind;
  readonly value: T;
}

export type DisjunctKind =
  | EntityDisjunctKind
  | TemporalDisjunctT
  | SpatialDisjunctKind
  | typeof TextDisjunctKind
  | typeof LiteralDisjunctKind
  | typeof NumericRangeDisjunctKind;
export type EntityDisjunctKind =
  | typeof EntityDisjunctKinds.Resource
  | typeof EntityDisjunctKinds.Set
  | typeof EntityDisjunctKinds.Search
  | typeof EntityDisjunctKinds.SavedSearch;
export type TemporalDisjunctT =
  | typeof TemporalDisjunctKinds.Date
  | typeof TemporalDisjunctKinds.DateRange
  | typeof TemporalDisjunctKinds.DateDeviation
  | typeof TemporalDisjunctKinds.Year
  | typeof TemporalDisjunctKinds.YearRange
  | typeof TemporalDisjunctKinds.YearDeviation;
export type SpatialDisjunctKind = typeof SpatialDisjunctKinds.Distance | typeof SpatialDisjunctKinds.BoundingBox;

// matchers
export interface ConjunctMatcher<T> {
  Relation: (conjunct: RelationConjunct) => T;
  Text: (conjunct: TextConjunct) => T;
}
export function matchConjunct<T>(matcher: ConjunctMatcher<T>) {
  return function (conjunct: Conjunct) {
    switch (conjunct.kind) {
      case ConjunctKinds.Relation:
        return matcher[ConjunctKinds.Relation](conjunct);
      case ConjunctKinds.Text:
        return matcher[ConjunctKinds.Text](conjunct);
    }
  };
}

export function isEntityDisjunct(disjunct: Disjunct): disjunct is EntityDisjunct {
  return _.includes(_.keys(EntityDisjunctKinds), disjunct.kind);
}

export function isTemporalDisjunct(disjunct: Disjunct): disjunct is TemporalDisjunct {
  return _.includes(_.keys(TemporalDisjunctKinds), disjunct.kind);
}

export function isSpatialDisjunct(disjunct: Disjunct): disjunct is SpatialDisjunct {
  return _.includes(_.keys(SpatialDisjunctKinds), disjunct.kind);
}

export function isLiteralDisjunct(disjunct: Disjunct): disjunct is LiteralDisjunct {
  return disjunct.kind === LiteralDisjunctKind;
}

export function isNumericRangeDisjunct(disjunct: Disjunct): disjunct is NumericRangeDisjunct {
  return disjunct.kind === NumericRangeDisjunctKind;
}

export function isTextDisjunct(disjunct: Disjunct): disjunct is TextDisjunct {
  return disjunct.kind === TextDisjunctKind;
}

export function isSetDisjunct(disjunct: Disjunct): disjunct is SetDisjunct {
  return disjunct.kind === EntityDisjunctKinds.Set;
}
export interface DisjunctMatcher<T>
  extends EntityDisjunctMatcher<T>,
    TemporalDisjunctMatcher<T>,
    SpatialDisjunctMatcher<T>,
    TextDisjunctMatcher<T>,
    LiteralDisjunctMatcher<T>,
    NumericRangeDisjunctMatcher<T> {}

export interface TextDisjunctMatcher<T> {
  Text: (disjunct: TextDisjunct) => T;
}
export interface LiteralDisjunctMatcher<T> {
  Literal: (disjunct: LiteralDisjunct) => T;
}
export interface NumericRangeDisjunctMatcher<T> {
  NumericRange: (disjunct: NumericRangeDisjunct) => T;
}

export function matchDisjunct<T>(matcher: DisjunctMatcher<T>) {
  return function (disjunct: Disjunct) {
    if (isTextDisjunct(disjunct)) {
      return matcher[TextDisjunctKind](disjunct);
    } else if (isEntityDisjunct(disjunct)) {
      return matchEntityDisjunct(matcher)(disjunct);
    } else if (isTemporalDisjunct(disjunct)) {
      return matchTemporalDisjunct(matcher)(disjunct);
    } else if (isSpatialDisjunct(disjunct)) {
      return matchSpatialDisjunct(matcher)(disjunct);
    } else if (isLiteralDisjunct(disjunct)) {
      return matcher[LiteralDisjunctKind](disjunct);
    } else if (isNumericRangeDisjunct(disjunct)) {
      return matcher[NumericRangeDisjunctKind](disjunct);
    }
  };
}

export interface EntityDisjunctMatcher<T> {
  Resource: (disjunct: ResourceDisjunct) => T;
  Set: (disjunct: SetDisjunct) => T;
  SavedSearch: (disjunct: SavedSearchDisjunct) => T;
  Search: (disjunct: SearchDisjunct) => T;
}
export function matchEntityDisjunct<T>(matcher: EntityDisjunctMatcher<T>) {
  return function (disjunct: EntityDisjunct) {
    switch (disjunct.kind) {
      case EntityDisjunctKinds.Resource:
        return matcher[EntityDisjunctKinds.Resource](disjunct);
      case EntityDisjunctKinds.Set:
        return matcher[EntityDisjunctKinds.Set](disjunct);
      case EntityDisjunctKinds.Search:
        return matcher[EntityDisjunctKinds.Search](disjunct);
      case EntityDisjunctKinds.SavedSearch:
        return matcher[EntityDisjunctKinds.SavedSearch](disjunct);
    }
  };
}

export interface TemporalDisjunctMatcher<T> {
  Date: (disjunct: DateDisjunct) => T;
  DateRange: (disjunct: DateRangeDisjunct) => T;
  DateDeviation: (disjunct: DateDeviationDisjunct) => T;
  Year: (disjunct: YearDisjunct) => T;
  YearRange: (disjunct: YearRangeDisjunct) => T;
  YearDeviation: (disjunct: YearDeviationDisjunct) => T;
}
export function matchTemporalDisjunct<T>(matcher: TemporalDisjunctMatcher<T>) {
  return function (disjunct: TemporalDisjunct) {
    switch (disjunct.kind) {
      case TemporalDisjunctKinds.Date:
        return matcher[TemporalDisjunctKinds.Date](disjunct);
      case TemporalDisjunctKinds.DateRange:
        return matcher[TemporalDisjunctKinds.DateRange](disjunct);
      case TemporalDisjunctKinds.DateDeviation:
        return matcher[TemporalDisjunctKinds.DateDeviation](disjunct);
      case TemporalDisjunctKinds.Year:
        return matcher[TemporalDisjunctKinds.Year](disjunct);
      case TemporalDisjunctKinds.YearRange:
        return matcher[TemporalDisjunctKinds.YearRange](disjunct);
      case TemporalDisjunctKinds.YearDeviation:
        return matcher[TemporalDisjunctKinds.YearDeviation](disjunct);
    }
  };
}

export interface SpatialDisjunctMatcher<T> {
  Distance: (disjunct: SpatialDistanceDisjunct) => T;
  BoundingBox: (disjunct: SpatialBoundingBoxDisjunct) => T;
}
export function matchSpatialDisjunct<T>(matcher: SpatialDisjunctMatcher<T>) {
  return function (disjunct: SpatialDisjunct) {
    switch (disjunct.kind) {
      case SpatialDisjunctKinds.Distance:
        return matcher[SpatialDisjunctKinds.Distance](disjunct);
      case SpatialDisjunctKinds.BoundingBox:
        return matcher[SpatialDisjunctKinds.BoundingBox](disjunct);
    }
  };
}

export interface GraphScopeSearch {
  translationId: string;
  keywords: string;
}

export interface GraphScopeResults {
  relations: Array<{ domain: string; range: string; relation: { iri: string; label: string } }>;
  columns: ReadonlyArray<GraphScopeColumn>;
  /** variableName looks like this: ?v0 (0...n) */
  cardinality: ReadonlyArray<{ [variableName: string]: number }>;
}

export type GraphScopeColumn = GraphScopeConceptColumn | GraphScopeValueColumn;
interface GraphScopeColumnBase {
  id: string;
  tgConcept: { iri: string; label: string; color: string };
}
export interface GraphScopeConceptColumn extends GraphScopeColumnBase {
  type: 'var-concept';
  attributes: ReadonlyArray<GraphScopeValueColumn>;
}
export interface GraphScopeValueColumn extends GraphScopeColumnBase {
  type: 'var-value';
  attribute: {
    /** Datatype IRIs in <>, e.g. <http://example.com/foo> */
    iri: string;
    label: string;
    matched: boolean;
  };
  datatype: string;
}
