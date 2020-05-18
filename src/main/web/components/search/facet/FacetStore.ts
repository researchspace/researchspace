/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 * @author Alexey Morozov
 * @author Denis Ostapenko
 */

import * as maybe from 'data.maybe';
import * as _ from 'lodash';
import * as Kefir from 'kefir';
import { OrderedMap, List } from 'immutable';
import * as moment from 'moment';
import * as SparqlJs from 'sparqljs';

import { Rdf } from 'platform/api/rdf';
import {
  SparqlUtil,
  SparqlClient,
  PatternBinder,
  VariableRenameBinder,
  QueryVisitor,
  cloneQuery,
} from 'platform/api/sparql';
import { Action } from 'platform/components/utils';
import { SemanticContext } from 'platform/api/components';

import {
  SemanticFacetConfig,
  SemanticSearchConfig,
  SEMANTIC_SEARCH_VARIABLES,
  FACET_VARIABLES,
  FacetValuePattern,
  DateRangeFacetValue,
  LiteralFacetValue,
  NumericRangeFacetValue,
  ResourceFacetValue,
} from 'platform/components/semantic/search/config/SearchConfig';
import * as SearchConfig from 'platform/components/semantic/search/config/SearchConfig';
import * as SearchDefaults from 'platform/components/semantic/search/config/Defaults';
import { Resource, transformRangePattern } from 'platform/components/semantic/search/data/Common';
import {
  Category,
  Relation,
  Categories,
  Relations,
  RelationKey,
  AvailableDomains,
} from 'platform/components/semantic/search/data//profiles/Model';
import * as F from 'platform/components/semantic/search/data/facet/Model';
import * as SearchModel from 'platform/components/semantic/search/data/search/Model';
import SearchProfileStore from 'platform/components/semantic/search/data/profiles/SearchProfileStore';
import {
  conjunctsToQueryPatterns,
  tryGetRelationPatterns,
  rewriteProjectionVariable,
  generateQueryForMultipleDatasets,
} from 'platform/components/semantic/search/data/search/SparqlQueryGenerator';
import { FacetContext } from 'platform/components/semantic/search/web-components/SemanticSearchApi';
import * as LabelsService from 'platform/api/services/resource-label';
import { BuiltInEvents, trigger } from 'platform/api/events';

export interface FacetStoreConfig {
  domain: Category;
  availableDomains: AvailableDomains;
  baseQuery: SparqlJs.SelectQuery;
  initialAst: F.Ast;
  config: SemanticFacetConfig;
  baseConfig: SemanticSearchConfig;
  searchProfileStore: SearchProfileStore;
}

export interface FacetData {
  categories: Categories;
  relations: Relations;
  viewState: FacetViewState;
  ast: F.Ast;
}

export type SelectedValues = OrderedMap<Relation, List<F.FacetValue>>;
export interface FacetViewState {
  category: Data.Maybe<Category>;
  categoryTemplate: string;
  relation: Data.Maybe<Relation>;
  relationTemplate: string;
  values: { values: Array<F.FacetValue>; loading: boolean; error?: boolean };
  selectedValues: SelectedValues;
  valuesTemplate: { resource: string; literal: string };
  relationType: 'resource' | 'date-range' | 'literal' | 'numeric-range';
  selectorMode: 'stack' | 'dropdown';
}

/**
 * This class contains all logic for facet components.
 * The idea is to keep React components logic free and in spirit of React Flux.
 *
 * @see https://facebook.github.io/flux/docs/overview.html
 */
export class FacetStore {
  private context: SemanticContext & FacetContext;
  private config: FacetStoreConfig;

  /**
   * Property which contains current state of the facet at any given point in time.
   */
  private ast = Action<F.Ast>();
  private baseQuery = Action<SparqlJs.SelectQuery>();
  private relations = Action<Relations>();
  private values = Action<{ values: Array<F.FacetValue>; loading: boolean; error: boolean }>({
    values: [],
    loading: false,
    error: false,
  });

  /**
   * Property which contains all data required for facet rendering.
   * This property is updated on:
   *   - facet selections change
   *   - base query update
   */
  private facetData = Action<FacetData>();
  private facetedQuery = Action<SparqlJs.SelectQuery>();
  private facetView = Action<FacetViewState>();

  private toggleCategoryAction: Action<Data.Maybe<Category>>;
  private toggleRelationAction: Action<Data.Maybe<Relation>>;
  private selectValueAction = Action<{ relation: Relation; value: F.FacetValue }>();
  private deselectValueAction = Action<{ relation: Relation; value: F.FacetValue }>();
  private selectedValues: Action<SelectedValues>;
  private removeConjunctAction = Action<SearchModel.RelationConjunct>();

  private actions: F.Actions;
  private relationsCache: { [key: string]: boolean } = {};
  private valuesCache: { [relation: string]: Array<F.FacetValue> } = {};

  constructor(config: FacetStoreConfig, context: SemanticContext & FacetContext) {
    this.context = context;
    this.config = config;
    const initialAst = config.initialAst || { conjuncts: [] };
    this.ast(initialAst);
    this.selectedValues = Action<SelectedValues>(this.initialValues(initialAst));

    this.baseQuery(_.clone(this.config.baseQuery));
    const currentBaseQuery = this.baseQuery.$property.skipDuplicates(_.isEqual);

    this.actions = {
      selectCategory: this.selectCategory,
      deselectCategory: this.deselectCategory,
      selectRelation: this.selectRelation,
      deselectRelation: this.deselectRelation,
      selectFacetValue: this.selectFacetValue,
      deselectFacetValue: this.deselectFacetValue,
      setBaseQuery: this.setBaseQuery,
      removeConjunct: this.removeConjunct,
    };

    const categories = this.config.searchProfileStore
      .rangesFor(this.config.domain)
      .map(this.buildFacetCategoryBinding) as Categories;

    const selectedCategory = config.config.selectFirstCategory
      ? maybe.Just(categories.first())
      : maybe.Nothing<Category>();
    this.toggleCategoryAction = Action(selectedCategory);
    this.toggleRelationAction = Action<Data.Maybe<Relation>>(maybe.Nothing<Relation>());

    // debounce(200) to not update facetData too frequently to prevent UI flickering
    Kefir.combine({
      relations: this.relations.$property,
      viewState: this.facetView.$property,
      ast: this.ast.$property,
      categories: Kefir.constant(categories),
    })
      .debounce(200)
      .onValue(this.facetData);

    // update list of selected facet values on the selection of new facet value
    Kefir.combine({ value: this.selectValueAction.$property }, { selected: this.selectedValues.$property }).onValue(
      ({ value, selected }) => {
        const relationType = this.getDisjunctType(value.relation);
        let selectedRelations = selected;
        // we need to remove old selected value if it is date-range or numeric-range
        // because there can be only one range selected for a given relation
        if (
          relationType === SearchModel.TemporalDisjunctKinds.DateRange ||
          relationType === SearchModel.NumericRangeDisjunctKind
        ) {
          selectedRelations = selected.delete(value.relation);
        }
        let selectedValues = selectedRelations.get(value.relation) || List<F.FacetValue>();
        selectedValues = selectedValues.push(value.value);
        this.selectedValues(selectedRelations.set(value.relation, selectedValues));
      }
    );

    // update list of selected facet values on the de-selection of some facet value
    Kefir.combine({ value: this.deselectValueAction.$property }, { selected: this.selectedValues.$property }).onValue(
      ({ value, selected }) => {
        const selectedValues = selected
          .get(value.relation)
          .filterNot((selectedValue) => F.partialValueEquals(value.value, selectedValue)) as List<F.FacetValue>;

        if (selectedValues.isEmpty()) {
          // clean up disjunct if we deselected all values for the given relation
          this.selectedValues(selected.remove(value.relation))
        } else {
          this.selectedValues(selected.set(value.relation, selectedValues));
        }
      }
    );

    // update facet AST when list of selected values changes
    this.selectedValues.$property.map(this.buldAst).onValue(this.ast);

    // update faceted query when AST changes
    Kefir.combine({
      ast: this.ast.$property,
      baseQuery: currentBaseQuery,
    }).onValue(({ ast, baseQuery }) => {
      this.facetedQuery(this.generateQuery(baseQuery, ast.conjuncts));
      this.valuesCache = {};
    });

    // update list of visible relations for faceting when AST changes or category filter changes
    Kefir.combine({
      ast: this.ast.$property,
      category: this.toggleCategoryAction.$property,
      baseQuery: currentBaseQuery,
    }).onValue(({ ast, category, baseQuery }) =>
      this.fetchRelations(baseQuery, ast.conjuncts, category).onValue(this.relations)
    );

    // facet view updates
    this.facetView({
      category: selectedCategory,
      relation: maybe.Nothing<Relation>(),
      values: { values: [], loading: false },
      selectedValues: OrderedMap<Relation, List<F.FacetValue>>(),
      relationType: null,
      categoryTemplate: config.config.categories.tupleTemplate,
      relationTemplate: config.config.relations.tupleTemplate,
      valuesTemplate: config.config.defaultValueTemplate,
      selectorMode: config.baseConfig.selectorMode,
    });

    Kefir.combine(
      {
        relation: this.toggleRelationAction.$property,
        category: this.toggleCategoryAction.$property,
        values: this.values.$property,
        selectedValues: this.selectedValues.$property,
      },
      { facetView: this.facetView.$property }
    ).onValue(({ relation, category, values, facetView, selectedValues }) => {
      facetView.relation = relation;
      facetView.category = category;
      facetView.values = values;
      facetView.selectedValues = selectedValues;

      if (relation.isJust) {
        const pattern = this.getFacetValuesQueryForRelation(this.config, relation.get());
        facetView.relationType = pattern.kind;

        let literal;
        let resource;
        if (pattern.kind === 'literal') {
          literal = pattern.tupleTemplate || config.config.defaultValueTemplate.literal;
        } else if (pattern.kind === 'resource') {
          resource = pattern.tupleTemplate || config.config.defaultValueTemplate.resource;
        }
        facetView.valuesTemplate = { literal, resource };
      }
      this.facetView(facetView);
    });

    // update facet values when user select/deselect relation
    Kefir.combine(
      {
        relation: this.toggleRelationAction.$property,
        baseQuery: currentBaseQuery,
      },
      {
        ast: this.ast.$property,
      }
    ).onValue(({ ast, relation, baseQuery }) => {
      if (relation.isNothing) {
        this.values({ values: [], loading: false, error: false });
      } else {
        const relationIri = relation.get().iri.value;
        this.values({ values: [], loading: true, error: false });
        let facetValues;
        if (this.valuesCache[relationIri]) {
          facetValues = Kefir.constant(this.valuesCache[relationIri]);
        } else {
          facetValues = this.fetchFacetValues(baseQuery, ast.conjuncts, relation.get());
        }
        facetValues
          .onValue((facetValues) => {
            this.values({ values: facetValues, loading: false, error: false });
            this.valuesCache = { [relationIri]: facetValues };
            trigger({ eventType: BuiltInEvents.ComponentLoaded, source: config.config.id });
          })
          .onError((error) => {
            console.error(error);
            this.values({ values: [], loading: false, error: true });
          });
      }
    });

    // reset facet values of the selected relation
    Kefir.combine(
      { conjunct: this.removeConjunctAction.$property },
      { selected: this.selectedValues.$property }
    ).onValue(({ selected, conjunct }) => {
      const { relation } = conjunct;
      this.selectedValues(selected.remove(relation));
    });
  }

  private initialValues = (ast: F.Ast): SelectedValues => {
    const selectedValues = OrderedMap<Relation, List<F.FacetValue>>();
    return selectedValues.withMutations((mutable) => {
      ast.conjuncts.forEach((conjunct) => mutable.set(conjunct.relation, List(conjunct.disjuncts.map((d) => d.value))));
    });
  };

  private buldAst = (values: SelectedValues): F.Ast => {
    let i = 0;
    const conjuncts = values
      .map((selections, relation) => {
        const disjunctKind = this.getDisjunctType(relation);
        const disjuncts = selections
          .map((selection, j) => this.createValueDisjunct(selection, disjunctKind, i, j))
          .toArray();
        i = i + 1;

        return {
          kind: SearchModel.ConjunctKinds.Relation,
          conjunctIndex: [i],
          relation: relation,
          range: relation.hasRange,
          disjuncts: disjuncts,
        };
      })
      .toArray();
    return { conjuncts };
  };

  private getDisjunctType = (relation: Relation) => {
    const relationType = this.getFacetValuesQueryForRelation(this.config, relation).kind;
    switch (relationType) {
      case 'resource':
        return SearchModel.EntityDisjunctKinds.Resource;
      case 'date-range':
        return SearchModel.TemporalDisjunctKinds.DateRange;
      case 'literal':
        return SearchModel.LiteralDisjunctKind;
      case 'numeric-range':
        return SearchModel.NumericRangeDisjunctKind;
    }
  };

  private createValueDisjunct = (
    value: Resource | F.DateRange | F.Literal | F.NumericRange,
    disjunctType:
      | typeof SearchModel.EntityDisjunctKinds.Resource
      | typeof SearchModel.LiteralDisjunctKind
      | typeof SearchModel.NumericRangeDisjunctKind
      | typeof SearchModel.TemporalDisjunctKinds.DateRange,
    i: number,
    j: number
  ): F.FacetRelationDisjunct =>
    ({
      kind: disjunctType,
      disjunctIndex: [i, j],
      value: value,
    } as F.FacetRelationDisjunct);

  getFacetedQuery(): Kefir.Property<SparqlJs.SelectQuery> {
    return this.facetedQuery.$property;
  }

  getFacetAst(): Kefir.Property<F.Ast> {
    return this.ast.$property;
  }

  getFacetData() {
    return this.facetData.$property;
  }

  facetActions() {
    return this.actions;
  }

  private setBaseQuery = (query: SparqlJs.SelectQuery) => this.baseQuery(query);

  private selectCategory = (category: Category) => {
    this.toggleCategoryAction(maybe.Just(category));
  };

  private deselectCategory = () => {
    this.toggleCategoryAction(maybe.Nothing<Category>());
  };

  private selectRelation = (relation: Relation) => {
    this.toggleRelationAction(maybe.Just(relation));
  };

  private deselectRelation = () => {
    this.toggleRelationAction(maybe.Nothing<Relation>());
  };

  private selectFacetValue = (relation: Relation) => (value: F.FacetValue) =>
    this.selectValueAction({ relation: relation, value: value });

  private deselectFacetValue = (relation: Relation) => (value: F.FacetValue) =>
    this.deselectValueAction({ relation: relation, value: value });

  private fetchRelations(
    baseQuery: SparqlJs.SelectQuery,
    conjuntcs: F.Conjuncts,
    maybeCategory: Data.Maybe<Category>
  ): Kefir.Property<Relations> {
    const relations = this.config.searchProfileStore
      .relationsFor({
        domain: maybe.Just(this.config.domain),
        range: maybeCategory,
      })
      .map(this.buildFacetRelationBinding) as Relations;

    const facetEnabledQuery = SparqlUtil.parseQuery<SparqlJs.AskQuery>('ASK { FILTER(?__relationPattern__) }');
    facetEnabledQuery.where.unshift(...baseQuery.where);
    facetEnabledQuery.where = facetEnabledQuery.where.concat(this.generateQueryClause(baseQuery, conjuntcs));

    const query = generateQueryForMultipleDatasets(
      facetEnabledQuery,
      this.context.selectedDatasets,
      this.context.baseConfig.datasetsConfig
    ) as SparqlJs.AskQuery;
    const enabledFacets = relations
      .valueSeq()
      .sortBy((relation) => relation.label)
      .map((relation) => this.fetchRelation(query, relation))
      .toArray();

    return Kefir.merge(enabledFacets)
      .toProperty()
      .scan(
        (rels, rel) =>
          rels.set(
            RelationKey.key({
              iri: rel.iri,
              domain: rel.hasDomain.iri,
              range: rel.hasRange.iri,
            }),
            rel
          ),
        relations
      );
  }

  private fetchRelation(enabledBaseQuery: SparqlJs.AskQuery, relation: Relation) {
    const valuesQuery = this.getFacetValuesQueryForRelation(this.config, relation).valuesQuery;
    const parsedPattern = SparqlUtil.parseQuery<SparqlJs.SelectQuery>(valuesQuery).where;
    const facetQuery = cloneQuery(enabledBaseQuery);
    new PatternBinder('__relationPattern__', parsedPattern).sparqlQuery(facetQuery);

    const parametrized = SparqlClient.setBindings(facetQuery, { [FACET_VARIABLES.RELATION_VAR]: relation.iri });

    const serializedQuery = SparqlUtil.serializeQuery(parametrized);
    if (_.has(this.relationsCache, serializedQuery)) {
      relation.available = this.relationsCache[serializedQuery];
      return Kefir.constant(relation);
    } else {
      return this.executeRelationCheckQuery(serializedQuery, relation);
    }
  }

  private executeRelationCheckQuery = (parametrized: string, relation: Relation) => {
    return SparqlClient.ask(parametrized, { context: this.context.semanticContext })
      .map((isFacetEnabled) => {
        relation.available = isFacetEnabled;
        this.relationsCache[parametrized] = isFacetEnabled;
        return relation;
      })
      .flatMapErrors((_) => {
        relation.available = false;
        return Kefir.constant(relation);
      });
  };

  /**
   * Makes bindings from search profile, available in the tuple for Facet relation item.
   *
   * $relation - for relation tuple
   * $domain - for relation domain category
   * $range - for relation range category
   */
  private buildFacetRelationBinding(relation: Relation): Relation {
    const tuple: any = {
      $relation: relation.tuple,
      $domain: relation.hasDomain.tuple,
      $range: relation.hasRange.tuple,
      available: undefined,
    };
    return { ...relation, tuple };
  }

  /**
   * Makes bindings for category from search profile, available at '$category' varibale, in the
   * tuple for Facet category item.
   */
  private buildFacetCategoryBinding(category: Category): Category {
    const tuple: any = {
      $category: category.tuple,
    };
    return { ...category, tuple };
  }

  private fetchFacetValues(
    baseQuery: SparqlJs.SelectQuery,
    conjuncts: F.Conjuncts,
    relation: Relation
  ): Kefir.Property<Array<F.FacetValue>> {
    const relationConfig = this.getFacetValuesQueryForRelation(this.config, relation);
    switch (relationConfig.kind) {
      case 'resource':
        return this.fetchFacetResourceValues(baseQuery, conjuncts, relation, relationConfig);
      case 'date-range':
        return this.fetchFacetDateRangeValues(baseQuery, conjuncts, relation, relationConfig);
      case 'literal':
        return this.fetchFacetLiteralValues(baseQuery, conjuncts, relation, relationConfig);
      case 'numeric-range':
        return this.fetchFacetNumericRangeValues(baseQuery, conjuncts, relation, relationConfig);
    }
  }

  /**
   * Augments the facet values with the labels extracted using the LabelsService,
   * if they were not retrieved by the original query
   */
  private augmentWithLabelsFromServiceIfNeeded(values: Array<Resource>): Kefir.Property<Array<Resource>> {
    // If the labels were not retrieved in the original query,
    // we retrieve them from the LabelsService, otherwise,
    // pass the arrays "as is"
    if (values.length > 0 && typeof values[0].label !== 'string') {
      return LabelsService.getLabels(
        values.map((value) => value.iri),
        { context: this.context.semanticContext }
      ).map((labels) =>
        values.map((value) => {
          const label = labels.get(value.iri) as string;
          value.tuple[FACET_VARIABLES.VALUE_RESOURCE_LABEL_VAR] = Rdf.literal(label);
          return {
            iri: value.iri,
            label,
            description: label,
            tuple: value.tuple,
          };
        })
      );
    } else {
      return Kefir.constant(values);
    }
  }

  private fetchFacetResourceValues(
    baseQuery: SparqlJs.SelectQuery,
    conjuncts: F.Conjuncts,
    relation: Relation,
    relationConfig: ResourceFacetValue
  ): Kefir.Property<Array<Resource>> {
    return this.executeValuesQuery(baseQuery, conjuncts, relation, relationConfig.valuesQuery, true)
      .map((res) =>
        res.results.bindings.map((binding) => ({
          iri: binding[FACET_VARIABLES.VALUE_RESOURCE_VAR] as Rdf.Iri,
          label:
            FACET_VARIABLES.VALUE_RESOURCE_LABEL_VAR in binding
              ? binding[FACET_VARIABLES.VALUE_RESOURCE_LABEL_VAR].value
              : undefined,
          description:
            FACET_VARIABLES.VALUE_RESOURCE_LABEL_VAR in binding
              ? binding[FACET_VARIABLES.VALUE_RESOURCE_LABEL_VAR].value
              : undefined,
          tuple: binding,
        }))
      )
      .flatMap((values) => this.augmentWithLabelsFromServiceIfNeeded(values))
      .map((values) => _.sortBy(values, (v) => v.label))
      .toProperty();
  }

  private fetchFacetDateRangeValues(
    baseQuery: SparqlJs.SelectQuery,
    conjuncts: F.Conjuncts,
    relation: Relation,
    relationConfig: DateRangeFacetValue
  ): Kefir.Property<Array<F.DateRange>> {
    return this.executeValuesQuery(baseQuery, conjuncts, relation, relationConfig.valuesQuery).map((res) =>
      res.results.bindings
        .map((binding) => ({
          begin: moment(binding[FACET_VARIABLES.VALUE_DATE_RANGE_BEGIN_VAR].value, moment.ISO_8601),
          end: moment(binding[FACET_VARIABLES.VALUE_DATE_RANGE_END_VAR].value, moment.ISO_8601),
        }))
        .filter(({ begin, end }) => begin.isValid() && end.isValid())
    );
  }

  private fetchFacetLiteralValues(
    baseQuery: SparqlJs.SelectQuery,
    conjuncts: F.Conjuncts,
    relation: Relation,
    relationConfig: LiteralFacetValue
  ): Kefir.Property<Array<F.Literal>> {
    return this.executeValuesQuery(baseQuery, conjuncts, relation, relationConfig.valuesQuery).map((res) =>
      res.results.bindings.map((binding) => ({
        literal: binding[FACET_VARIABLES.VALUE_LITERAL] as Rdf.Literal,
        tuple: binding,
      }))
    );
  }

  private fetchFacetNumericRangeValues(
    baseQuery: SparqlJs.SelectQuery,
    conjuncts: F.Conjuncts,
    relation: Relation,
    relationConfig: NumericRangeFacetValue
  ): Kefir.Property<Array<F.NumericRange>> {
    return this.executeValuesQuery(baseQuery, conjuncts, relation, relationConfig.valuesQuery).map((res) =>
      res.results.bindings.map((binding) => ({
        begin: parseFloat(binding[FACET_VARIABLES.VALUE_NUMERIC_RANGE_BEGIN_VAR].value),
        end: parseFloat(binding[FACET_VARIABLES.VALUE_NUMERIC_RANGE_END_VAR].value),
        tuple: binding,
      }))
    );
  }

  private executeValuesQuery(
    baseQuery: SparqlJs.SelectQuery,
    conjuncts: F.Conjuncts,
    relation: Relation,
    facetValuesQuery: string,
    isResourceQuery = false
  ) {
    const facetsQuery = rewriteProjectionVariable(
      SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(facetValuesQuery),
      this.getProjectionVariable(baseQuery)
    );
    facetsQuery.where.unshift(...baseQuery.where);
    facetsQuery.where = facetsQuery.where.concat(
      this.generateQueryClause(baseQuery, this.excludeClauseForRelation(conjuncts, relation.iri))
    );

    // If we have a threshold for the number of displayed facet values,
    // we introduce a limit into the query to retrieve only (threshold + 1) results
    if (isResourceQuery && this.config.config.facetValuesThreshold > 0) {
      facetsQuery.limit = this.config.config.facetValuesThreshold + 1;
    }

    const query = SparqlClient.setBindings(
      facetsQuery,
      _.assign(
        {
          [FACET_VARIABLES.RELATION_VAR]: relation.iri,
          [FACET_VARIABLES.RANGE_VAR]: relation.hasRange.iri,
        },
        {
          [SEMANTIC_SEARCH_VARIABLES.SELECTED_ALIGNMENT]: this.context.selectedAlignment
            .map((a) => a.iri)
            .getOrElse(undefined),
        }
      )
    );

    const federatedQuery = generateQueryForMultipleDatasets(
      query,
      this.context.selectedDatasets,
      this.context.baseConfig.datasetsConfig
    );
    return SparqlClient.select(federatedQuery, { context: this.context.semanticContext });
  }

  private excludeClauseForRelation(conjuncts: F.Conjuncts, relation: Rdf.Iri) {
    return _.reject(conjuncts, (conjunct) => conjunct.relation.iri.equals(relation));
  }

  private generateQuery(baseQuery: SparqlJs.SelectQuery, conjuncts: F.Conjuncts): SparqlJs.SelectQuery {
    const patterns = this.generateQueryClause(baseQuery, conjuncts);
    const query = _.clone(baseQuery);
    query.where = query.where.concat(patterns);
    return query;
  }

  private getFacetValuesQueryForRelation(config: FacetStoreConfig, relation: Relation): FacetValuePattern {
    const { valueCategories, valueRelations } = config.config;
    const rangeIri = relation.hasRange.iri.toString();
    const relationIri = relation.iri.toString();
    if (_.has(valueRelations, relationIri)) {
      return valueRelations[relationIri];
    } else if (_.has(valueCategories, rangeIri)) {
      return valueCategories[rangeIri];
    } else {
      return generateFacetValuePatternFromRelation(config, relation);
    }
  }

  private getProjectionVariable(baseQuery: SparqlJs.SelectQuery): string {
    if (this.config.availableDomains) {
      return this.config.availableDomains.get(this.config.domain.iri);
    }
    const variables = baseQuery.variables;
    return variables[0] as string;
  }

  private generateQueryClause(baseQuery: SparqlJs.SelectQuery, conjuncts: F.Conjuncts): Array<SparqlJs.Pattern> {
    if (this.config.availableDomains) {
      return this.config.availableDomains
        .map((projectionVariable, iri) => {
          const filteredConjuncts = conjuncts.filter((conjunct) => conjunct.relation.hasDomain.iri.equals(iri));
          return conjunctsToQueryPatterns(
            this.config.baseConfig,
            projectionVariable,
            this.config.domain,
            filteredConjuncts
          );
        })
        .flatten()
        .toArray();
    }
    return conjunctsToQueryPatterns(
      this.config.baseConfig,
      this.getProjectionVariable(baseQuery),
      this.config.domain,
      conjuncts
    );
  }

  private removeConjunct = (conjunct: SearchModel.RelationConjunct) => {
    this.removeConjunctAction(conjunct);
  };
}

/**
 * Supported subset of relation kinds for facet value pattern autogeneration.
 */
type PatterConfig = SearchConfig.Resource | SearchConfig.Literal;
type PatternKind = PatterConfig['kind'];

/**
 * Generates a default query for facet values using {@link SemanticFacetConfig.defaultValueQuery}
 * as base template and parametrizes it with relation pattern.
 */
function generateFacetValuePatternFromRelation(config: FacetStoreConfig, relation: Relation): FacetValuePattern {
  const relationPatterns = tryGetRelationPatterns(config.baseConfig, relation).filter((p) =>
    _.some(['resource', 'literal', 'date-range', 'numeric-range'], (kind) => kind === p.kind)
  ) as PatterConfig[];

  const patternConfig = relationPatterns.length === 1 ? relationPatterns[0] : undefined;
  if (relationPatterns.length > 1) {
    console.warn(`Found multiple matching patterns for facet relation ${relation.iri}`);
  }

  let { kind = 'resource' as PatterConfig['kind'], queryPattern } = patternConfig || ({} as Partial<PatterConfig>);
  if (queryPattern === undefined) {
    queryPattern =
      kind === 'resource'
        ? SearchDefaults.DefaultFacetValuesQueries.ResourceRelationPattern
        : kind === 'literal'
        ? SearchDefaults.DefaultFacetValuesQueries.LiteralRelationPattern
        : assertHandledEveryPatternKind(kind);
  }

  const query = SparqlUtil.parseQuery(getDefaultValuesQuery(config.config, kind));
  const parsed = SparqlUtil.parsePatterns(queryPattern, query.prefixes);

  const facetRelationPattern = transformRelationPatternForFacetValues(parsed, kind);
  new PatternBinder(FACET_VARIABLES.RELATION_PATTERN_VAR, facetRelationPattern).sparqlQuery(query);

  const valuesQuery = SparqlUtil.serializeQuery(query);
  return kind === 'resource'
    ? { kind: 'resource', valuesQuery }
    : kind === 'literal'
    ? { kind: 'literal', valuesQuery }
    : kind === 'date-range'
    ? { kind: 'date-range', valuesQuery }
    : kind === 'numeric-range'
    ? { kind: 'numeric-range', valuesQuery }
    : assertHandledEveryPatternKind(kind);
}

function getDefaultValuesQuery(config: SemanticFacetConfig, kind: PatternKind) {
  const defaultQueries = SearchDefaults.DefaultFacetValuesQueries;
  return kind === 'resource'
    ? config.defaultValueQueries.resource || defaultQueries.forResource()
    : kind === 'literal'
    ? config.defaultValueQueries.literal || defaultQueries.forLiteral()
    : kind === 'date-range'
    ? defaultQueries.forDateRange()
    : kind === 'numeric-range'
    ? defaultQueries.forNumericRange()
    : assertHandledEveryPatternKind(kind);
}

/**
 * Renames resource variable in the relation pattern
 * to use it as part of facet values query.
 */
function transformRelationPatternForFacetValues(pattern: SparqlJs.Pattern[], kind: PatternKind) {
  let binder: QueryVisitor;
  if (kind === 'resource') {
    binder = new VariableRenameBinder(SEMANTIC_SEARCH_VARIABLES.RESOURCE_VAR, FACET_VARIABLES.VALUE_RESOURCE_VAR);
  } else if (kind === 'literal') {
    binder = new VariableRenameBinder(SEMANTIC_SEARCH_VARIABLES.LITERAL_VAR, FACET_VARIABLES.VALUE_LITERAL);
  } else if (kind === 'date-range') {
    const range = {
      begin: SEMANTIC_SEARCH_VARIABLES.DATE_BEGING_VAR,
      end: SEMANTIC_SEARCH_VARIABLES.DATE_END_VAR,
    };
    const rangeTo = {
      begin: FACET_VARIABLES.VALUE_DATE_RANGE_BEGIN_VAR,
      end: FACET_VARIABLES.VALUE_DATE_RANGE_END_VAR,
    };
    return transformRangePattern(pattern, range, rangeTo);
  } else if (kind === 'numeric-range') {
    const range = {
      begin: SEMANTIC_SEARCH_VARIABLES.NUMERIC_RANGE_BEGIN_VAR,
      end: SEMANTIC_SEARCH_VARIABLES.NUMERIC_RANGE_END_VAR,
    };
    const rangeTo = {
      begin: FACET_VARIABLES.VALUE_NUMERIC_RANGE_BEGIN_VAR,
      end: FACET_VARIABLES.VALUE_NUMERIC_RANGE_END_VAR,
    };
    return transformRangePattern(pattern, range, rangeTo);
  } else {
    assertHandledEveryPatternKind(kind);
  }

  const clonedPattern = _.cloneDeep(pattern);
  clonedPattern.forEach((p) => binder.pattern(p));
  return clonedPattern;
}

function assertHandledEveryPatternKind(kind: never): never {
  throw new Error(`Unexpected pattern kind: ${kind}`);
}
