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

import * as React from 'react';
import * as D from 'react-dom-factories';
import * as Maybe from 'data.maybe';
import * as _ from 'lodash';
import * as classnames from 'classnames';
import * as nlp from 'nlp_compromise';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import * as SparqlJs from 'sparqljs';

import { trigger } from 'platform/api/events';
import { Rdf, vocabularies } from 'platform/api/rdf';
import { QueryService } from 'platform/api/services/ldp-query';
import { SparqlUtil, SparqlClient, PatternBinder, VariableRenameBinder } from 'platform/api/sparql';
import { Component } from 'platform/api/components';
import { getOverlaySystem, OverlayDialog } from 'platform/components/ui/overlay';
import { AutoCompletionInput, AutoCompletionInputProps } from 'platform/components/ui/inputs';
import { isValidChild } from 'platform/components/utils';
import {
  TreeSelection,
  SemanticTreeInput,
  Node as TreeNode,
  createDefaultTreeQueries,
  LightwightTreePatterns,
  SemanticTreeInputProps,
} from 'platform/components/semantic/lazy-tree';

import * as Model from 'platform/components/semantic/search/data/search/Model';
import * as ModelUtils from 'platform/components/semantic/search/data/search/ModelUtils';
import {
  tryGetRelationPatterns,
  generateQueryForMultipleDatasets,
} from 'platform/components/semantic/search/data/search/SparqlQueryGenerator';
import {
  ResourceSelectorConfig,
  SemanticQueryBuilderConfig,
  SEMANTIC_SEARCH_VARIABLES,
  RESOURCE_SEGGESTIONS_VARIABLES,
  getConfigPatternForCategory,
  Resource as PatternResource,
  Text as PatternText,
  TreeSelectorConfig,
} from 'platform/components/semantic/search/config/SearchConfig';
import * as SearchDefaults from 'platform/components/semantic/search/config/Defaults';

import ItemSelector, { renderResource } from './ItemSelector';
import * as styles from './QueryBuilder.scss';
import {
  SearchStore,
  SearchState,
  DomainSelection,
  RangeSelection,
  RelationSelection,
  RelationTermSelection,
  ConjunctStep,
  ConjunctIndex,
  TermSelectionSearch,
  TextTermSelection,
  EditKinds,
  ExtendedDomainSelection,
  ExtendedRelationSelection,
  TermType,
} from './SearchStore';
import {
  SemanticSearchContext,
  InitialQueryContext,
} from 'platform/components/semantic/search/web-components/SemanticSearchApi';
import * as SearchEvents from 'platform/components/search/query-builder/SearchEvents';
import DateFormatSelector from '../date/DateFormatSelector';
import TextSelection from './TextSelection';
import SearchSummary from './SearchSummary';
import MapSelectionOverlay from './MapSelectionOverlay';
import { SelectType, SelectedArea } from './OLMapSelection';

const DEFAULT_TEXT_HELP_PAGE = Rdf.iri('http://help.researchspace.org/resource/SolrFullTextSearchSyntax');

/**
 * Assign unique id to search clause holders to facilitate integration testing.
 */
function SearchClause({ clause, id, children }: { id: string; clause: Model.Conjunct; children?: React.ReactNode }) {
  const generatedId = `${id}-searchClause-${clause.uniqueId}`;
  return (
    <div id={generatedId} className={styles.searchClause}>
      {children}
    </div>
  );
}

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 * @author Andrey Nikolov an@metaphacts.com
 * @author Alexey Morozov
 * @author Denis Ostapenko
 */
class QueryBuilder extends Component<SemanticQueryBuilderConfig, {}> {
  render() {
    return (
      <SemanticSearchContext.Consumer>
        {(context) => <QueryBuilderInner {...this.props} context={context} />}
      </SemanticSearchContext.Consumer>
    );
  }
}

interface InnerProps extends SemanticQueryBuilderConfig {
  context: InitialQueryContext;
}

interface State {
  store?: SearchStore;
  searchState?: SearchState;
  search?: Data.Maybe<Model.Search>;
  isSearchCollapsed?: boolean;
}

class QueryBuilderInner extends React.Component<InnerProps, State> {
  static defaultProps = {
    categoryViewTemplate: SearchDefaults.CategoryViewTemplate,
    relationViewTemplate: SearchDefaults.RelationViewTemplate,
    resourceSelector: {
      query: SearchDefaults.DefaultResourceSelectorQuery(),
      suggestionTupleTemplate: SearchDefaults.DefaultResourceSelectorSuggestionTemplate,
      noSuggestionsTemplate: SearchDefaults.DefaultResourceSelectorNoSuggestionsTemplate,
    },
    projectionVariable: 'subject',
    treeSelectorRelations: [],
    treeSelectorCategories: [],
  };

  constructor(props: InnerProps) {
    super(props);
    this.state = {
      store: null,
      searchState: null,
      search: Maybe.Nothing<Model.Search>(),
      isSearchCollapsed: false,
    };
  }

  componentDidMount() {
    if (this.props.context.searchProfileStore.isJust) {
      this.initSearch(this.props, this.props.context);
    }
  }

  componentWillReceiveProps(nextProps: InnerProps) {
    const { context: nextContext } = nextProps;
    if (!_.isEqual(nextContext, this.props.context)) {
      this.initSearch(nextProps, nextContext);
    }
  }

  private initSearch(props: InnerProps, context: InitialQueryContext) {
    context.searchProfileStore.map((profileStore) => {
      let searchStore = this.state.store;
      const isExtendedSearch = context.extendedSearch
        .map((esNew) => this.props.context.extendedSearch.map((esOld) => !_.isEqual(esOld, esNew)).getOrElse(true))
        .getOrElse(false);

      if (!searchStore || isExtendedSearch) {
        searchStore = new SearchStore(
          profileStore,
          context.baseConfig,
          props.projectionVariable,
          context.baseQueryStructure,
          context.extendedSearch
        );
        this.setState({ store: searchStore });

        searchStore.currentSearchState.onValue((currentState) => this.setState({ searchState: currentState }));
        searchStore.currentSearch.onValue((currentSearch) => {
          this.setState({ search: currentSearch });
          if (currentSearch.isJust) {
            this.props.context.setDomain(currentSearch.get().domain);
          }
          this.props.context.setBaseQueryStructure(currentSearch);
        });
        searchStore.currentSearchQuery.onValue(this.props.context.setBaseQuery);
      }
    });
  }

  private renderChild() {
    const { children } = this.props;
    if (!children) {
      return null;
    }
    const child = React.Children.only(children);
    if (!isValidChild(child)) {
      throw new Error('Expected a single component as a child');
    }
    const className = classnames(child.props.className, {
      invisible: !(this.state.searchState && this.state.searchState.kind === 'domain-selection'),
    });
    return React.cloneElement(child, { className });
  }

  render() {
    return (
      <div className={styles.searchAreaHolder}>
        {this.renderChild()}
        {this.renderSearchArea()}
        {this.state.search.isJust ? <hr /> : null}
      </div>
    );
  }

  private renderSearchArea() {
    if (this.state.search.isJust && this.props.context.searchProfileStore.isJust) {
      return this.renderSearch(this.state.search.get(), this.state.searchState);
    } else if (this.state.searchState && this.props.context.searchProfileStore.isJust) {
      return <div className={styles.searchArea}>{this.renderSearchState(this.state.searchState)}</div>;
    } else {
      return null;
    }
  }

  private renderSearchState(searchState: SearchState) {
    if (searchState.kind === 'domain-selection') {
      return (
        <div>
          {this.searchSummary()}
          {this.domainSelection(searchState)}
        </div>
      );
    } else if (searchState.kind === 'extended-domain-selection') {
      return this.renderExtendedDomainSelection(searchState as ExtendedDomainSelection);
    } else if (searchState.kind === 'extended-relation-selection') {
      return this.renderExtendedRelationSelection(searchState as ExtendedRelationSelection);
    } else {
      return <div className={styles.searchClauseArea}>{this.renderActiveSearchClause(searchState, false)}</div>;
    }
  }

  // pasive clause
  private renderSearch = (search: Model.Search, searchState: SearchState, isNested = false) => {
    let existingClauses = _(search.conjuncts)
      .map((conjunct) => [
        this.isActiveClause(conjunct.conjunctIndex, searchState as ConjunctStep)
          ? this.renderActiveSearchClause(searchState, false, conjunct as Model.RelationConjunct)
          : this.renderFullClause(search.domain, conjunct, searchState),
        <div className={styles.andSeparator}>AND</div>,
      ])
      .flatten()
      .initial()
      .value();
    if (this.isNewConjunct(search, searchState as ConjunctStep)) {
      existingClauses = existingClauses.concat([
        <div className={styles.andSeparator}>AND</div>,
        this.renderActiveSearchClause(searchState, false),
      ]);
    }

    const isSearchCollapsed = this.state.isSearchCollapsed;
    return (
      <div>
        {isNested ? null : this.searchSummary(search)}
        <div className={styles.searchArea} style={{ display: isSearchCollapsed ? 'none' : null }}>
          {existingClauses}
        </div>
      </div>
    );
  };

  private searchSummary = (search?: Model.Search) => {
    const isSearchCollapsed = this.state.isSearchCollapsed;
    return (
      <div className={styles.searchSummaryHolder}>
        {!_.isUndefined(search) ? (
          <i
            className={classnames({
              [styles.searchExpand]: isSearchCollapsed,
              [styles.searchCollapse]: !isSearchCollapsed,
            })}
            onClick={this.onSearchToggle}
          />
        ) : null}
        <SearchSummary search={search} />
      </div>
    );
  };

  private onSearchToggle = () => this.setState((state) => ({ isSearchCollapsed: !state.isSearchCollapsed }));

  private isNewConjunct(search: Model.Search, searchState?: ConjunctStep) {
    if (searchState) {
      return (
        _.head(search.conjuncts).conjunctIndex.length === searchState.conjunctIndex.length &&
        search.conjuncts.length <= _.last(searchState.conjunctIndex)
      );
    } else {
      return false;
    }
  }

  private isActiveClause(conjunctIndex: ConjunctIndex, searchState?: ConjunctStep) {
    if (searchState) {
      return _.isEqual(searchState.conjunctIndex, conjunctIndex);
    } else {
      return false;
    }
  }

  private renderFullClause = (domain: Model.Category, clause: Model.Conjunct, searchState: SearchState) =>
    Model.matchConjunct({
      Relation: (c) => this.renderRelationClause(domain, c, searchState),
      Text: (c) => this.renderTextClause(domain, c),
    })(clause);

  private renderRelationClause = (domain: Model.Category, clause: Model.RelationConjunct, searchState: SearchState) => (
    <div>
      <SearchClause id={this.props.context.baseConfig.id} clause={clause}>
        {this.renderDomain(domain)}
        {this.renderRelation(clause.relation, clause)}
        {this.renderRange(clause.range, clause)}
        {this.renderSimpleTerms(clause)}
        {this.addDisjunctionButton(clause)}
        {this.addConjunctionButton(clause)}
        {this.removeConjunctionButton(clause)}
      </SearchClause>
      {this.renderNestedTerms(clause.disjuncts, searchState)}
    </div>
  );

  private renderTextClause = (domain: Model.Category, clause: Model.TextConjunct) => (
    <div>
      <SearchClause id={this.props.context.baseConfig.id} clause={clause}>
        {this.renderDomain(domain)}
        {this.textSearchRelationPlaceholder()}
        {this.renderSimpleTerms(clause)}
        {this.addDisjunctionButton(clause)}
        {this.addConjunctionButton(clause)}
        {this.removeConjunctionButton(clause)}
      </SearchClause>
    </div>
  );

  private renderDomain = (category: Model.Category, isNested = false) => {
    const domainElement = renderResource(
      this.props.categoryViewTemplate,
      category,
      () => {
        /**/
      },
      styles.selectedDomain
    );
    return isNested
      ? this.withoutEdit(EditKinds.Domain)(domainElement)
      : this.withEdit(EditKinds.Domain)(domainElement);
  };

  private renderRange = (category: Model.Category, conjunct?: Model.Conjunct) =>
    this.withEdit(
      EditKinds.Range,
      conjunct
    )(
      renderResource(
        this.props.categoryViewTemplate,
        category,
        () => {
          /**/
        },
        styles.selectedRange
      )
    );

  private renderRelation = (relation: Model.Relation, conjunct?: Model.Conjunct) =>
    this.withEdit(
      EditKinds.Relation,
      conjunct
    )(
      renderResource(
        this.props.relationViewTemplate,
        relation,
        () => {
          /**/
        },
        styles.selectedRelation
      )
    );

  private renderSimpleTerms = (conjunct: Model.Conjunct) =>
    _.filter<Model.Disjunct>(conjunct.disjuncts, (term) => term.kind !== Model.EntityDisjunctKinds.Search).map(
      this.renderSimpleTerm(conjunct)
    );

  private renderSimpleTerm = (conjunct: Model.Conjunct) => (disjunct: Model.Disjunct) =>
    this.withEdit(
      EditKinds.Disjunct,
      conjunct,
      disjunct
    )(<div className={styles.selectedTerm}>{ModelUtils.disjunctToString(disjunct)}</div>);

  private renderNestedTerms = (terms: Model.Disjuncts, searchState: SearchState) =>
    terms.map((term) => this.renderNestedTerm(term, searchState));

  private renderNestedTerm = (term: Model.Disjunct, searchState: SearchState) => {
    switch (term.kind) {
      case Model.EntityDisjunctKinds.Search:
        return this.renderNestedSearch(term, searchState);
    }
  };

  private renderNestedSearch = (term: Model.SearchDisjunct, searchState: SearchState) => {
    return (
      <div className={styles.nestedSearchHolder}>
        <div className={styles.whereSeparator}>WHERE</div>
        {this.renderSearch(term.value, searchState, true)}
      </div>
    );
  };

  private addDisjunctionButton = (conjunct: Model.Conjunct) => (
    <div
      className={styles.addDisjunctButton}
      onClick={(e) => {
        this.state.store.addDisjunction(conjunct);
        trigger({ eventType: SearchEvents.SearchOrDisjunctSelected, source: this.props.id });
      }}
    >
      or
    </div>
  );

  private addConjunctionButton = (conjunct: Model.Conjunct) => (
    <div
      className={styles.addConjunctButton}
      onClick={(e) => {
        this.state.store.addConjunction(conjunct);
        trigger({ eventType: SearchEvents.SearchAndConjunctSelected, source: this.props.id });
      }}
    >
      and
    </div>
  );

  private removeConjunctionButton = (conjunct: Model.Conjunct) => (
    <button
      className={classnames('btn', 'btn-link', styles.removeConjunctButton)}
      onClick={(e) => this.state.store.removeConjunction(conjunct)}
    >
      remove
    </button>
  );

  private removeActiveConjunctionButton = () => (
    <button
      className={classnames('btn', 'btn-link', styles.removeConjunctButton)}
      onClick={(e) => this.state.store.resetEditMode()}
    >
      cancel
    </button>
  );

  private withEdit = (editKind: EditKinds, conjunct?: Model.Conjunct, disjunct?: Model.Disjunct) => (
    element: React.ReactElement<any>
  ) => (
    <div className={styles.itemHolder}>
      {element}
      <span
        className={classnames('fa fa-times-circle fa-lg', styles.editButton)}
        onClick={() => this.state.store.edit(editKind, conjunct as any, disjunct)}
      />
    </div>
  );

  private withoutEdit = (editKind: EditKinds, conjunct?: Model.Conjunct, disjunct?: Model.Disjunct) => (
    element: React.ReactElement<any>
  ) => <div className={styles.itemHolder}>{element}</div>;

  // active clasue
  private renderExtendedDomainSelection = (searchState: ExtendedDomainSelection) => (
    <div className={styles.searchClause}>
      {this.categorySelection(
        searchState.domains,
        styles.domainSelection,
        this.state.store.selectExtendedDomain,
        'search domain category selection'
      )}
      {this.relationSelectorPlaceholder()}
      {this.renderRange(searchState.range, null)}
      {this.renderSimpleTerm(null)(searchState.disjunct)}
      {this.removeActiveConjunctionButton()}
    </div>
  );

  private renderExtendedRelationSelection = (searchState: ExtendedRelationSelection) => (
    <div className={styles.searchClause}>
      {this.renderDomain(searchState.domain)}
      {this.relationSelector(searchState.relations, this.state.store.selectExtendedRelation)}
      {this.renderRange(searchState.range, null)}
      {this.renderSimpleTerm(null)(searchState.disjunct)}
      {this.removeActiveConjunctionButton()}
    </div>
  );

  private renderActiveSearchClause(searchState: SearchState, isNestedSearch: boolean, clause?: Model.Conjunct) {
    switch (searchState.kind) {
      case 'range-selection':
        return this.rangeSelection(searchState, isNestedSearch);
      case 'relation-selection':
        return this.relationSelection(searchState, isNestedSearch);
      case 'term-selection':
        return this.termSelection(searchState, isNestedSearch, clause as Model.RelationConjunct);
      case 'text-term-selection':
        return this.textTermSelection(searchState, clause as Model.TextConjunct, isNestedSearch);
    }
  }

  private domainSelection(searchState: DomainSelection) {
    return this.categorySelection(
      searchState.domains,
      styles.domainSelection,
      this.state.store.selectDomain,
      'search domain category selection'
    );
  }

  private rangeSelection(searchState: RangeSelection, isNesteadSearch: boolean) {
    return D.div(
      { className: styles.searchClause },
      this.renderDomain(searchState.domain, isNesteadSearch),
      this.relationSelectorPlaceholder(),
      this.categorySelection(
        searchState.ranges,
        styles.rangeSelection,
        this.state.store.selectRange,
        'search range category selection'
      ),
      this.removeActiveConjunctionButton()
    );
  }

  private relationSelection = (searchState: RelationSelection, isNestedSearch: boolean) => (
    <div className={styles.searchClause}>
      {this.renderDomain(searchState.domain, isNestedSearch)}
      {this.relationSelector(searchState.relations, this.state.store.selectRelation)}
      {this.renderRange(searchState.range)}
      {this.removeActiveConjunctionButton()}
    </div>
  );

  private termSelection(state: RelationTermSelection, isNestedSearch: boolean, clause?: Model.RelationConjunct) {
    return [
      <div className={styles.searchClauseHolder}>
        <div className={styles.searchClause}>
          {this.renderDomain(state.domain, isNestedSearch)}
          {this.renderRelation(state.relation, clause)}
          {this.renderRange(state.range, clause)}
          {clause ? this.renderSimpleTerms(clause) : null}
          {this.removeActiveConjunctionButton()}
        </div>
        <div className={styles.activeTerm}>{this.termSelector(state, isNestedSearch)}</div>
        {clause ? this.renderNestedTerms(clause.disjuncts, state) : null}
      </div>,
    ];
  }

  private textTermSelection(state: TextTermSelection, clause?: Model.TextConjunct, isNestedSearch?: boolean) {
    return [
      <div className={styles.searchClauseHolder}>
        <div className={styles.searchClause}>
          {this.renderDomain(state.domain, isNestedSearch)}
          {this.textSearchRelationPlaceholder()}
          {clause ? this.renderSimpleTerms(clause) : null}
          {this.removeActiveConjunctionButton()}
        </div>
        <div className={styles.activeTerm}>{this.textDisjunctSelector(state)}</div>
      </div>,
    ];
  }

  private textSearchRelationPlaceholder = () => <div className={styles.relationPlaceholder}>... text search ...</div>;

  private termSelector(searchState: RelationTermSelection, isNestedSearch: boolean) {
    if (_.includes(searchState.termKind, 'nested-search')) {
      return this.nestedSearch(searchState as any);
    } else if (_.includes(searchState.termKind, 'date-range')) {
      return <div className={styles.searchBasedTermSelectorHolder}>{this.dateTermSelector(searchState)}</div>;
    } else {
      const rangeLabel = searchState.range.label;
      const label = `Find ${nlp.noun(rangeLabel).article()} ${rangeLabel}: `;
      return (
        <div className={styles.searchBasedTermSelectorHolder}>
          <div className={styles.searchBasedTermSelector}>
            <span className={styles.searchBasedTermSelectorLabel}>{label}</span>
            {this.searchBasedTermSelector(searchState)}
            {_.includes(searchState.termKind, 'place') ? this.placeTermSelector(searchState) : null}
            {isNestedSearch ? null : this.nestedSearchButton(searchState.range)}
          </div>
        </div>
      );
    }
  }

  private textDisjunctSelector = (searchState: TextTermSelection) => {
    const sCategoryIri = searchState.range.iri.toString();
    const patternConfig = getConfigPatternForCategory(
      this.props.context.baseConfig,
      searchState.range.iri
    ) as PatternText;
    const helpPageIRI =
      patternConfig && patternConfig.helpPage
        ? Rdf.fullIri(patternConfig.helpPage)
        : patternConfig && patternConfig.escapeLuceneSyntax === false
        ? DEFAULT_TEXT_HELP_PAGE
        : undefined;
    return (
      <div className={styles.searchBasedTermSelectorHolder}>
        <TextSelection onSelect={this.onTextTermSelect} helpPage={helpPageIRI} />
      </div>
    );
  };

  private onTextTermSelect = (text: string) => {
    this.state.store.selectTerm('text')(text);
  };

  private searchBasedTermSelector(searchState: RelationTermSelection) {
    if (_.includes(searchState.termKind, 'hierarchy')) {
      return this.hierarchyTermSelector(searchState);
    } else {
      return this.resourceTermSelector(searchState);
    }
  }

  private nestedSearch(searhState: TermSelectionSearch) {
    return (
      <div className={styles.nestedSearchHolder}>
        <div className={styles.whereSeparator}>WHERE</div>
        {this.renderActiveSearchClause(searhState.state, true)}
      </div>
    );
  }

  private resourceTermSelector = (searchState: RelationTermSelection) => {
    return (
      <AutoCompletionInput
        className={styles.resourceSelector}
        {...this.prepareAutoCompletionInputConfig(searchState)}
      />
    );
  };

  private placeTermSelector = (searchState: RelationTermSelection) => {
    const tooltip = <Tooltip>Search for places by map region</Tooltip>;
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <button
          className={classnames('btn btn-default', styles.mapSelectionButton)}
          onClick={this.showMapSelection}
        ></button>
      </OverlayTrigger>
    );
  };

  private showMapSelection = () => {
    const dialogKey = 'map-selection';
    const onHide = () => getOverlaySystem().hide(dialogKey);
    getOverlaySystem().show(
      dialogKey,
      <OverlayDialog show={true} type="lightbox" title="Set selection on map" onHide={onHide}>
        <MapSelectionOverlay
          suggestionConfig={this.props.geoSelector}
          onCancel={onHide}
          onSelect={this.onSearchAreaSelected}
        />
      </OverlayDialog>
    );
  };

  private onSearchAreaSelected = (area: SelectedArea) => {
    switch (area.type) {
      case SelectType.Box:
        this.state.store.selectTerm('place')(area.box);
        break;
      case SelectType.Circle:
        this.state.store.selectTerm('place')(area.circle);
        break;
    }
    getOverlaySystem().hide('map-selection');
  };

  private hierarchyTermSelector = (searchState: RelationTermSelection) => {
    return (
      <SemanticTreeInput
        className={styles.hierarchySelector}
        {...this.prepareHierarchySelectorInputConfig(searchState)}
      />
    );
  };

  private dateTermSelector = (searchState: RelationTermSelection) => {
    const { id: source } = this.props;
    return (
      <DateFormatSelector
        onSelect={(value) => {
          this.state.store.selectTerm('date-range')(value);
          trigger({ eventType: SearchEvents.SearchDateFormatSubmitted, source });
        }}
        onOpen={() => trigger({ eventType: SearchEvents.SearchSelectDateFormatOpened, source })}
        onChange={(value) => trigger({ eventType: SearchEvents.SearchDateFormatSelected, source, data: value })}
      />
    );
  };

  private droppableConfig = (searchState: RelationTermSelection) => {
    // TODO expose type check query
    return {
      query: this.setClauseBindings(
        searchState,
        `
        ASK {
          {
            ?value a|<http://www.wikidata.org/prop/direct/P31> $__range__ .
          } UNION {
            ?value a ${vocabularies.VocabPlatform.Set} .
          } UNION {
            ?value a sp:Query .
          }
        }
      `
      ),
      styles: {
        enabled: { border: 'solid 1px green' },
        disabled: { border: 'solid 1px red' },
      },
      components: {
        disabledHover: <span>{searchState.range.label}, any set or saved search is required</span>,
      },
    };
  };

  private prepareHierarchySelectorInputConfig(searchState: RelationTermSelection): SemanticTreeInputProps {
    const selectorPatterns = this.getTreeSelectorConfigForRelation(searchState.relation);
    const hierarchySelectorConfig = this.isLightweightTreeConfig(selectorPatterns)
      ? createDefaultTreeQueries(selectorPatterns)
      : selectorPatterns;
    return _.assign(_.cloneDeep(hierarchySelectorConfig), {
      rootsQuery: this.multiDatasetQuery(searchState, hierarchySelectorConfig.rootsQuery),
      childrenQuery: this.multiDatasetQuery(searchState, hierarchySelectorConfig.childrenQuery),
      parentsQuery: this.multiDatasetQuery(searchState, hierarchySelectorConfig.parentsQuery),
      searchQuery: this.multiDatasetQuery(searchState, hierarchySelectorConfig.searchQuery),
      droppable: this.droppableConfig(searchState),
      onSelectionChanged: (selection: TreeSelection<TreeNode>) => {
        const nodes = TreeSelection.leafs(selection);
        if (nodes.size === 0) {
          return;
        }
        const { iri, label } = nodes.first();
        this.selectResourceTerm('hierarchy')(iri, label.value, label.value, {});
        trigger({
          eventType: SearchEvents.SearchTreeInputSelected,
          source: this.props.id,
          data: iri.value,
        });
      },
      allowForceSuggestion: true,
    });
  }

  private multiDatasetQuery(searchState: RelationTermSelection, query: string) {
    return SparqlUtil.serializeQuery(
      generateQueryForMultipleDatasets(
        this.setClauseBindingsParsed(searchState, query),
        this.props.context.selectedDatasets,
        this.props.context.baseConfig.datasetsConfig
      )
    );
  }

  private prepareAutoCompletionInputConfig(searchState: RelationTermSelection): AutoCompletionInputProps {
    const {
      query,
      defaultQuery,
      noSuggestionsTemplate,
      suggestionTupleTemplate,
      escapeLuceneSyntax,
    } = this.getResourceSelectorConfigForRelation(searchState.relation);
    return {
      query: this.multiDatasetQuery(searchState, query),
      defaultQuery: defaultQuery ? this.multiDatasetQuery(searchState, defaultQuery) : undefined,
      droppable: this.droppableConfig(searchState),
      templates: {
        empty: noSuggestionsTemplate,
        suggestion: suggestionTupleTemplate,
        displayKey: (binding) => binding[RESOURCE_SEGGESTIONS_VARIABLES.SUGGESTION_LABEL].value,
      },
      valueBindingName: RESOURCE_SEGGESTIONS_VARIABLES.SUGGESTION_IRI,
      labelBindingName: RESOURCE_SEGGESTIONS_VARIABLES.SUGGESTION_LABEL,
      searchTermVariable: RESOURCE_SEGGESTIONS_VARIABLES.SEARCH_TERM_VAR,
      actions: {
        onSelected: (binding) =>
          this.selectResourceTerm('resource')(
            binding[RESOURCE_SEGGESTIONS_VARIABLES.SUGGESTION_IRI] as Rdf.Iri,
            binding[RESOURCE_SEGGESTIONS_VARIABLES.SUGGESTION_LABEL].value,
            binding[RESOURCE_SEGGESTIONS_VARIABLES.SUGGESTION_LABEL].value,
            binding
          ),
      },
      escapeLuceneSyntax: escapeLuceneSyntax,
      allowForceSuggestion: true,
    };
  }

  private selectResourceTerm = (type: TermType) => (iri: Rdf.Iri, label: string, description: string, tuple?: any) => {
    if (_.includes(iri.value, 'container/queryContainer')) {
      QueryService()
        .getQuery(iri)
        .onValue((query) =>
          this.state.store.selectTerm(type)({
            query: SparqlUtil.parseQuerySync(query.value),
            label: query.label,
          })
        );
    } else {
      this.state.store.selectTerm(type)({
        iri: iri,
        label: label,
        description: description,
        tuple: tuple,
      });
    }
  };

  private setClauseBindingsParsed(searchState: RelationTermSelection, query: string): SparqlJs.SelectQuery {
    const parsedQuery = SparqlUtil.parseQuery<SparqlJs.SelectQuery>(query);

    // try to extract pattern from relation or category range
    const resourcePatternConfig = tryGetRelationPatterns(this.props.context.baseConfig, searchState.relation).find(
      (p) => p.kind === 'resource'
    ) as PatternResource;

    // parametrize query with found pattern or fallback to default one,
    // which just uses pattern IRI
    let patterns: SparqlJs.Pattern[];
    if (resourcePatternConfig) {
      patterns = SparqlUtil.parsePatterns(resourcePatternConfig.queryPattern, parsedQuery.prefixes);
      // transform pattern to resource suggestion
      const renamer = new VariableRenameBinder(
        SEMANTIC_SEARCH_VARIABLES.RESOURCE_VAR,
        RESOURCE_SEGGESTIONS_VARIABLES.SUGGESTION_IRI
      );
      patterns.forEach((p) => renamer.pattern(p));
    } else {
      patterns = SparqlUtil.parsePatterns(SearchDefaults.DefaultResourceSelectorRelationPattern, parsedQuery.prefixes);
    }
    new PatternBinder(SEMANTIC_SEARCH_VARIABLES.RELATION_PATTERN_VAR, patterns).sparqlQuery(parsedQuery);

    const bindings = _.assign(
      {
        [SEMANTIC_SEARCH_VARIABLES.RELATION_VAR]: searchState.relation.iri,
        [SEMANTIC_SEARCH_VARIABLES.DOMAIN_VAR]: searchState.domain.iri,
        [SEMANTIC_SEARCH_VARIABLES.RANGE_VAR]: searchState.range.iri,
      },
      {
        [SEMANTIC_SEARCH_VARIABLES.SELECTED_ALIGNMENT]: this.props.context.selectedAlignment
          .map((a) => a.iri)
          .getOrElse(undefined),
      }
    );

    return SparqlClient.setBindings(parsedQuery, bindings);
  }

  private setClauseBindings(searchState: RelationTermSelection, query: string): string {
    return SparqlUtil.serializeQuery(this.setClauseBindingsParsed(searchState, query));
  }

  private relationSelector(relations: Model.Relations, action: (relation: Model.Relation) => void) {
    return (
      <ItemSelector
        mode={this.props.context.baseConfig.selectorMode}
        tupleTemplate={this.props.relationViewTemplate}
        resources={relations.mapKeys((key) => key.value.iri).toOrderedMap()}
        className={styles.relationSelector}
        label="search relation selection"
        actions={{
          selectResource: (relation) => {
            action(relation as Model.Relation);
            trigger({
              eventType: SearchEvents.CategoryOrRelationSelected,
              source: this.props.id,
              data: relation.iri.value,
            });
          },
        }}
      />
    );
  }

  private relationSelectorPlaceholder = () => <div className={styles.relationPlaceholder}>... related to</div>;

  private categorySelection = (
    categories: Model.Categories,
    className: string,
    action: (category: Model.Category) => void,
    label: string
  ) => (
    <ItemSelector
      mode={this.props.context.baseConfig.selectorMode}
      tupleTemplate={this.props.categoryViewTemplate}
      resources={categories}
      className={className}
      itemClassName={styles.categorySelectionItem}
      label={label}
      actions={{
        selectResource: (category) => {
          action(category);
          trigger({
            eventType: SearchEvents.CategoryOrRelationSelected,
            source: this.props.id,
            data: category.iri.value,
          });
        },
      }}
    />
  );

  private nestedSearchButton = (category: Model.Category) => {
    const tooltip = <Tooltip>Search for {nlp.noun(category.label).pluralize()} related to...</Tooltip>;
    return (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <button
          className={classnames('btn btn-default', styles.nestedSearchButton)}
          onClick={this.state.store.selectSubSearchTerm}
        >
          <span style={{ position: category.thumbnail ? 'absolute' : 'relative' }} className={styles.magnifierIcon} />
          {category.thumbnail ? <img src={category.thumbnail} /> : null}
        </button>
      </OverlayTrigger>
    );
  };

  private getTreeSelectorConfigForRelation = (relation: Model.Relation) => {
    const { treeSelectorRelations, treeSelector, treeSelectorCategories } = this.props;
    if (_.has(treeSelectorRelations, relation.iri.toString())) {
      return treeSelectorRelations[relation.iri.toString()];
    } else if (_.has(treeSelectorCategories, relation.hasRange.iri.toString())) {
      return treeSelectorCategories[relation.hasRange.iri.toString()];
    } else {
      return treeSelector;
    }
  };

  private isLightweightTreeConfig(config: TreeSelectorConfig): config is LightwightTreePatterns {
    return !_.has(config, 'rootsQuery');
  }

  private getResourceSelectorConfigForRelation = (relation: Model.Relation) => {
    const { resourceSelector, resourceSelectorRelations, resourceSelectorCategories } = this.props;
    if (_.has(resourceSelectorRelations, relation.iri.toString())) {
      return resourceSelectorRelations[relation.iri.toString()];
    } else if (_.has(resourceSelectorCategories, relation.hasRange.iri.toString())) {
      return resourceSelectorCategories[relation.hasRange.iri.toString()];
    } else {
      return resourceSelector;
    }
  };
}

export default QueryBuilder;
