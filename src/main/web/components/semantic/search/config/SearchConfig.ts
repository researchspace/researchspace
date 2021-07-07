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

import * as Maybe from 'data.maybe';

import { LightwightTreePatterns, ComplexTreePatterns } from 'platform/components/semantic/lazy-tree';
import { Rdf } from 'platform/api/rdf';
import * as _ from 'lodash';

export const RELATION_PROFILE_VARIABLES = {
  CATEGORY_PROJECTION_VAR: 'category',
  RELATION_PROJECTION_VAR: 'relation',
  LABEL_PROJECTION_VAR: 'label',
  THUMBNAIL_PROJECTION_VAR: 'thumbnail',
  DESCRIPTION_PROJECTION_VAR: 'description',
  PROFILE_PROJECTION_VAR: 'profile',
  RELATION_RANGE_PROJECTION_VAR: 'hasRange',
  RELATION_DOMAIN_PROJECTION_VAR: 'hasDomain',
};

export const SEMANTIC_SEARCH_VARIABLES = {
  PROJECTION_ALIAS_VAR: 'subject',
  DOMAIN_VAR: '__domain__',
  RANGE_VAR: '__range__',
  RESOURCE_VAR: '__value__',
  SET_VAR: '__set__',
  RELATION_VAR: '__relation__',
  RELATION_PATTERN_VAR: '__relationPattern__',
  DATE_BEGING_VAR: '__dateBeginValue__',
  DATE_END_VAR: '__dateEndValue__',
  GEO_CENTER_VAR: '__geoCenter__',
  GEO_CENTER_LAT_VAR: '__geoCenterLat__',
  GEO_CENTER_LONG_VAR: '__geoCenterLong__',
  GEO_DISTANCE_VAR: '__geoDistance__',
  GEO_SOUTH_WEST: '__geoSouthWest__',
  GEO_SOUTH_WEST_LAT: '__geoSouthWestLat__',
  GEO_SOUTH_WEST_LONG: '__geoSouthWestLong__',
  GEO_NORTH_EAST: '__geoNorthEast__',
  GEO_NORTH_EAST_LAT: '__geoNorthEastLat__',
  GEO_NORTH_EAST_LONG: '__geoNorthEastLong__',
  LITERAL_VAR: '__literal__',
  NUMERIC_RANGE_BEGIN_VAR: '__numericRangeBeginValue__',
  NUMERIC_RANGE_END_VAR: '__numericRangeEndValue__',
  SELECTED_DATASET: '__dataset__',
  SELECTED_ALIGNMENT: '__alignment__',
};

export const RESOURCE_SEGGESTIONS_VARIABLES = {
  SUGGESTION_IRI: 'suggestion',
  SUGGESTION_LABEL: 'label',
  SEARCH_TERM_VAR: '__token__',
};

export const RESULT_VARIABLES = {
  CONTEXT_RELATION_VAR: '__contextRelation__',
  CONTEXT_RELATION_PATTERN_VAR: '__contextRelationPattern__',
};

export type SearchProfileConfig = QuerySearchProfileConfig | InlineSearchProfileConfig;

export interface QuerySearchProfileConfig {
  /**
   * SPARQL Select query returning the list of categories available for search,
   * grouped by corresponding search profile.
   *
   * Expected projection variables:
   *   category - IRI of the category
   *   profile - search profile IRI that a given category belongs to
   *   thumbnail - URL of the category thumbnail
   *   label - category label
   *   description - detailed description of the category
   */
  categoriesQuery: string;

  /**
   * SPARQL Select query returning the list of relations available for search,
   * grouped by corresponding search profile.
   *
   * Expected projection variables:
   *   relation- relation IRI
   *   label - relation label
   *   description - detailed description of the relation
   *   domain - relation domain IRI
   *   range - relation range IRI
   */
  relationsQuery: string;

  /**
   * IRI of the default profile
   */
  defaultProfile?: string;
}

/**
 * Base supertype for inline category/relation descriptors
 */
export interface InlineResource {
  /**
   * IRI of the category/relation.
   * Must be expressed as a full IRI enclosed in '<>'
   */
  iri: string;

  /**
   * Label of the category/relation shown in the UI
   */
  label: string;
}

/**
 * Inline configuration for a category
 */
export interface InlineCategory extends InlineResource {
  /**
   * URL reference of the icon image to depict the category in the query builder UI
   */
  thumbnail?: string;
  color?: string;
}

/**
 * Inline configuration for a relation
 */
export interface InlineRelation extends InlineResource {
  /**
   * IRI of the category whose instances appear as subjects of this relation.
   * Must be expressed as a full IRI enclosed in '<>'
   */
  hasDomain: string;

  /**
   * IRI of the category whose instances appear as objects of this relation.
   * Must be expressed as a full IRI enclosed in '<>'
   */
  hasRange: string;
}

export interface InlineSearchProfileConfig {
  categories: Array<InlineCategory>;
  relations: Array<InlineRelation>;
}

export type TreeSelectorConfig = ComplexTreePatterns | LightwightTreePatterns;
export interface TreeSelectorPatterns {
  [key: string]: TreeSelectorConfig;
}

export interface ResourceSelectorPatterns {
  [key: string]: ResourceSelectorConfig;
}

export interface SemanticQueryBuilderConfig {
  /**
   * Id is used when triggering events.
   */
  id: string;
  /**
   * Default configuration for autosuggestion that is used to select values for relations of 'resource' kind.
   */
  resourceSelector: ResourceSelectorConfig;

  /**
   * Override configuration for resource selector based on the range of the selected relation.
   */
  resourceSelectorCategories?: ResourceSelectorPatterns;

  /**
   * Override configuration for resource selector based on the selected relation.
   */
  resourceSelectorRelations?: ResourceSelectorPatterns;

  /**
   * Default configuration for tree-based autosuggestion, that is used to select values for any relations of 'hierarchy' kind.
   */
  treeSelector?: TreeSelectorConfig;

  /**
   * Override configuration for tree selector based on the range of the selected relation.
   */
  treeSelectorCategories?: TreeSelectorPatterns;

  /**
   * Override configuration for tree selector based on the selected relation.
   */
  treeSelectorRelations?: TreeSelectorPatterns;

  /**
   * Configuration for place autosuggestion that is used for relations of 'place' kind.
   */
  geoSelector?: ResourceSelectorConfig;

  /**
   * Handlebars template for category selection item. Can be customized to provide additional help information in the search interface, e.g tooltip with description of the category etc.
   *
   * By default shows category thumbnail along with label.
   *
   * For SPARQL Select binding variables available in the template,
   * @see SearchProfileConfig#categoriesQuery.
   */
  categoryViewTemplate?: string;

  /**
   * Handlebars template for relation selection item. Can be customized to provide additional help
   * information in the search interface, e.g tooltip with description of relation etc.
   *
   * By default shows relation label only.

   * For SPARQL Select binding variables available in the template,
   * @see SearchProfileConfig#relationsQuery.
   */
  relationViewTemplate?: string;

  /**
   * By default `subject` variable is used as projection variable for the generated query, however it is possible to override the default.
   * Independently from the projection variable in the base query, it is always possible to use `?subject` variable in the result visualizaiton query to refer to the result. If the projection variable in the base-query is not named `subject`, an additional bind clause will be injected to bind it to `?subject`.
   *
   * @default subject
   */
  projectionVariable?: string;
}

export interface ResourceSelectorConfig {
  /**
   * SPARQL Select query that is used for autosuggestion.
   *
   * Mandatory projection variables:
   *   suggestion - should contain suggestion item IRI
   *   label - should contain suggestion item label
   *
   * Variables that will be substituted with user selected value:
   *   __token__ - user input represented as string literal
   *   __domain__ - search domain category IRI
   *   __range__ - conjunct range category IRI
   *   __relation__ - conjunct relation IRI
   */
  query: string;

  /**
   * A flag determining whether any special Lucene syntax will be escaped.
   * When `false` lucene syntax in the user input is not escaped.
   *
   * @default true
   */
  escapeLuceneSyntax?: boolean;

  /**
   * A flag determining whether the user input is tokenized by whitespace into words postfixed by `*`.
   * E.g. the search for `Hello World` becomes `Hello* World*`.
   *
   * @default true
   */
  tokenizeLuceneQuery?: boolean;

  /**
   * SPARQL Select query that is used for default autosuggestions.
   *
   * Mandatory projection variables:
   *   suggestion - should contain suggestion item IRI
   *   label - should contain suggestion item label
   *
   * Variables that will be substituted with user selected value:
   *   __token__ - user input represented as string literal
   *   __domain__ - search domain category IRI
   *   __range__ - conjunct range category IRI
   *   __relation__ - conjunct relation IRI
   */
  defaultQuery?: string;

  /**
   * Handlebars template that is used when there are no results that match user input.
   */
  noSuggestionsTemplate: string;

  /**
   * Handlebars template that is used to render suggestion items.
   * Template has access to all SPARQL projection variables from the query.
   */
  suggestionTupleTemplate: string;
}

export interface SearchDatasetConfig {
  /**
   * Service IRI of the dataset's SPARQL endpoint.
   * If not present, denotes the default repository (having the ID "default" in the RepositoryManager).
   */
  iri?: string;

  /**
   * Textual label denoting the repository.
   */
  label: string;

  /**
   * True if dataset should be selected by default.
   */
  isDefault?: boolean;

  /**
   * If true, then error from the repository in fedarate query will be ignored (using SILENT from SPARQL 1.1 standard).
   */
  silent?: boolean;

  /**
   * Optional list of alignments with other datasets.
   */
  alignments?: Array<DatasetAlignmentConfig>;
}

export interface DatasetAlignmentConfig {
  /**
   * Alignment IRI, typically some skos:scheme.
   */
  iri: string;

  /**
   * Alignment label.
   */
  label: string;

  /**
   * True if alignment should be selected by default.
   */
  isDefault?: boolean;
}

export interface DatasetsConfig {
  /**
   * If true, denotes a federated scenario, in which the search query must be sent
   * to multiple repositories (described in the datasets property).
   */
  federated?: boolean;

  /**
   * The list of datasets which should be queried.
   * If not provided, only the search will only affect the default repository.
   */
  datasets?: Array<SearchDatasetConfig>;

  /**
   * Query pattern that is used to discriminate items between datasets in non-federated mode.
   * This pattern will be applied to tree selector queries, resource selector queries,
   * facet queries and final result query. At the runtime `__dataset__`
   * will be bound to dataset selected by the user.
   *
   * @default `
   *   GRAPH ?__dataset__ {
   *      ?subject a ?t .
   *    }
   *
   *  `
   */
  datasetPattern?: string;
}

export interface SemanticSearchConfig {
  /**
   * Unique HTML id that is used by all nested search-related components, used when one need to have multiple search interfaces on the same page.
   */
  id?: string;

  /**
   * Definition of the categories to be used in structured search. Specified kind will be use
   * for all relations that have given category as a range.
   *
   * If not specified otherwise, by default, all categories/relations from Search Profile
   * are considered of kind 'resource'.
   */
  categories?: Patterns;

  /**
   * Definition of the relations to be used in structured search.
   *
   * If not specified otherwise, by default, all categories/relations from Search Profile
   * are considered of kind 'resource'.
   */
  relations?: Patterns;

  /**
   * Search Profile defines list of categories and relations available in the search.
   */
  searchProfile: SearchProfileConfig;

  /**
   * Multi-datasets search configuration.
   * If not provided, only the search will only affect the default repository.
   */
  datasetsConfig?: DatasetsConfig;

  /**
   * Maximal number of answers to be returned
   *
   * @default 1000
   */
  limit?: number;

  /**
   * Specifies if any optimizer 'magic' patterns are included
   * for the specific repository type.
   */
  optimizer?: 'blazegraph' | 'none';

  /**
   * Specifies a mode for category and relation selectors to operate in:
   *   `stack` - vertical stack of buttons.
   *   `dropdown` - dropdown field.
   */
  selectorMode?: 'stack' | 'dropdown';

  /**
   * Compressed JSON representation of the search state. Can be used to load saved search.
   */
  initialState?: string;
}

/**
 * Mapping of categories/relations IRIs (fully qualified IRI enclosed in <>) to corresponding UI input components and generated query patterns.
 * Every IRI can have multiple kinds, e.g it makes sense to have a category that, at the same time,
 * represents `hierarchy` and `place`.
 *
 * Currently supported kinds of categories/relations:
 *
 * 1) `resource` - any RDF Resource, selection of value is performed with autosuggestion dropdown.
 * 2) `hierarchy` - RDF Resource that belongs to some hierarchy (e.g. with `skos:broader`),
 *                  selection of value is performed with hierarchical tree-selector with.
 * 3) `date-range` - date range values, in the simple case begin and end of the range.
 *                   can be represented with the same value.
 *                   Selection of value is performed with speciall date-range selection components.
 * 4) `place` - geo-spatial value. Selection of value is performed with visual region selector.
 * 5) `text` - speciall kind that is used as a marker for full-text search.
 * 6) `set` - special kind that is used as a marker for the ability to use set of items as input, can be used only in combination with `resource` or `hierarchy` kind.
 * 7) `literal`
 * 8) `numeric-range`
 *
 * Special variable, common to all patterns, that are substituted with user selected values:
 *   * `__domain__` - search domain category IRI
 *   * `__range__` - conjunct range category IRI
 *   * `__relation__` - conjunct relation IRI
 *   * `__relationPattern__` - conjunct relation query pattern
 *
 * In all query patterns ?subject variable refers to result projection variable,
 * and should be always present in the query pattern. All other free variables except ?subject,
 * variable are randomized to prevent name collisions.
 * So for example resource pattern like:
 *
 * ```sparql
 * ?subject ?__relation__ ?holder .
 * ?holder ?p ?__value__ .
 * ```
 *
 * Will be rewritten and all special variables will be replaced by user selected values:
 *
 * ```
 * ?subject <http://example/com/relation> ?holder_tgyzctyko3oozv2jzto6r .
 * ?holder_tgyzctyko3oozv2jzto6r <http://example.cm/some_resource> .
 * ```
 */
export interface Patterns {
  [key: string]: Array<PatternConfig>;
}

export type PatternConfig = Resource | Hierarchy | DateRange | Place | Text | Set | Literal | NumericRange;

export interface Resource {
  kind: 'resource';

  /**
   * Injected variables:
   *  * `__value__` - user selected value IRI
   *
   * @default `$subject ?__relation__ ?__value__ .`
   */
  queryPattern: string;
}

export interface DateRange {
  kind: 'date-range';

  /**
   * Injected variables:
   *   * `__dateBeginValue__` - xsd:date literal
   *   * `__dateEndValue__` - xsd:date literal
   *
   * Keep in mind that there is no default query pattern for `date-range` kind,
   * because date representation is always domain specific.
   */
  queryPattern: string;

  /**
   * Datatype for injected variables.
   *
   * @default xsd:date
   */
  datatype?: string;

  /**
   * moment.js format pattern for injected values.
   *
   * @default YYYY-MM-DD
   */
  format?: string;
}

export interface Hierarchy {
  kind: 'hierarchy';

  /**
   * Injected variables:
   *  * `__value__` - user selected value IRI
   *
   * @default `$subject ?__relation__ ?__value__ .`
   */
  queryPattern: string;
}

export interface Text {
  kind: 'text';

  /**
   * Injected variables:
   *   * `__value__` - string literal with user input. User input is split into words and interleaved with `*`. E.g for the user input "Hello World", injected literal will be "Hello* World*"
   *
   * @default `$subject ?__relation__ ?__value__ .`
   */
  queryPattern: string;

  /**
   * IRI of the help page to explain any special syntax used in the text search.
   * Must be a fully qualified IRI enclosed in <>.
   * Default: <http://help.researchspace.org/resource/SolrFullTextSearchSyntax> (shown if escapeLuceneSyntax is false)
   *
   */
  helpPage?: string;

  /**
   * A flag determining whether any special Lucene syntax will be escaped.
   * When `false` lucene syntax in the user input is not escaped.
   *
   * @default true
   */
  escapeLuceneSyntax?: boolean;

  /**
   * A flag determining whether the user input is tokenized by whitespace into words postfixed by `*`.
   * E.g. the search for `Hello World` becomes `Hello* World*`.
   *
   * @default true
   */
  tokenizeLuceneQuery?: boolean;
}

export interface Place {
  kind: 'place';

  /**
   * Injected variables:
   *   * `__geoCenter__` - coordinates of the circle center, default is xsd:string literal in the `lat#long` format
   *   * `__geoCenterLat__` - xsd:string literal with the latitude of the circle center
   *   * `__geoCenterLong__` - xsd:string literal with the longitude of the circle center
   *   * `__geoDistance__` - xsd:string literal with radius of the circle in km
   */
  distanceQueryPattern: string;

  /**
   * Injected variables:
   *   `__geoSouthWest__` - coordinates of the south-west bounding-box corner, default is xsd:string literal in the `lat#long` format
   *   `__geoSouthWestLat__` - xsd:string literal with the latitude of the south-west bounding-box corner
   *   `__geoSouthWestLong__` - xsd:string literal with the longitude of the south-west bounding-box corner
   *   `__geoNorthEast__` - coordinates of the north-east bounding-box corner, default is xsd:string literal in the `lat#long` format
   *   `__geoNorthEastLat__` - xsd:string literal with the latitude of the north-east bounding-box corner
   *   `__geoNorthEastLong__` - xsd:string literal with the longitude of the north-east bounding-box corner
   */
  boundingBoxQueryPattern: string;

  /**
   * format pattern for injected coordinates
   *
   * @default `lat#long`
   */
  format?: string;

  /**
   * datatype for injected coordinates
   *
   * @default http://www.w3.org/2001/XMLSchema#string
   */
  datatype?: string;
}

export interface Set {
  kind: 'set';

  /**
   * `set` pattern will be combined with corresponding `hierarchy` or `resource` pattern.
   *
   * Additional special variables, that will be substituted with values:
   *   `__set__` - set IRI
   *
   * @default `?__set__ ldp:contains/platform:setItem ?__value__ .`
   */
  queryPattern: string;
}

export interface Literal {
  kind: 'literal';

  /**
   * Injected variables:
   *  * `__literal__` - user selected value literal
   *
   * @default `$subject ?__relation__ ?__literal__ .`
   */
  queryPattern: string;
}

export interface NumericRange {
  kind: 'numeric-range';

  /**
   * Injected variables:
   *   * `__numericRangeBeginValue__` - xsd:double literal
   *   * `__numericRangeEndValue__` - xsd:double literal
   *
   * Currently there is no default query pattern for `numeric-range` kind
   */
  queryPattern: string;

  /**
   * datatype for injected variables, default is http://www.w3.org/2001/XMLSchema#double
   */
  datatype?: string;
}

export interface SemanticFacetConfig {
  /**
   * Unique HTML id that is used by all nested search-related components, used when one need to have multiple search interfaces on the same page.
   */
  id?: string;

  /**
   * Flag to open the facet by default.
   *
   * @default false
   */
  openByDefault?: boolean;

  /**
   * Flag to select first category in the categories filter by default.
   *
   * Can be used in situations with many categories to reduce facets loading time.
   *
   * @default false
   */
  selectFirstCategory?: boolean;

  /**
   * Settings determining the display of categories in the sidebar.
   */
  categories?: FacetCategoryConfig;

  /**
   * Settings determining the display of relations in the sidebar.
   */
  relations?: FacetRelationConfig;

  /**
   * Specialization of the categories to be used in the facet.
   *
   * If not specified otherwise, by default, all categories are treated as `resource` kind.
   */
  valueCategories?: FacetValuePatterns;

  /**
   * Specialization of the relations to be used in the facet.
   *
   * If not specified otherwise, by default, all relations inherit configuration from categories.
   */
  valueRelations?: FacetValuePatterns;

  /**
   * Query that is used to get values for relations, if no custom value query is specified
   * in 'valueCategories' or 'valueRelations' mappings.
   */
  defaultValueQueries?: {
    /**
     * By default it uses 'preferredLabels' properties from the system ui configuration.
     * E.g if `preferredLabels=rdfs:label,skos:prefLabel` default query will be -
     * @default
     * ```
     *   SELECT ?value ?label (COUNT(DISTINCT $subject) AS ?count) WHERE {
     *     FILTER(?__facetRelationPattern__)
     *     ?value rdfs:label|skos:prefLabel ?label .
     *   }
     *   GROUP BY ?value ?label
     *   ORDER BY ?label
     * ```
     * Where `FILTER(?__facetRelationPattern__)` will be replaced by a relation pattern if exists
     * or the default pattern:
     * ```
     *   $subject ?__relation__ ?value
     * ```
     */
    resource?: string;
    /**
     * @default
     * ```
     *   SELECT ?literal (COUNT(DISTINCT $subject) AS ?count) WHERE {
     *     FILTER(?__facetRelationPattern__)
     *   }
     *   GROUP BY ?literal
     *   ORDER BY ?literal
     * ```
     * where `FILTER(?__facetRelationPattern__)` will be replaced by a relation pattern if exists
     * or the default pattern:
     * ```
     *   $subject ?__relation__ ?literal
     * ```
     */
    literal?: string;
  };

  /**
   * Default Handlebars template for facet value visualization. Can be overridden for
   * individual categories/relations in 'valueCategories'/'valueRelations' mappings.
   *
   * @default
   * ```
   * <mp-highlight highlight="{{highlight}}">{{label.value}}</mp-highlight> ({{count.value}})
   * ```
   */
  defaultValueTemplate?: { resource: string; literal: string };

  /**
   * Maximal number of the facet values to show.
   *
   * @default 10000
   */
  facetValuesThreshold?: number;

  /**
   * If true facet will automatically switch open relations based on the context relation used
   * in the visualization .
   *
   * @default false
   */
  listenToContextSwitch?: boolean;
}

/**
 * Mapping of categories/relations IRIs (fully qualified IRI enclosed in <>) to corresponding UI input components and generated query pattern.
 *
 * Currently supported kinds of categories/relations:
 * 1) `resource` - any RDF resource, selection of value is performed with checkbox.
 * 2) `date-range` - date range values, selection of value is performed with slider.
 */
export interface FacetValuePatterns {
  [iri: string]: FacetValuePattern;
}
export type FacetValuePattern = ResourceFacetValue | DateRangeFacetValue | LiteralFacetValue | NumericRangeFacetValue;

export const FACET_VARIABLES = {
  RELATION_VAR: '__relation__',
  RELATION_PATTERN_VAR: '__facetRelationPattern__',
  RANGE_VAR: '__range__',
  DOMAIN_VAR: '__domain__',
  VALUE_RESOURCE_VAR: 'value',
  VALUE_RESOURCE_LABEL_VAR: 'label',
  VALUE_DATE_RANGE_BEGIN_VAR: 'dateBeginValue',
  VALUE_DATE_RANGE_END_VAR: 'dateEndValue',
  VALUE_LITERAL: 'literal',
  VALUE_NUMERIC_RANGE_BEGIN_VAR: 'numericRangeBeginValue',
  VALUE_NUMERIC_RANGE_END_VAR: 'numericRangeEndValue',
};
export interface ResourceFacetValue {
  kind: 'resource';
  /**
   * @default see FacetConfig.defaultValueQueries.resource
   */
  valuesQuery?: string;
  tupleTemplate?: string;
}
export interface DateRangeFacetValue {
  kind: 'date-range';

  /**
   * Base search query will be injected as a sub-query with $subject as projection variable.
   *
   * Expected projection variables:
   *   * `?dateBeginValue` - begin of the date range interval
   *   * `?dateEndValue` - end of the date range interval
   *
   * Injected variables:
   *   * `__domain__` - search domain IRI
   *   * `__range__` - facet relation range IRI
   *   * `__relation__` - facet relation IRI
   *
   */
  valuesQuery: string;
}

export interface LiteralFacetValue {
  kind: 'literal';
  /**
   * @default see FacetConfig.defaultValueQueries.literal
   */
  valuesQuery: string;
  tupleTemplate?: string;
}
export interface NumericRangeFacetValue {
  kind: 'numeric-range';
  valuesQuery: string;
}

export interface FacetCategoryConfig {
  /**
   * HTML template defining how each category link will be displayed in the sidebar.
   */
  tupleTemplate: string;
}

export interface FacetRelationConfig {
  /**
   * HTML template defining how each category link will be displayed in the sidebar.
   */
  tupleTemplate: string;
}

/**
 * Extracts the pattern config for the given category IRI.
 * Returned value depends on the type of the category (e.g., Resource, Hierarchy, Text, DateRange).
 * If the given IRI does not represent a valid category from the search configuration profile,
 * returns undefined.
 */
export function getConfigPatternForCategory(
  config: SemanticSearchConfig,
  category: Rdf.Iri
): PatternConfig | undefined {
  const patternConfigs = config.categories[category.toString()];
  if (patternConfigs && patternConfigs.length > 0) {
    return patternConfigs[0];
  } else {
    return undefined;
  }
}

export function isQuerySearchProfileConfig(config: SearchProfileConfig): config is QuerySearchProfileConfig {
  return _.has(config, 'relationsQuery');
}
