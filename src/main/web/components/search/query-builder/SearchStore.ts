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
 */

import * as Maybe from 'data.maybe';
import * as Kefir from 'kefir';
import * as _ from 'lodash';
import * as SparqlJs from 'sparqljs';

import { Action } from 'platform/components/utils';

import { SemanticSearchConfig } from 'platform/components/semantic/search/config/SearchConfig';
import { ExtendedSearchValue } from 'platform/components/semantic/search/web-components/SemanticSearchApi';
import * as Model from 'platform/components/semantic/search/data/search/Model';
import { getCategoryTypes } from 'platform/components/semantic/search/data/search/ModelUtils';
import SearchProfileStore from 'platform/components/semantic/search/data/profiles/SearchProfileStore';
import { generateSelectQuery } from 'platform/components/semantic/search/data/search/SparqlQueryGenerator';

export type SearchState =
  | DomainSelection
  | RangeSelection
  | TextTermSelection
  | RelationSelection
  | TermSelection
  | View
  | ExtendedDomainSelection
  | ExtendedRelationSelection;

export type ActiveState = RangeSelection | TextTermSelection | RelationSelection | TermSelection;

export interface View {
  kind: 'search-view';
}

export interface DomainSelection {
  kind: 'domain-selection';
  domains: Model.Categories;
}

export interface ExtendedDomainSelection {
  kind: 'extended-domain-selection';
  domains: Model.Categories;
  range: Model.Category;
  disjunct: Model.ResourceDisjunct | Model.SavedSearchDisjunct;
}

export interface ExtendedRelationSelection {
  kind: 'extended-relation-selection';
  domain: Model.Category;
  range: Model.Category;
  relations: Model.Relations;
  disjunct: Model.ResourceDisjunct | Model.SavedSearchDisjunct;
}

export type ConjunctIndex = Array<number>;
export type DisjunctIndex = Array<number>;

export interface ConjunctStep {
  kind: string;
  conjunctIndex: ConjunctIndex;
}

export interface DisjunctStep extends ConjunctStep {
  disjunctIndex: DisjunctIndex;
}

export interface RangeSelection extends ConjunctStep {
  kind: 'range-selection';
  domain: Model.Category;
  ranges: Model.Categories;
}

export interface TextTermSelection extends DisjunctStep {
  kind: 'text-term-selection';
  range: Model.Category;
  domain: Model.Category;
}

export interface RelationSelection extends ConjunctStep {
  kind: 'relation-selection';
  domain: Model.Category;
  range: Model.Category;
  relations: Model.Relations;
}

export type TermType = 'resource' | 'hierarchy' | 'date-range' | 'place' | 'nested-search' | 'text';
export type TermSelection = RelationTermSelection | TermSelectionSearch | TextTermSelection;

export interface RelationTermSelection extends DisjunctStep {
  kind: 'term-selection';
  termKind: [TermType];
  domain: Model.Category;
  range: Model.Category;
  relation: Model.Relation;
}

export interface TermSelectionSearch extends DisjunctStep {
  kind: 'term-selection';
  termKind: ['nested-search'];
  domain: Model.Category;
  range: Model.Category;
  relation: Model.Relation;
  state: ActiveState;
}

export enum EditKinds {
  Domain,
  Range,
  Relation,
  Disjunct,
}

export class SearchStore {
  private _searchProperty = Action<Data.Maybe<Model.Search>>();
  private _search: Data.Maybe<Model.Search>;

  private _profileStore: SearchProfileStore;

  private _searchStateProperty = Action<SearchState>();
  private _searchState: SearchState;
  private config: SemanticSearchConfig;
  private projectionVariable: string;

  /**
   * We need to assign unique id to every new clause to facilitate integration testing.
   */
  private _counter = 0;

  constructor(
    profileStore: SearchProfileStore,
    baseConfig: SemanticSearchConfig,
    projectionVariable: string,
    initialSearch: Data.Maybe<Model.Search>,
    nestedSearch: Data.Maybe<{ value: ExtendedSearchValue; range: Model.Category }>
  ) {
    this.config = baseConfig;
    this.projectionVariable = projectionVariable;
    this._profileStore = profileStore;
    if (nestedSearch.isJust) {
      this.search = Maybe.Nothing<Model.Search>();
      this.searchState = {
        kind: 'extended-domain-selection',
        domains: this.domains(),
        range: nestedSearch.get().range,
        disjunct: this.extendedValueToDisjunct(nestedSearch.get().value),
      };
    } else if (initialSearch.isJust) {
      this.searchState = null;
      this.search = initialSearch;
    } else {
      this.search = initialSearch;
      this.searchState = {
        kind: 'domain-selection',
        domains: this.domains(),
      };
    }
  }

  /**
   * Category types supported by QueryBuilder.
   */
  private static SupportedCategoryTypes = ['resource', 'hierarchy', 'date-range', 'text', 'place', 'set'];

  private domains = (): Model.Categories => {
    return this.filterOnlySupportedCategories(this._profileStore.domains);
  };

  private rangesFor = (domain: Model.Category): Model.Categories => {
    return this.filterOnlySupportedCategories(this._profileStore.rangesFor(domain));
  };

  /**
   * Filters for categories with types supported by QueryBuilder.
   */
  private filterOnlySupportedCategories = (categories: Model.Categories): Model.Categories => {
    return categories.filterNot((domain) => {
      const supportedCategoryTypes = _.intersection(
        SearchStore.SupportedCategoryTypes,
        getCategoryTypes(this.config, domain)
      );
      return _.isEmpty(supportedCategoryTypes);
    }) as Model.Categories;
  };

  private extendedValueToDisjunct = (value: ExtendedSearchValue) => {
    if (this.isResourceExtendedDisjunct(value)) {
      return {
        kind: Model.EntityDisjunctKinds.Resource,
        value: value as Model.Resource,
        conjunctIndex: [0],
        disjunctIndex: [0, 0],
      };
    } else {
      return {
        kind: Model.EntityDisjunctKinds.SavedSearch,
        value: {
          query: value.query,
          label: value.label,
        },
        conjunctIndex: [0],
        disjunctIndex: [0, 0],
      };
    }
  };

  private isResourceExtendedDisjunct = (value: ExtendedSearchValue): value is Model.Resource => {
    return _.has(value, 'iri');
  };

  public selectExtendedDomain = (domain: Model.Category) => {
    this.searchState = _.assign({}, this._searchState, {
      kind: 'extended-relation-selection',
      domain: domain,
      relations: this._profileStore.relationsFor({
        domain: Maybe.Just(domain),
        range: Maybe.Just((this._searchState as ExtendedDomainSelection).range),
      }),
    });
  };

  public selectExtendedRelation = (relation: Model.Relation) => {
    const state = this._searchState as ExtendedRelationSelection;
    this.search = Maybe.Just({
      domain: state.domain,
      conjuncts: [
        {
          kind: Model.ConjunctKinds.Relation,
          range: state.range,
          relation: relation,
          conjunctIndex: [0],
          disjuncts: [state.disjunct],
        },
      ],
    });
    this.searchState = null;
  };

  private set searchState(state: SearchState) {
    this._searchState = state;
    this._searchStateProperty(state);
  }

  public get currentSearchState(): Kefir.Property<SearchState> {
    return this._searchStateProperty.$property;
  }

  public set search(search: Data.Maybe<Model.Search>) {
    this._search = search;
    this._searchProperty(search);
  }

  public get currentSearch(): Kefir.Property<Data.Maybe<Model.Search>> {
    return this._searchProperty.$property;
  }

  public get currentSearchQuery(): Kefir.Property<Data.Maybe<SparqlJs.SelectQuery>> {
    return this._searchProperty.$property.map((maybeSearch) =>
      maybeSearch.map((search) => generateSelectQuery(this.config, this.projectionVariable, search))
    );
  }

  public edit = (kind: EditKinds, conjunct?: Model.RelationConjunct, disjunct?: Model.Disjunct) => {
    if (kind === EditKinds.Domain) {
      this.search = Maybe.Nothing<Model.Search>();
      this.searchState = {
        kind: 'domain-selection',
        domains: this.domains(),
      };
      return;
    }

    const editingPersistantState = conjunct || disjunct;
    if (editingPersistantState) {
      const domain = this._search.get().domain;
      switch (kind) {
        case EditKinds.Range:
          if (conjunct.conjunctIndex.length > 1) {
            const baseConjunct = this.getConjunctByIndex(
              this._search.get(),
              _.dropRight(conjunct.conjunctIndex, 2)
            ) as Model.RelationConjunct;
            this.removeConjunction(conjunct);
            if (this._search.isJust) {
              this.addConjunction(this._search.get().conjuncts[0]);
              this.selectRange(baseConjunct.range);
              this.selectRelation(baseConjunct.relation);
              this.selectSubSearchTerm();
            } else {
              const newConjunctIndex = _.clone([0, 0]);
              newConjunctIndex.push(0);
              this.searchState = {
                kind: 'term-selection',
                termKind: ['nested-search'],
                domain: domain,
                range: baseConjunct.range,
                relation: baseConjunct.relation,
                conjunctIndex: [0],
                disjunctIndex: [0, 0],
                state: {
                  kind: 'range-selection',
                  domain: baseConjunct.range,
                  ranges: this.rangesFor(baseConjunct.range),
                  conjunctIndex: newConjunctIndex,
                },
              };
            }
          } else {
            this.removeConjunction(conjunct);
            if (this._search.isJust) {
              this.addConjunction(this._search.get().conjuncts[0]);
            } else {
              this.selectDomain(domain);
            }
          }
          break;

        case EditKinds.Relation:
          if (conjunct.conjunctIndex.length > 1) {
            const baseConjunct = this.getConjunctByIndex(
              this._search.get(),
              _.dropRight(conjunct.conjunctIndex, 2)
            ) as Model.RelationConjunct;
            this.removeConjunction(conjunct);
            if (this._search.isJust) {
              this.addConjunction(this._search.get().conjuncts[0]);
              this.selectRange(baseConjunct.range);
              this.selectRelation(baseConjunct.relation);
              this.selectSubSearchTerm();
              this.selectRange(conjunct.range);
            } else {
              const newConjunctIndex = _.clone([0, 0]);
              newConjunctIndex.push(0);
              this.searchState = this._selectRange(
                {
                  kind: 'term-selection',
                  termKind: ['nested-search'],
                  domain: domain,
                  range: baseConjunct.range,
                  relation: baseConjunct.relation,
                  conjunctIndex: [0],
                  disjunctIndex: [0, 0],
                  state: {
                    kind: 'relation-selection',
                    domain: baseConjunct.range,
                    conjunctIndex: newConjunctIndex,
                    // FIXME: should be specified?!
                    range: undefined,
                    relations: undefined,
                  },
                },
                conjunct.range
              );
            }
          } else {
            this.removeConjunction(conjunct);
            if (this._search.isJust) {
              this.addConjunction(this._search.get().conjuncts[0]);
              this.selectRange(conjunct.range);
            } else {
              this.selectDomain(domain);
              this.selectRange(conjunct.range);
            }
          }
          break;

        case EditKinds.Disjunct:
          if (conjunct.conjunctIndex.length > 1) {
            const baseConjunct = this.getConjunctByIndex(
              this._search.get(),
              _.dropRight(conjunct.conjunctIndex, 2)
            ) as Model.RelationConjunct;
            this.removeDisjunct(conjunct as any, disjunct);
            if (this._search.isJust) {
              if (conjunct.disjuncts.length === 0) {
                this.addConjunction(this._search.get().conjuncts[0]);
                this.selectRange(baseConjunct.range);
                this.selectRelation(baseConjunct.relation);
                this.selectSubSearchTerm();
                this.selectRange(conjunct.range);
                this.selectRelation(conjunct.relation);
              } else {
                this.addDisjunction(conjunct);
              }
            } else {
              const newConjunctIndex = _.clone([0, 0]);
              newConjunctIndex.push(0);
              this.searchState = this._selectRelation(
                {
                  kind: 'term-selection',
                  termKind: ['nested-search'],
                  domain: domain,
                  range: baseConjunct.range,
                  relation: baseConjunct.relation,
                  conjunctIndex: [0],
                  disjunctIndex: [0, 0],
                  state: {
                    kind: 'relation-selection',
                    domain: baseConjunct.range,
                    range: conjunct.range,
                    conjunctIndex: newConjunctIndex,
                    // FIXME: should be specified?!
                    relations: undefined,
                  },
                },
                conjunct.relation
              );
            }
          } else {
            this.removeDisjunct(conjunct as any, disjunct);
            if (conjunct.disjuncts.length > 0) {
              this.addDisjunction(conjunct);
            } else {
              if (this._search.isJust) {
                this.addConjunction(this._search.get().conjuncts[0]);
                this.selectRange(conjunct.range);
                this.selectRelation(conjunct.relation);
              } else {
                this.selectDomain(domain);
                this.selectRange(conjunct.range);
                this.selectRelation(conjunct.relation);
              }
            }
          }

          break;
      }
    } else {
      switch (kind) {
        case EditKinds.Range:
          if (this.isNestedSearch(this._searchState as any)) {
            this.selectSubSearchTerm();
          } else {
            this.selectDomain((this._searchState as any).domain);
          }
          break;

        case EditKinds.Relation:
          this.selectRange((this._searchState as any).range);
          break;
      }
    }
  };

  public selectDomain = (domain: Model.Category) => {
    this.searchState = {
      kind: 'range-selection',
      domain: domain,
      ranges: this.rangesFor(domain),
      conjunctIndex: [0],
    };
  };

  public selectRange = (range: Model.Category) => {
    const state = this._searchState as ActiveState;
    this.searchState = this._selectRange(state, range);
  };

  public _selectRange = (state: ActiveState, range: Model.Category) => {
    const deepestActiveState = this.getDeepestActiveState(state) as RangeSelection;

    if (_.includes(getCategoryTypes(this.config, range), 'text')) {
      return this.updateNestedState(state, this.selectTextDisjunctState(deepestActiveState, range));
    } else {
      let newState: SearchState = this.selectRelationState(deepestActiveState, range);
      if (newState.relations.size === 1) {
        const relation = newState.relations.first();
        newState = this.selectTermState(newState, relation);
      }
      return this.updateNestedState(state, newState);
    }
  };

  private isNestedSearch = (state: ActiveState): state is TermSelectionSearch =>
    state.kind === 'term-selection' && _.isEqual(state.termKind, ['nested-search']);

  private updateNestedState(currentState: ActiveState, newState: ActiveState): ActiveState {
    const updatedState = _.clone(currentState);
    const deepestActiveState = this.getDeepestActiveState(updatedState);
    _.assign(deepestActiveState, newState);
    return updatedState;
  }

  private getDeepestActiveState(state: ActiveState): ActiveState {
    if (this.isNestedSearch(state)) {
      return this.getDeepestActiveState(state.state);
    } else {
      return state;
    }
  }

  private selectTextDisjunctState(state: RangeSelection, range: Model.Category): TextTermSelection {
    const { conjunctIndex } = this._searchState as ConjunctStep;
    const newDisjunctIndex = _.clone(conjunctIndex);
    newDisjunctIndex.push(0);
    return _.assign({}, state as any, {
      kind: 'text-term-selection',
      range: range,
      disjunctIndex: newDisjunctIndex,
    });
  }

  private selectRelationState(state: RangeSelection, range: Model.Category): RelationSelection {
    const { conjunctIndex } = this._searchState as ConjunctStep;
    const relations = this._profileStore.relationsFor({
      domain: Maybe.Just(state.domain),
      range: Maybe.Just(range),
    });
    return _.assign({}, state as any, {
      kind: 'relation-selection',
      range: range,
      relations: relations,
    });
  }

  public selectRelation = (relation: Model.Relation) => {
    const state = this._searchState as ActiveState;
    this.searchState = this._selectRelation(state, relation);
  };

  private _selectRelation = (state: ActiveState, relation: Model.Relation) => {
    const deepestActiveState = this.getDeepestActiveState(state) as RelationSelection;
    return this.updateNestedState(state, this.selectTermState(deepestActiveState, relation));
  };

  public selectTermState = (state: RelationSelection, relation: Model.Relation): TermSelection => {
    const { conjunctIndex } = state;
    const newDisjunctIndex = _.clone(conjunctIndex);
    newDisjunctIndex.push(0);

    return _.assign({}, state as any, {
      kind: 'term-selection',
      termKind: this.getRelationDisjunctKinds(relation),
      relation: relation,
      disjunctIndex: newDisjunctIndex,
    });
  };

  private getRelationDisjunctKinds(relation: Model.Relation) {
    return getCategoryTypes(this.config, relation.hasRange);
  }

  private getConjunctType = (searchState: TermSelection): Model.ConjunctKind => {
    if (searchState.kind === 'text-term-selection') {
      return Model.ConjunctKinds.Text;
    } else {
      return Model.ConjunctKinds.Relation;
    }
  };

  private getDisjunctType = (searchState: TermSelection, termType: TermType, value: any): Model.DisjunctKind => {
    if (searchState.kind === 'text-term-selection') {
      return Model.TextDisjunctKind;
      // TODO need to properly check if entity is Set, when working on tests for search
    } else if (value.iri && _.includes(value.iri.value, 'container/setContainer')) {
      return Model.EntityDisjunctKinds.Set;
    } else if (value.query) {
      return Model.EntityDisjunctKinds.SavedSearch;
    } else {
      switch (termType) {
        case 'resource':
        case 'hierarchy':
          return Model.EntityDisjunctKinds.Resource;
        case 'date-range':
          return value.dateFormat;
        case 'place':
          if (value['center']) {
            return Model.SpatialDisjunctKinds.Distance;
          } else {
            return Model.SpatialDisjunctKinds.BoundingBox;
          }
      }
    }
  };

  private getDisjunctValue = (value: any): any => {
    if (value['dateFormat']) {
      return value.value;
    } else {
      return value;
    }
  };

  public selectTerm = (termType: TermType) => (value: any) => {
    const searchState = this._searchState as TermSelection;
    const { domain, range, conjunctIndex } = searchState;
    if (this._search.isJust) {
      if (_.isEqual((searchState as any).termKind, ['nested-search'])) {
        this.search = Maybe.Just(this.updateNestedSearchTerm(this._search.get(), searchState as any, value, termType));
      } else {
        const existingConjunct = this.getConjunctByIndex(this._search.get(), conjunctIndex) as Model.RelationConjunct;
        if (existingConjunct) {
          existingConjunct.disjuncts.push({
            kind: this.getDisjunctType(searchState, termType, value),
            value: this.getDisjunctValue(value),
            disjunctIndex: this.newDisjunctIndex(existingConjunct),
          } as any);
          this.search = this._search;
        } else {
          const searhBase = this.getSearchBaseForConjunct(this._search.get(), conjunctIndex);
          const conjunct = {
            uniqueId: this._counter++,
            kind: this.getConjunctType(searchState),
            range: range,
            conjunctIndex: conjunctIndex,
            disjuncts: [],
          } as any;
          if (conjunct.kind === Model.ConjunctKinds.Relation) {
            conjunct['relation'] = searchState['relation'];
          }
          conjunct.disjuncts.push({
            kind: this.getDisjunctType(searchState, termType, value),
            disjunctIndex: this.newDisjunctIndex(conjunct),
            value: this.getDisjunctValue(value),
          });
          searhBase.conjuncts.push(conjunct);
          this.search = this._search;
        }
      }
    } else {
      this.search = Maybe.Just(this.createInitialSearch(this._searchState as any, value, termType));
    }
    this.searchState = null;
  };

  private updateNestedSearchTerm = (
    search: Model.Search,
    searchState: TermSelectionSearch,
    resource: any,
    termType: TermType
  ): Model.Search => {
    const nestedState = searchState.state as TermSelection;
    const existingParentConjunct = this.getConjunctByIndex(search, searchState.conjunctIndex) as Model.RelationConjunct;
    if (existingParentConjunct) {
      const newDisjunctIndex = this.newDisjunctIndex(existingParentConjunct);
      const newConjunctIndex = _.clone(newDisjunctIndex);
      newConjunctIndex.push(0);
      const conjunct = {
        uniqueId: this._counter++,
        kind: this.getConjunctType(nestedState),
        range: nestedState.range,
        relation: (nestedState as any).relation,
        conjunctIndex: newConjunctIndex,
        disjuncts: [],
      } as any;
      conjunct.disjuncts.push({
        kind: this.getDisjunctType(nestedState, termType, resource),
        disjunctIndex: this.newDisjunctIndex(conjunct),
        value: resource,
      } as any);

      existingParentConjunct.disjuncts.push({
        kind: Model.EntityDisjunctKinds.Search,
        value: {
          domain: nestedState.domain,
          conjuncts: [conjunct],
        },
        disjunctIndex: newDisjunctIndex,
      });
      return search;
    } else {
      const conjunct: Model.RelationConjunct = {
        kind: Model.ConjunctKinds.Relation,
        range: searchState.range,
        relation: searchState.relation,
        conjunctIndex: searchState.conjunctIndex,
        disjuncts: [],
      };
      const newDisjunctIndex = this.newDisjunctIndex(conjunct);
      const newConjunctIndex = _.clone(newDisjunctIndex);
      newConjunctIndex.push(0);
      const nestedConjunct = {
        uniqueId: this._counter++,
        kind: this.getConjunctType(nestedState),
        range: nestedState.range,
        relation: (nestedState as any).relation,
        conjunctIndex: newConjunctIndex,
        disjuncts: [],
      } as any;
      nestedConjunct.disjuncts.push({
        kind: this.getDisjunctType(searchState, termType, resource),
        disjunctIndex: this.newDisjunctIndex(nestedConjunct),
        value: this.getDisjunctValue(resource),
      } as any);

      conjunct.disjuncts.push({
        kind: Model.EntityDisjunctKinds.Search,
        disjunctIndex: newDisjunctIndex,
        value: {
          domain: nestedState.domain,
          conjuncts: [nestedConjunct],
        },
      });
      search.conjuncts.push(conjunct);
      return search;
    }
  };

  private createInitialSearch = (state: TermSelection, resource: any, termType: TermType, n = 1): Model.Search => {
    const isNestedSearch = _.includes((state as any).termKind, 'nested-search');
    return {
      domain: state.domain,
      conjuncts: [
        {
          uniqueId: this._counter++,
          kind: (state as any).kind === 'text-term-selection' ? Model.ConjunctKinds.Text : Model.ConjunctKinds.Relation,
          range: state.range,
          relation: (state as any).relation,
          conjunctIndex: _.fill(Array(n), 0),
          disjuncts: [
            {
              kind: isNestedSearch ? Model.EntityDisjunctKinds.Search : this.getDisjunctType(state, termType, resource),
              value: isNestedSearch
                ? this.createInitialSearch((state as any).state, resource, termType, n + 2)
                : this.getDisjunctValue(resource),
              disjunctIndex: _.fill(Array(n + 1), 0),
            },
          ],
        },
      ],
    } as any;
  };

  public selectSubSearchTerm = () => {
    const { range, disjunctIndex } = this._searchState as TermSelection;
    const newConjunctIndex = _.clone(disjunctIndex);
    newConjunctIndex.push(0); // TODO it is not null, we need to account for existing disjuncts

    this.searchState = _.assign({}, this._searchState, {
      kind: 'term-selection',
      termKind: ['nested-search'],
      state: {
        kind: 'range-selection',
        domain: range,
        ranges: this.rangesFor(range),
        conjunctIndex: newConjunctIndex,
      },
    });
  };

  public addConjunction = (baseConjunct: Model.Conjunct) => {
    const baseSearch = this.getSearchBaseForConjunct(this._search.get(), baseConjunct.conjunctIndex);
    const { domain, conjuncts } = baseSearch;
    const newConjunctIndex = _.clone(_.last(conjuncts).conjunctIndex);
    newConjunctIndex[newConjunctIndex.length - 1] = conjuncts.length;

    this.searchState = {
      kind: 'range-selection',
      domain: domain,
      ranges: this.rangesFor(domain),
      conjunctIndex: newConjunctIndex,
    };
  };

  public addDisjunction = (conjunct: Model.Conjunct) => {
    switch (conjunct.kind) {
      case Model.ConjunctKinds.Relation:
        this.addRelationDisjunction(conjunct);
        break;
      case Model.ConjunctKinds.Text:
        this.addTextDisjunction(conjunct);
        break;
    }
  };

  public removeConjunction = (conjunct: Model.Conjunct) => {
    const search = this.getSearchBaseForConjunct(this._search.get(), conjunct.conjunctIndex);
    search.conjuncts.splice(_.last(conjunct.conjunctIndex), 1);

    this.normalizeSearch(this._search.get());

    if (_.isEmpty(this._search.get().conjuncts)) {
      this.searchState = {
        kind: 'domain-selection',
        domains: this.domains(),
      };
      this.search = Maybe.Nothing<Model.Search>();
    } else {
      this.search = this._search;
    }
  };

  public removeDisjunct = (conjunct: Model.RelationConjunct, disjunct: Model.Disjunct) => {
    conjunct.disjuncts.splice(_.last(disjunct.disjunctIndex), 1);

    this.normalizeSearch(this._search.get());

    if (_.isEmpty(this._search.get().conjuncts)) {
      this.searchState = {
        kind: 'domain-selection',
        domains: this.domains(),
      };
      this.search = Maybe.Nothing<Model.Search>();
    } else {
      this.search = this._search;
    }
  };

  public resetEditMode = () => {
    if (this._search.isNothing) {
      this.searchState = {
        kind: 'domain-selection',
        domains: this.domains(),
      };
    } else {
      this.searchState = null;
    }
  };

  private normalizeSearch = (search: Model.Search) => {
    const conjuncts = _.reject(
      search.conjuncts,
      (conjunct) => _.isEmpty(conjunct.disjuncts) || _.isEmpty(this.removeNestedEmptyDisjuncts(conjunct.disjuncts))
    );

    this.updateConjunctIndexes(conjuncts);
    (this._search.get() as any).conjuncts = conjuncts;
    this.search = this._search;
  };

  private removeNestedEmptyDisjuncts = (disjuncts: Model.Disjuncts) => {
    return _.reject(disjuncts, (disjunct) => {
      if (disjunct.kind === Model.EntityDisjunctKinds.Search) {
        return _.isEmpty(disjunct.value.conjuncts) || this.isEmptyConjuncts(disjunct.value.conjuncts);
      }
      return false;
    });
  };

  private isEmptyConjuncts = (conjuncts: Model.Conjuncts): boolean =>
    _.every(conjuncts, (conjunct) => _.isEmpty(conjunct.disjuncts));

  private updateConjunctIndexes = (conjuncts: Model.Conjuncts, baseIndex: Array<number> = []) => {
    _.forEach(conjuncts, (conjunct, i) => {
      const conjunctIndex = _.clone(baseIndex);
      conjunctIndex.push(i);
      conjunct.conjunctIndex = conjunctIndex;
      _.forEach(conjunct.disjuncts, (disjunct, j) => {
        const disjunctIndex = _.clone(conjunctIndex);
        disjunctIndex.push(j as any);
        disjunct.disjunctIndex = disjunctIndex;
        if (disjunct.kind === 'search') {
          this.updateConjunctIndexes(disjunct.value.conjuncts, disjunctIndex);
        }
      });
    });
  };

  private addRelationDisjunction = (conjunct: Model.RelationConjunct) => {
    const { domain } = this._search.get();
    const { range, relation } = conjunct;

    this.searchState = {
      kind: 'term-selection',
      termKind: this.getRelationDisjunctKinds(relation),
      domain: domain,
      range: range,
      relation: relation,
      conjunctIndex: conjunct.conjunctIndex,
      disjunctIndex: this.newDisjunctIndex(conjunct),
    } as any;
  };

  private addTextDisjunction = (conjunct: Model.TextConjunct) => {
    const { domain } = this._search.get();
    const { range } = conjunct;

    this.searchState = {
      kind: 'text-term-selection',
      domain: domain,
      range: range,
      conjunctIndex: conjunct.conjunctIndex,
      disjunctIndex: this.newDisjunctIndex(conjunct),
    } as any;
  };

  private newDisjunctIndex = (conjunct: Model.Conjunct): Model.DisjunctIndex => {
    const newIndex = _.clone(conjunct.conjunctIndex);
    newIndex.push(conjunct.disjuncts.length);
    return newIndex;
  };

  private getSearchBaseForConjunct = (search: Model.Search, conjunctIndex: ConjunctIndex): Model.Search => {
    if (conjunctIndex.length <= 1) {
      return search;
    } else {
      const conjunct = search.conjuncts[conjunctIndex[0]];
      const disjunct = conjunct.disjuncts[conjunctIndex[1]] as Model.SearchDisjunct;
      if (disjunct) {
        return this.getSearchBaseForConjunct(disjunct.value, conjunctIndex.slice(2));
      } else {
        return null;
      }
    }
  };

  private getConjunctByIndex = (search: Model.Search, conjunctIndex: Array<number>) => {
    const baseSearch = this.getSearchBaseForConjunct(search, conjunctIndex);
    if (baseSearch) {
      return baseSearch.conjuncts[_.last(conjunctIndex)];
    } else {
      return null;
    }
  };
}
