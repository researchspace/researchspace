Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var React = require("react");
var Maybe = require("data.maybe");
var _ = require("lodash");
var classnames = require("classnames");
var nlp = require("nlp_compromise");
var react_bootstrap_1 = require("react-bootstrap");
var rdf_1 = require("platform/api/rdf");
var ldp_query_1 = require("platform/api/services/ldp-query");
var sparql_1 = require("platform/api/sparql");
var components_1 = require("platform/api/components");
var overlay_1 = require("platform/components/ui/overlay");
var inputs_1 = require("platform/components/ui/inputs");
var lazy_tree_1 = require("platform/components/semantic/lazy-tree");
var Model = require("platform/components/semantic/search/data/search/Model");
var ModelUtils = require("platform/components/semantic/search/data/search/ModelUtils");
var SparqlQueryGenerator_1 = require("platform/components/semantic/search/data/search/SparqlQueryGenerator");
var SearchConfig_1 = require("platform/components/semantic/search/config/SearchConfig");
var SearchDefaults = require("platform/components/semantic/search/config/Defaults");
var ItemSelector_1 = require("./ItemSelector");
var styles = require("./QueryBuilder.scss");
var SearchStore_1 = require("./SearchStore");
var SemanticSearchApi_1 = require("platform/components/semantic/search/web-components/SemanticSearchApi");
var DateFormatSelector_1 = require("../date/DateFormatSelector");
var TextSelection_1 = require("./TextSelection");
var SearchSummary_1 = require("./SearchSummary");
var MapSelectionOverlay_1 = require("./MapSelectionOverlay");
var OLMapSelection_1 = require("./OLMapSelection");
var DEFAULT_TEXT_HELP_PAGE = rdf_1.Rdf.iri("http://help.metaphacts.com/resource/SolrFullTextSearchSyntax");
function SearchClause(_a) {
    var clause = _a.clause, id = _a.id, children = _a.children;
    var generatedId = id + "-searchClause-" + clause.uniqueId;
    return React.createElement("div", { id: generatedId, className: styles.searchClause }, children);
}
var QueryBuilder = (function (_super) {
    tslib_1.__extends(QueryBuilder, _super);
    function QueryBuilder(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.renderSearch = function (search, searchState, isNested) {
            if (isNested === void 0) { isNested = false; }
            var existingClauses = _(search.conjuncts).map(function (conjunct) { return [
                _this.isActiveClause(conjunct.conjunctIndex, searchState) ?
                    _this.renderActiveSearchClause(searchState, false, conjunct) :
                    _this.renderFullClause(search.domain, conjunct, searchState),
                React.createElement("div", { className: styles.andSeparator }, "AND"),
            ]; }).flatten().initial().value();
            if (_this.isNewConjunct(search, searchState)) {
                existingClauses = existingClauses.concat([
                    React.createElement("div", { className: styles.andSeparator }, "AND"),
                    _this.renderActiveSearchClause(searchState, false),
                ]);
            }
            var isSearchCollapsed = _this.state.isSearchCollapsed;
            return React.createElement("div", null,
                isNested ? null : _this.searchSummary(search),
                React.createElement("div", { className: styles.searchArea, style: { display: isSearchCollapsed ? 'none' : null } }, existingClauses));
        };
        _this.searchSummary = function (search) {
            var isSearchCollapsed = _this.state.isSearchCollapsed;
            return React.createElement("div", { className: styles.searchSummaryHolder },
                !_.isUndefined(search) ? React.createElement("i", { className: classnames((_a = {},
                        _a[styles.searchExpand] = isSearchCollapsed,
                        _a[styles.searchCollapse] = !isSearchCollapsed,
                        _a)), onClick: _this.onSearchToggle }) : null,
                React.createElement(SearchSummary_1.default, { search: search }));
            var _a;
        };
        _this.onSearchToggle = function () {
            return _this.setState(function (state) { return ({ isSearchCollapsed: !state.isSearchCollapsed }); });
        };
        _this.renderFullClause = function (domain, clause, searchState) {
            return Model.matchConjunct({
                Relation: function (c) { return _this.renderRelationClause(domain, c, searchState); },
                Text: function (c) { return _this.renderTextClause(domain, c); },
            })(clause);
        };
        _this.renderRelationClause = function (domain, clause, searchState) {
            return React.createElement("div", null,
                React.createElement(SearchClause, { id: _this.context.baseConfig.id, clause: clause },
                    _this.renderDomain(domain),
                    _this.renderRelation(clause.relation, clause),
                    _this.renderRange(clause.range, clause),
                    _this.renderSimpleTerms(clause),
                    _this.addDisjunctionButton(clause),
                    _this.addConjunctionButton(clause),
                    _this.removeConjunctionButton(clause)),
                _this.renderNestedTerms(clause.disjuncts, searchState));
        };
        _this.renderTextClause = function (domain, clause) {
            return React.createElement("div", null,
                React.createElement(SearchClause, { id: _this.context.baseConfig.id, clause: clause },
                    _this.renderDomain(domain),
                    _this.textSearchRelationPlaceholder(),
                    _this.renderSimpleTerms(clause),
                    _this.addDisjunctionButton(clause),
                    _this.addConjunctionButton(clause),
                    _this.removeConjunctionButton(clause)));
        };
        _this.renderDomain = function (category, isNested) {
            if (isNested === void 0) { isNested = false; }
            var domainElement = ItemSelector_1.renderResource(_this.props.categoryViewTemplate, category, function () { }, styles.selectedDomain);
            return isNested ? _this.withoutEdit(SearchStore_1.EditKinds.Domain)(domainElement) : _this.withEdit(SearchStore_1.EditKinds.Domain)(domainElement);
        };
        _this.renderRange = function (category, conjunct) {
            return _this.withEdit(SearchStore_1.EditKinds.Range, conjunct)(ItemSelector_1.renderResource(_this.props.categoryViewTemplate, category, function () { }, styles.selectedRange));
        };
        _this.renderRelation = function (relation, conjunct) {
            return _this.withEdit(SearchStore_1.EditKinds.Relation, conjunct)(ItemSelector_1.renderResource(_this.props.relationViewTemplate, relation, function () { }, styles.selectedRelation));
        };
        _this.renderSimpleTerms = function (conjunct) {
            return _.filter(conjunct.disjuncts, function (term) { return term.kind !== Model.EntityDisjunctKinds.Search; }).map(_this.renderSimpleTerm(conjunct));
        };
        _this.renderSimpleTerm = function (conjunct) { return function (disjunct) {
            return _this.withEdit(SearchStore_1.EditKinds.Disjunct, conjunct, disjunct)(React.createElement("div", { className: styles.selectedTerm }, ModelUtils.disjunctToString(disjunct)));
        }; };
        _this.renderNestedTerms = function (terms, searchState) {
            return terms.map(function (term) { return _this.renderNestedTerm(term, searchState); });
        };
        _this.renderNestedTerm = function (term, searchState) {
            switch (term.kind) {
                case Model.EntityDisjunctKinds.Search: return _this.renderNestedSearch(term, searchState);
            }
        };
        _this.renderNestedSearch = function (term, searchState) {
            return React.createElement("div", { className: styles.nestedSearchHolder },
                React.createElement("div", { className: styles.whereSeparator }, "WHERE"),
                _this.renderSearch(term.value, searchState, true));
        };
        _this.addDisjunctionButton = function (conjunct) {
            return React.createElement("div", { className: styles.addDisjunctButton, onClick: function (e) { return _this.state.store.addDisjunction(conjunct); } }, "or");
        };
        _this.addConjunctionButton = function (conjunct) {
            return React.createElement("div", { className: styles.addConjunctButton, onClick: function (e) { return _this.state.store.addConjunction(conjunct); } }, "and");
        };
        _this.removeConjunctionButton = function (conjunct) {
            return React.createElement("button", { className: classnames('btn', 'btn-link', styles.removeConjunctButton), onClick: function (e) { return _this.state.store.removeConjunction(conjunct); } }, "remove");
        };
        _this.removeActiveConjunctionButton = function () {
            return React.createElement("button", { className: classnames('btn', 'btn-link', styles.removeConjunctButton), onClick: function (e) { return _this.state.store.resetEditMode(); } }, "cancel");
        };
        _this.withEdit = function (editKind, conjunct, disjunct) {
            return function (element) {
                return React.createElement("div", { className: styles.itemHolder },
                    element,
                    React.createElement("span", { className: classnames('fa fa-times-circle fa-lg', styles.editButton), onClick: function () { return _this.state.store.edit(editKind, conjunct, disjunct); } }));
            };
        };
        _this.withoutEdit = function (editKind, conjunct, disjunct) {
            return function (element) {
                return React.createElement("div", { className: styles.itemHolder }, element);
            };
        };
        _this.renderExtendedDomainSelection = function (searchState) {
            return React.createElement("div", { className: styles.searchClause },
                _this.categorySelection(searchState.domains, styles.domainSelection, _this.state.store.selectExtendedDomain, 'search domain category selection'),
                _this.relationSelectorPlaceholder(),
                _this.renderRange(searchState.range, null),
                _this.renderSimpleTerm(null)(searchState.disjunct),
                _this.removeActiveConjunctionButton());
        };
        _this.renderExtendedRelationSelection = function (searchState) {
            return React.createElement("div", { className: styles.searchClause },
                _this.renderDomain(searchState.domain),
                _this.relationSelector(searchState.relations, _this.state.store.selectExtendedRelation),
                _this.renderRange(searchState.range, null),
                _this.renderSimpleTerm(null)(searchState.disjunct),
                _this.removeActiveConjunctionButton());
        };
        _this.relationSelection = function (searchState, isNestedSearch) {
            return React.createElement("div", { className: styles.searchClause },
                _this.renderDomain(searchState.domain, isNestedSearch),
                _this.relationSelector(searchState.relations, _this.state.store.selectRelation),
                _this.renderRange(searchState.range),
                _this.removeActiveConjunctionButton());
        };
        _this.textSearchRelationPlaceholder = function () {
            return React.createElement("div", { className: styles.relationPlaceholder }, "... text search ...");
        };
        _this.textDisjunctSelector = function (searchState) {
            var sCategoryIri = searchState.range.iri.toString();
            var patternConfig = SearchConfig_1.getConfigPatternForCategory(_this.context.baseConfig, searchState.range.iri);
            var helpPageIRI = (patternConfig && patternConfig.helpPage)
                ? rdf_1.Rdf.fullIri(patternConfig.helpPage)
                : (patternConfig && (patternConfig.escapeLuceneSyntax === false))
                    ? DEFAULT_TEXT_HELP_PAGE
                    : undefined;
            return React.createElement("div", { className: styles.searchBasedTermSelectorHolder },
                React.createElement(TextSelection_1.default, { onSelect: _this.onTextTermSelect, helpPage: helpPageIRI }));
        };
        _this.onTextTermSelect = function (text) {
            _this.state.store.selectTerm('text')(text);
        };
        _this.resourceTermSelector = function (searchState) {
            return React.createElement(inputs_1.AutoCompletionInput, tslib_1.__assign({ className: styles.resourceSelector }, _this.prepareAutoCompletionInputConfig(_this.props.resourceSelector, searchState)));
        };
        _this.placeTermSelector = function (searchState) {
            var tooltip = React.createElement(react_bootstrap_1.Tooltip, null, "Search for places by map region");
            return React.createElement(react_bootstrap_1.OverlayTrigger, { placement: 'bottom', overlay: tooltip },
                React.createElement("button", { className: classnames('btn btn-default', styles.mapSelectionButton), onClick: _this.showMapSelection }));
        };
        _this.showMapSelection = function () {
            var dialogKey = 'map-selection';
            var onHide = function () { return overlay_1.getOverlaySystem().hide(dialogKey); };
            overlay_1.getOverlaySystem().show(dialogKey, React.createElement(overlay_1.OverlayDialog, { show: true, type: 'lightbox', title: 'Set selection on map', onHide: onHide },
                React.createElement(MapSelectionOverlay_1.default, { suggestionConfig: _this.props.geoSelector, onCancel: onHide, onSelect: _this.onSearchAreaSelected })));
        };
        _this.onSearchAreaSelected = function (area) {
            switch (area.type) {
                case OLMapSelection_1.SelectType.Box:
                    _this.state.store.selectTerm('place')(area.box);
                    break;
                case OLMapSelection_1.SelectType.Circle:
                    _this.state.store.selectTerm('place')(area.circle);
                    break;
            }
            overlay_1.getOverlaySystem().hide('map-selection');
        };
        _this.hierarchyTermSelector = function (searchState) {
            return React.createElement(lazy_tree_1.SemanticTreeInput, tslib_1.__assign({ className: styles.hierarchySelector }, _this.prepareHierarchySelectorInputConfig(_this.props.treeSelector, searchState)));
        };
        _this.dateTermSelector = function (searchState) {
            return React.createElement(DateFormatSelector_1.default, { onSelect: _this.state.store.selectTerm('date-range') });
        };
        _this.droppableConfig = function (searchState) {
            return {
                query: _this.setClauseBindings(searchState, "\n        ASK {\n          {\n            ?value a|<http://www.wikidata.org/prop/direct/P31> $__range__ .\n          } UNION {\n            ?value a " + rdf_1.vocabularies.VocabPlatform.Set + " .\n          } UNION {\n            ?value a sp:Query .\n          }\n        }\n      "),
                styles: {
                    enabled: { border: 'solid 1px green' },
                    disabled: { border: 'solid 1px red' },
                },
                components: {
                    disabledHover: React.createElement("span", null,
                        searchState.range.label,
                        ", any set or saved search is required"),
                },
            };
        };
        _this.selectResourceTerm = function (type) { return function (iri, label, description, tuple) {
            if (_.includes(iri.value, 'container/queryContainer')) {
                ldp_query_1.QueryService().getQuery(iri).onValue(function (query) { return _this.state.store.selectTerm(type)({
                    query: sparql_1.SparqlUtil.parseQuerySync(query.value), label: query.label
                }); });
            }
            else {
                _this.state.store.selectTerm(type)({
                    iri: iri,
                    label: label,
                    description: description,
                    tuple: tuple,
                });
            }
        }; };
        _this.relationSelectorPlaceholder = function () {
            return React.createElement("div", { className: styles.relationPlaceholder }, "... related to");
        };
        _this.categorySelection = function (categories, className, action, label) { return React.createElement(ItemSelector_1.default, { mode: _this.context.baseConfig.selectorMode, tupleTemplate: _this.props.categoryViewTemplate, resources: categories, className: className, itemClassName: styles.categorySelectionItem, label: label, actions: {
                selectResource: action,
            } }); };
        _this.nestedSearchButton = function (category) {
            var tooltip = React.createElement(react_bootstrap_1.Tooltip, null,
                "Search for ",
                nlp.noun(category.label).pluralize(),
                " related to...");
            return React.createElement(react_bootstrap_1.OverlayTrigger, { placement: 'bottom', overlay: tooltip },
                React.createElement("button", { className: classnames('btn btn-default', styles.nestedSearchButton), onClick: _this.state.store.selectSubSearchTerm },
                    React.createElement("span", { style: { position: category.thumbnail ? 'absolute' : 'relative' }, className: styles.magnifierIcon }),
                    category.thumbnail ? React.createElement("img", { src: category.thumbnail }) : null));
        };
        _this.state = {
            store: null,
            searchState: null,
            search: Maybe.Nothing(),
            isSearchCollapsed: false,
        };
        return _this;
    }
    QueryBuilder.prototype.componentDidMount = function () {
        if (this.context.searchProfileStore.isJust) {
            this.initSearch(this.props, this.context);
        }
    };
    QueryBuilder.prototype.componentWillReceiveProps = function (props, context) {
        if (!_.isEqual(context, this.context)) {
            this.initSearch(props, context);
        }
    };
    QueryBuilder.prototype.initSearch = function (props, context) {
        var _this = this;
        context.searchProfileStore.map(function (profileStore) {
            var searchStore = _this.state.store;
            var isExtendedSearch = context.extendedSearch.map(function (esNew) { return _this.context.extendedSearch.map(function (esOld) { return !_.isEqual(esOld, esNew); }).getOrElse(true); }).getOrElse(false);
            if (!searchStore || isExtendedSearch) {
                searchStore = new SearchStore_1.SearchStore(profileStore, context.baseConfig, props.projectionVariable, context.baseQueryStructure, context.extendedSearch);
                _this.setState({ store: searchStore });
                searchStore.currentSearchState.onValue(function (currentState) { return _this.setState({ searchState: currentState }); });
                searchStore.currentSearch.onValue(function (currentSearch) {
                    _this.setState({ search: currentSearch });
                    if (currentSearch.isJust) {
                        _this.context.setDomain(currentSearch.get().domain);
                    }
                    _this.context.setBaseQueryStructure(currentSearch);
                });
                searchStore.currentSearchQuery.onValue(_this.context.setBaseQuery);
            }
        });
    };
    QueryBuilder.prototype.render = function () {
        return React.createElement("div", null,
            React.createElement("div", { className: styles.searchAreaHolder }, this.renderSearchArea()),
            this.state.search.isJust ? React.createElement("hr", null) : null);
    };
    QueryBuilder.prototype.renderSearchArea = function () {
        if (this.state.search.isJust && this.context.searchProfileStore.isJust) {
            return this.renderSearch(this.state.search.get(), this.state.searchState);
        }
        else if (this.state.searchState && this.context.searchProfileStore.isJust) {
            return React.createElement("div", { className: styles.searchArea }, this.renderSearchState(this.state.searchState));
        }
        else {
            return null;
        }
    };
    QueryBuilder.prototype.renderSearchState = function (searchState) {
        if (searchState.kind === 'domain-selection') {
            return React.createElement("div", null,
                this.searchSummary(),
                this.domainSelection(searchState));
        }
        else if (searchState.kind === 'extended-domain-selection') {
            return this.renderExtendedDomainSelection(searchState);
        }
        else if (searchState.kind === 'extended-relation-selection') {
            return this.renderExtendedRelationSelection(searchState);
        }
        else {
            return React.createElement("div", { className: styles.searchClauseArea }, this.renderActiveSearchClause(searchState, false));
        }
    };
    QueryBuilder.prototype.isNewConjunct = function (search, searchState) {
        if (searchState) {
            return _.head(search.conjuncts).conjunctIndex.length === searchState.conjunctIndex.length &&
                search.conjuncts.length <= _.last(searchState.conjunctIndex);
        }
        else {
            return false;
        }
    };
    QueryBuilder.prototype.isActiveClause = function (conjunctIndex, searchState) {
        if (searchState) {
            return _.isEqual(searchState.conjunctIndex, conjunctIndex);
        }
        else {
            return false;
        }
    };
    QueryBuilder.prototype.renderActiveSearchClause = function (searchState, isNestedSearch, clause) {
        switch (searchState.kind) {
            case 'range-selection': return this.rangeSelection(searchState, isNestedSearch);
            case 'relation-selection': return this.relationSelection(searchState, isNestedSearch);
            case 'term-selection': return this.termSelection(searchState, isNestedSearch, clause);
            case 'text-term-selection':
                return this.textTermSelection(searchState, clause, isNestedSearch);
        }
    };
    QueryBuilder.prototype.domainSelection = function (searchState) {
        return this.categorySelection(searchState.domains, styles.domainSelection, this.state.store.selectDomain, 'search domain category selection');
    };
    QueryBuilder.prototype.rangeSelection = function (searchState, isNesteadSearch) {
        return react_1.DOM.div({ className: styles.searchClause }, this.renderDomain(searchState.domain, isNesteadSearch), this.relationSelectorPlaceholder(), this.categorySelection(searchState.ranges, styles.rangeSelection, this.state.store.selectRange, 'search range category selection'), this.removeActiveConjunctionButton());
    };
    QueryBuilder.prototype.termSelection = function (state, isNestedSearch, clause) {
        return [
            React.createElement("div", { className: styles.searchClauseHolder },
                React.createElement("div", { className: styles.searchClause },
                    this.renderDomain(state.domain, isNestedSearch),
                    this.renderRelation(state.relation, clause),
                    this.renderRange(state.range, clause),
                    clause ? this.renderSimpleTerms(clause) : null,
                    this.removeActiveConjunctionButton()),
                React.createElement("div", { className: styles.activeTerm }, this.termSelector(state, isNestedSearch)),
                clause ? this.renderNestedTerms(clause.disjuncts, state) : null),
        ];
    };
    QueryBuilder.prototype.textTermSelection = function (state, clause, isNestedSearch) {
        return [
            React.createElement("div", { className: styles.searchClauseHolder },
                React.createElement("div", { className: styles.searchClause },
                    this.renderDomain(state.domain, isNestedSearch),
                    this.textSearchRelationPlaceholder(),
                    clause ? this.renderSimpleTerms(clause) : null,
                    this.removeActiveConjunctionButton()),
                React.createElement("div", { className: styles.activeTerm }, this.textDisjunctSelector(state))),
        ];
    };
    QueryBuilder.prototype.termSelector = function (searchState, isNestedSearch) {
        if (_.includes(searchState.termKind, 'nested-search')) {
            return this.nestedSearch(searchState);
        }
        else if (_.includes(searchState.termKind, 'date-range')) {
            return React.createElement("div", { className: styles.searchBasedTermSelectorHolder }, this.dateTermSelector(searchState));
        }
        else {
            var rangeLabel = searchState.range.label;
            var label = "Find " + nlp.noun(rangeLabel).article() + " " + rangeLabel + ": ";
            return React.createElement("div", { className: styles.searchBasedTermSelectorHolder },
                React.createElement("div", { className: styles.searchBasedTermSelector },
                    React.createElement("span", { className: styles.searchBasedTermSelectorLabel }, label),
                    this.searchBasedTermSelector(searchState),
                    _.includes(searchState.termKind, 'place') ? this.placeTermSelector(searchState) : null,
                    isNestedSearch ? null : this.nestedSearchButton(searchState.range)));
        }
    };
    QueryBuilder.prototype.searchBasedTermSelector = function (searchState) {
        if (_.includes(searchState.termKind, 'hierarchy')) {
            return this.hierarchyTermSelector(searchState);
        }
        else {
            return this.resourceTermSelector(searchState);
        }
    };
    QueryBuilder.prototype.nestedSearch = function (searhState) {
        return React.createElement("div", { className: styles.nestedSearchHolder },
            React.createElement("div", { className: styles.whereSeparator }, "WHERE"),
            this.renderActiveSearchClause(searhState.state, true));
    };
    QueryBuilder.prototype.prepareHierarchySelectorInputConfig = function (hierarchySelectorConfig, searchState) {
        var _this = this;
        return _.assign(_.cloneDeep(hierarchySelectorConfig), {
            rootsQuery: this.setClauseBindings(searchState, hierarchySelectorConfig.rootsQuery),
            childrenQuery: this.setClauseBindings(searchState, hierarchySelectorConfig.childrenQuery),
            parentsQuery: this.setClauseBindings(searchState, hierarchySelectorConfig.parentsQuery),
            searchQuery: this.setClauseBindings(searchState, hierarchySelectorConfig.searchQuery),
            droppable: this.droppableConfig(searchState),
            onSelectionChanged: function (selection) {
                var nodes = lazy_tree_1.TreeSelection.leafs(selection);
                if (nodes.size === 0) {
                    return;
                }
                var _a = nodes.first(), iri = _a.iri, label = _a.label;
                _this.selectResourceTerm('hierarchy')(iri, label.value, label.value, {});
            },
            allowForceSuggestion: true,
        });
    };
    QueryBuilder.prototype.prepareAutoCompletionInputConfig = function (resourceSelectorConfig, searchState) {
        var _this = this;
        var query = resourceSelectorConfig.query, defaultQuery = resourceSelectorConfig.defaultQuery, noSuggestionsTemplate = resourceSelectorConfig.noSuggestionsTemplate, suggestionTupleTemplate = resourceSelectorConfig.suggestionTupleTemplate;
        return {
            query: this.setClauseBindings(searchState, query),
            defaultQuery: defaultQuery ? this.setClauseBindings(searchState, defaultQuery) : undefined,
            droppable: this.droppableConfig(searchState),
            templates: {
                empty: noSuggestionsTemplate,
                suggestion: suggestionTupleTemplate,
                displayKey: function (binding) { return binding[SearchConfig_1.RESOURCE_SEGGESTIONS_VARIABLES.SUGGESTION_LABEL].value; },
            },
            valueBindingName: SearchConfig_1.RESOURCE_SEGGESTIONS_VARIABLES.SUGGESTION_IRI,
            labelBindingName: SearchConfig_1.RESOURCE_SEGGESTIONS_VARIABLES.SUGGESTION_LABEL,
            searchTermVariable: SearchConfig_1.RESOURCE_SEGGESTIONS_VARIABLES.SEARCH_TERM_VAR,
            actions: {
                onSelected: function (binding) { return _this.selectResourceTerm('resource')(binding[SearchConfig_1.RESOURCE_SEGGESTIONS_VARIABLES.SUGGESTION_IRI], binding[SearchConfig_1.RESOURCE_SEGGESTIONS_VARIABLES.SUGGESTION_LABEL].value, binding[SearchConfig_1.RESOURCE_SEGGESTIONS_VARIABLES.SUGGESTION_LABEL].value, binding); },
            },
            allowForceSuggestion: true,
        };
    };
    ;
    QueryBuilder.prototype.setClauseBindings = function (searchState, query) {
        var parsedQuery = sparql_1.SparqlUtil.parseQuery(query);
        var resourcePatternConfig = SparqlQueryGenerator_1.tryGetRelationPatterns(this.context.baseConfig, searchState.relation).find(function (p) { return p.kind === 'resource'; });
        var patterns;
        if (resourcePatternConfig) {
            patterns = sparql_1.SparqlUtil.parsePatterns(resourcePatternConfig.queryPattern, parsedQuery.prefixes);
            var renamer_1 = new sparql_1.VariableRenameBinder(SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.RESOURCE_VAR, SearchConfig_1.RESOURCE_SEGGESTIONS_VARIABLES.SUGGESTION_IRI);
            patterns.forEach(function (p) { return renamer_1.pattern(p); });
        }
        else {
            patterns = sparql_1.SparqlUtil.parsePatterns(SearchDefaults.DefaultResourceSelectorRelationPattern, parsedQuery.prefixes);
        }
        new sparql_1.PatternBinder(SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.RELATION_PATTERN_VAR, patterns)
            .sparqlQuery(parsedQuery);
        var preparedQuery = sparql_1.SparqlClient.setBindings(parsedQuery, (_a = {},
            _a[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.RELATION_VAR] = searchState.relation.iri,
            _a[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.DOMAIN_VAR] = searchState.domain.iri,
            _a[SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.RANGE_VAR] = searchState.range.iri,
            _a));
        return sparql_1.SparqlUtil.serializeQuery(preparedQuery);
        var _a;
    };
    QueryBuilder.prototype.relationSelector = function (relations, action) {
        return react_1.createElement(ItemSelector_1.default, {
            mode: this.context.baseConfig.selectorMode,
            tupleTemplate: this.props.relationViewTemplate,
            resources: relations,
            className: styles.relationSelector,
            label: 'search relation selection',
            actions: {
                selectResource: action,
            },
        });
    };
    return QueryBuilder;
}(components_1.Component));
QueryBuilder.contextTypes = SemanticSearchApi_1.InitialQueryContextTypes;
QueryBuilder.defaultProps = {
    categoryViewTemplate: SearchDefaults.CategoryViewTemplate,
    relationViewTemplate: SearchDefaults.RelationViewTemplate,
    resourceSelector: {
        query: SearchDefaults.DefaultResourceSelectorQuery(),
        suggestionTupleTemplate: SearchDefaults.DefaultResourceSelectorSuggestionTemplate,
        noSuggestionsTemplate: SearchDefaults.DefaultResourceSelectorNoSuggestionsTemplate,
    },
    projectionVariable: 'subject'
};
exports.default = QueryBuilder;
