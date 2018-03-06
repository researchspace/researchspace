Object.defineProperty(exports, "__esModule", { value: true });
var Maybe = require("data.maybe");
var _ = require("lodash");
var utils_1 = require("platform/components/utils");
var Model = require("platform/components/semantic/search/data/search/Model");
var ModelUtils_1 = require("platform/components/semantic/search/data/search/ModelUtils");
var SparqlQueryGenerator_1 = require("platform/components/semantic/search/data/search/SparqlQueryGenerator");
var EditKinds;
(function (EditKinds) {
    EditKinds[EditKinds["Domain"] = 0] = "Domain";
    EditKinds[EditKinds["Range"] = 1] = "Range";
    EditKinds[EditKinds["Relation"] = 2] = "Relation";
    EditKinds[EditKinds["Disjunct"] = 3] = "Disjunct";
})(EditKinds = exports.EditKinds || (exports.EditKinds = {}));
var SearchStore = (function () {
    function SearchStore(profileStore, baseConfig, projectionVariable, initialSearch, nestedSearch) {
        var _this = this;
        this._searchProperty = utils_1.Action();
        this._searchStateProperty = utils_1.Action();
        this._counter = 0;
        this.domains = function () {
            return _this.filterOnlySupportedCategories(_this._profileStore.domains);
        };
        this.rangesFor = function (domain) {
            return _this.filterOnlySupportedCategories(_this._profileStore.rangesFor(domain));
        };
        this.filterOnlySupportedCategories = function (categories) {
            return categories.filterNot(function (domain) {
                var supportedCategoryTypes = _.intersection(SearchStore.SupportedCategoryTypes, ModelUtils_1.getCategoryTypes(_this.config, domain));
                return _.isEmpty(supportedCategoryTypes);
            });
        };
        this.extendedValueToDisjunct = function (value) {
            if (_this.isResourceExtendedDisjunct(value)) {
                return {
                    kind: Model.EntityDisjunctKinds.Resource,
                    value: value,
                    conjunctIndex: [0],
                    disjunctIndex: [0, 0],
                };
            }
            else {
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
        this.isResourceExtendedDisjunct = function (value) {
            return _.has(value, 'iri');
        };
        this.selectExtendedDomain = function (domain) {
            _this.searchState = _.assign({}, _this._searchState, {
                kind: 'extended-relation-selection',
                domain: domain,
                relations: _this._profileStore.relationsFor({
                    domain: Maybe.Just(domain),
                    range: Maybe.Just(_this._searchState.range),
                }),
            });
        };
        this.selectExtendedRelation = function (relation) {
            var state = _this._searchState;
            _this.search = Maybe.Just({
                domain: state.domain,
                conjuncts: [{
                        kind: Model.ConjunctKinds.Relation,
                        range: state.range,
                        relation: relation,
                        conjunctIndex: [0],
                        disjuncts: [state.disjunct],
                    }],
            });
            _this.searchState = null;
        };
        this.edit = function (kind, conjunct, disjunct) {
            if (kind === EditKinds.Domain) {
                _this.search = Maybe.Nothing();
                _this.searchState = {
                    kind: 'domain-selection',
                    domains: _this.domains(),
                };
                return;
            }
            var editingPersistantState = conjunct || disjunct;
            if (editingPersistantState) {
                var domain = _this._search.get().domain;
                switch (kind) {
                    case EditKinds.Range:
                        if (conjunct.conjunctIndex.length > 1) {
                            var baseConjunct = _this.getConjunctByIndex(_this._search.get(), _.dropRight(conjunct.conjunctIndex, 2));
                            _this.removeConjunction(conjunct);
                            if (_this._search.isJust) {
                                _this.addConjunction(_this._search.get().conjuncts[0]);
                                _this.selectRange(baseConjunct.range);
                                _this.selectRelation(baseConjunct.relation);
                                _this.selectSubSearchTerm();
                            }
                            else {
                                var newConjunctIndex = _.clone([0, 0]);
                                newConjunctIndex.push(0);
                                _this.searchState = {
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
                                        ranges: _this.rangesFor(baseConjunct.range),
                                        conjunctIndex: newConjunctIndex,
                                    },
                                };
                            }
                        }
                        else {
                            _this.removeConjunction(conjunct);
                            if (_this._search.isJust) {
                                _this.addConjunction(_this._search.get().conjuncts[0]);
                            }
                            else {
                                _this.selectDomain(domain);
                            }
                        }
                        break;
                    case EditKinds.Relation:
                        if (conjunct.conjunctIndex.length > 1) {
                            var baseConjunct = _this.getConjunctByIndex(_this._search.get(), _.dropRight(conjunct.conjunctIndex, 2));
                            _this.removeConjunction(conjunct);
                            if (_this._search.isJust) {
                                _this.addConjunction(_this._search.get().conjuncts[0]);
                                _this.selectRange(baseConjunct.range);
                                _this.selectRelation(baseConjunct.relation);
                                _this.selectSubSearchTerm();
                                _this.selectRange(conjunct.range);
                            }
                            else {
                                var newConjunctIndex = _.clone([0, 0]);
                                newConjunctIndex.push(0);
                                _this.searchState = _this._selectRange({
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
                                    },
                                }, conjunct.range);
                            }
                        }
                        else {
                            _this.removeConjunction(conjunct);
                            if (_this._search.isJust) {
                                _this.addConjunction(_this._search.get().conjuncts[0]);
                                _this.selectRange(conjunct.range);
                            }
                            else {
                                _this.selectDomain(domain);
                                _this.selectRange(conjunct.range);
                            }
                        }
                        break;
                    case EditKinds.Disjunct:
                        if (conjunct.conjunctIndex.length > 1) {
                            var baseConjunct = _this.getConjunctByIndex(_this._search.get(), _.dropRight(conjunct.conjunctIndex, 2));
                            _this.removeDisjunct(conjunct, disjunct);
                            if (_this._search.isJust) {
                                if (conjunct.disjuncts.length === 0) {
                                    _this.addConjunction(_this._search.get().conjuncts[0]);
                                    _this.selectRange(baseConjunct.range);
                                    _this.selectRelation(baseConjunct.relation);
                                    _this.selectSubSearchTerm();
                                    _this.selectRange(conjunct.range);
                                    _this.selectRelation(conjunct.relation);
                                }
                                else {
                                    _this.addDisjunction(conjunct);
                                }
                            }
                            else {
                                var newConjunctIndex = _.clone([0, 0]);
                                newConjunctIndex.push(0);
                                _this.searchState = _this._selectRelation({
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
                                    },
                                }, conjunct.relation);
                            }
                        }
                        else {
                            _this.removeDisjunct(conjunct, disjunct);
                            if (conjunct.disjuncts.length > 0) {
                                _this.addDisjunction(conjunct);
                            }
                            else {
                                if (_this._search.isJust) {
                                    _this.addConjunction(_this._search.get().conjuncts[0]);
                                    _this.selectRange(conjunct.range);
                                    _this.selectRelation(conjunct.relation);
                                }
                                else {
                                    _this.selectDomain(domain);
                                    _this.selectRange(conjunct.range);
                                    _this.selectRelation(conjunct.relation);
                                }
                            }
                        }
                        break;
                }
            }
            else {
                switch (kind) {
                    case EditKinds.Range:
                        if (_this.isNestedSearch(_this._searchState)) {
                            _this.selectSubSearchTerm();
                        }
                        else {
                            _this.selectDomain(_this._searchState.domain);
                        }
                        break;
                    case EditKinds.Relation:
                        _this.selectRange(_this._searchState.range);
                        break;
                }
            }
        };
        this.selectDomain = function (domain) {
            _this.searchState = {
                kind: 'range-selection',
                domain: domain,
                ranges: _this.rangesFor(domain),
                conjunctIndex: [0],
            };
        };
        this.selectRange = function (range) {
            var state = _this._searchState;
            _this.searchState = _this._selectRange(state, range);
        };
        this._selectRange = function (state, range) {
            var deepestActiveState = _this.getDeepestActiveState(state);
            if (_.includes(ModelUtils_1.getCategoryTypes(_this.config, range), 'text')) {
                return _this.updateNestedState(state, _this.selectTextDisjunctState(deepestActiveState, range));
            }
            else {
                return _this.updateNestedState(state, _this.selectRelationState(deepestActiveState, range));
            }
        };
        this.isNestedSearch = function (state) {
            return state.kind === 'term-selection' && _.isEqual(state.termKind, ['nested-search']);
        };
        this.selectRelation = function (relation) {
            var state = _this._searchState;
            _this.searchState = _this._selectRelation(state, relation);
        };
        this._selectRelation = function (state, relation) {
            var deepestActiveState = _this.getDeepestActiveState(state);
            return _this.updateNestedState(state, _this.selectTermState(deepestActiveState, relation));
        };
        this.selectTermState = function (state, relation) {
            var conjunctIndex = state.conjunctIndex;
            var newDisjunctIndex = _.clone(conjunctIndex);
            newDisjunctIndex.push(0);
            return _.assign({}, state, {
                kind: 'term-selection',
                termKind: _this.getRelationDisjunctKinds(relation),
                relation: relation,
                disjunctIndex: newDisjunctIndex,
            });
        };
        this.getConjunctType = function (searchState) {
            if (searchState.kind === 'text-term-selection') {
                return Model.ConjunctKinds.Text;
            }
            else {
                return Model.ConjunctKinds.Relation;
            }
        };
        this.getDisjunctType = function (searchState, termType, value) {
            if (searchState.kind === 'text-term-selection') {
                return Model.TextDisjunctKind;
            }
            else if (value.iri && _.includes(value.iri.value, 'container/setContainer')) {
                return Model.EntityDisjunctKinds.Set;
            }
            else if (value.query) {
                return Model.EntityDisjunctKinds.SavedSearch;
            }
            else {
                switch (termType) {
                    case 'resource':
                    case 'hierarchy': return Model.EntityDisjunctKinds.Resource;
                    case 'date-range': return value.dateFormat;
                    case 'place':
                        if (value['center']) {
                            return Model.SpatialDisjunctKinds.Distance;
                        }
                        else {
                            return Model.SpatialDisjunctKinds.BoundingBox;
                        }
                }
            }
        };
        this.getDisjunctValue = function (value) {
            if (value['dateFormat']) {
                return value.value;
            }
            else {
                return value;
            }
        };
        this.selectTerm = function (termType) { return function (value) {
            var searchState = _this._searchState;
            var domain = searchState.domain, range = searchState.range, conjunctIndex = searchState.conjunctIndex;
            if (_this._search.isJust) {
                if (_.isEqual(searchState.termKind, ['nested-search'])) {
                    _this.search = Maybe.Just(_this.updateNestedSearchTerm(_this._search.get(), searchState, value, termType));
                }
                else {
                    var existingConjunct = _this.getConjunctByIndex(_this._search.get(), conjunctIndex);
                    if (existingConjunct) {
                        existingConjunct.disjuncts.push({
                            kind: _this.getDisjunctType(searchState, termType, value),
                            value: _this.getDisjunctValue(value),
                            disjunctIndex: _this.newDisjunctIndex(existingConjunct),
                        });
                        _this.search = _this._search;
                    }
                    else {
                        var searhBase = _this.getSearchBaseForConjunct(_this._search.get(), conjunctIndex);
                        var conjunct = {
                            uniqueId: _this._counter++,
                            kind: _this.getConjunctType(searchState),
                            range: range,
                            conjunctIndex: conjunctIndex,
                            disjuncts: [],
                        };
                        if (conjunct.kind === Model.ConjunctKinds.Relation) {
                            conjunct['relation'] = searchState['relation'];
                        }
                        conjunct.disjuncts.push({
                            kind: _this.getDisjunctType(searchState, termType, value),
                            disjunctIndex: _this.newDisjunctIndex(conjunct),
                            value: _this.getDisjunctValue(value),
                        });
                        searhBase.conjuncts.push(conjunct);
                        _this.search = _this._search;
                    }
                }
            }
            else {
                _this.search = Maybe.Just(_this.createInitialSearch(_this._searchState, value, termType));
            }
            _this.searchState = null;
        }; };
        this.updateNestedSearchTerm = function (search, searchState, resource, termType) {
            var nestedState = searchState.state;
            var existingParentConjunct = _this.getConjunctByIndex(search, searchState.conjunctIndex);
            if (existingParentConjunct) {
                var newDisjunctIndex = _this.newDisjunctIndex(existingParentConjunct);
                var newConjunctIndex = _.clone(newDisjunctIndex);
                newConjunctIndex.push(0);
                var conjunct = {
                    uniqueId: _this._counter++,
                    kind: _this.getConjunctType(nestedState),
                    range: nestedState.range,
                    relation: nestedState.relation,
                    conjunctIndex: newConjunctIndex,
                    disjuncts: [],
                };
                conjunct.disjuncts.push({
                    kind: _this.getDisjunctType(nestedState, termType, resource),
                    disjunctIndex: _this.newDisjunctIndex(conjunct),
                    value: resource,
                });
                existingParentConjunct.disjuncts.push({
                    kind: Model.EntityDisjunctKinds.Search,
                    value: {
                        domain: nestedState.domain,
                        conjuncts: [conjunct],
                    },
                    disjunctIndex: newDisjunctIndex,
                });
                return search;
            }
            else {
                var conjunct = {
                    kind: Model.ConjunctKinds.Relation,
                    range: searchState.range,
                    relation: searchState.relation,
                    conjunctIndex: searchState.conjunctIndex,
                    disjuncts: [],
                };
                var newDisjunctIndex = _this.newDisjunctIndex(conjunct);
                var newConjunctIndex = _.clone(newDisjunctIndex);
                newConjunctIndex.push(0);
                var nestedConjunct = {
                    uniqueId: _this._counter++,
                    kind: _this.getConjunctType(nestedState),
                    range: nestedState.range,
                    relation: nestedState.relation,
                    conjunctIndex: newConjunctIndex,
                    disjuncts: [],
                };
                nestedConjunct.disjuncts.push({
                    kind: _this.getDisjunctType(searchState, termType, resource),
                    disjunctIndex: _this.newDisjunctIndex(nestedConjunct),
                    value: _this.getDisjunctValue(resource),
                });
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
        this.createInitialSearch = function (state, resource, termType, n) {
            if (n === void 0) { n = 1; }
            var isNestedSearch = _.includes(state.termKind, 'nested-search');
            return {
                domain: state.domain,
                conjuncts: [{
                        uniqueId: _this._counter++,
                        kind: state.kind === 'text-term-selection' ? Model.ConjunctKinds.Text : Model.ConjunctKinds.Relation,
                        range: state.range,
                        relation: state.relation,
                        conjunctIndex: _.fill(Array(n), 0),
                        disjuncts: [{
                                kind: isNestedSearch ? Model.EntityDisjunctKinds.Search : _this.getDisjunctType(state, termType, resource),
                                value: isNestedSearch ? _this.createInitialSearch(state.state, resource, termType, n + 2) : _this.getDisjunctValue(resource),
                                disjunctIndex: _.fill(Array(n + 1), 0),
                            }],
                    }],
            };
        };
        this.selectSubSearchTerm = function () {
            var _a = _this._searchState, range = _a.range, disjunctIndex = _a.disjunctIndex;
            var newConjunctIndex = _.clone(disjunctIndex);
            newConjunctIndex.push(0);
            _this.searchState =
                _.assign({}, _this._searchState, {
                    kind: 'term-selection',
                    termKind: ['nested-search'],
                    state: {
                        kind: 'range-selection',
                        domain: range,
                        ranges: _this.rangesFor(range),
                        conjunctIndex: newConjunctIndex,
                    },
                });
        };
        this.addConjunction = function (baseConjunct) {
            var baseSearch = _this.getSearchBaseForConjunct(_this._search.get(), baseConjunct.conjunctIndex);
            var domain = baseSearch.domain, conjuncts = baseSearch.conjuncts;
            var newConjunctIndex = _.clone(_.last(conjuncts).conjunctIndex);
            newConjunctIndex[newConjunctIndex.length - 1] = conjuncts.length;
            _this.searchState = {
                kind: 'range-selection',
                domain: domain,
                ranges: _this.rangesFor(domain),
                conjunctIndex: newConjunctIndex,
            };
        };
        this.addDisjunction = function (conjunct) {
            switch (conjunct.kind) {
                case Model.ConjunctKinds.Relation:
                    _this.addRelationDisjunction(conjunct);
                    break;
                case Model.ConjunctKinds.Text:
                    _this.addTextDisjunction(conjunct);
                    break;
            }
        };
        this.removeConjunction = function (conjunct) {
            var search = _this.getSearchBaseForConjunct(_this._search.get(), conjunct.conjunctIndex);
            search.conjuncts.splice(_.last(conjunct.conjunctIndex), 1);
            _this.normalizeSearch(_this._search.get());
            if (_.isEmpty(_this._search.get().conjuncts)) {
                _this.searchState = {
                    kind: 'domain-selection',
                    domains: _this.domains(),
                };
                _this.search = Maybe.Nothing();
            }
            else {
                _this.search = _this._search;
            }
        };
        this.removeDisjunct = function (conjunct, disjunct) {
            conjunct.disjuncts.splice(_.last(disjunct.disjunctIndex), 1);
            _this.normalizeSearch(_this._search.get());
            if (_.isEmpty(_this._search.get().conjuncts)) {
                _this.searchState = {
                    kind: 'domain-selection',
                    domains: _this.domains(),
                };
                _this.search = Maybe.Nothing();
            }
            else {
                _this.search = _this._search;
            }
        };
        this.resetEditMode = function () {
            if (_this._search.isNothing) {
                _this.searchState = {
                    kind: 'domain-selection',
                    domains: _this.domains(),
                };
            }
            else {
                _this.searchState = null;
            }
        };
        this.normalizeSearch = function (search) {
            var conjuncts = _.reject(search.conjuncts, function (conjunct) { return _.isEmpty(conjunct.disjuncts) || _.isEmpty(_this.removeNestedEmptyDisjuncts(conjunct.disjuncts)); });
            _this.updateConjunctIndexes(conjuncts);
            _this._search.get().conjuncts = conjuncts;
            _this.search = _this._search;
        };
        this.removeNestedEmptyDisjuncts = function (disjuncts) {
            return _.reject(disjuncts, function (disjunct) {
                if (disjunct.kind === Model.EntityDisjunctKinds.Search) {
                    return _.isEmpty(disjunct.value.conjuncts) || _this.isEmptyConjuncts(disjunct.value.conjuncts);
                }
                return false;
            });
        };
        this.isEmptyConjuncts = function (conjuncts) {
            return _.every(conjuncts, function (conjunct) { return _.isEmpty(conjunct.disjuncts); });
        };
        this.updateConjunctIndexes = function (conjuncts, baseIndex) {
            if (baseIndex === void 0) { baseIndex = []; }
            _.forEach(conjuncts, function (conjunct, i) {
                var conjunctIndex = _.clone(baseIndex);
                conjunctIndex.push(i);
                conjunct.conjunctIndex = conjunctIndex;
                _.forEach(conjunct.disjuncts, function (disjunct, j) {
                    var disjunctIndex = _.clone(conjunctIndex);
                    disjunctIndex.push(j);
                    disjunct.disjunctIndex = disjunctIndex;
                    if (disjunct.kind === 'search') {
                        _this.updateConjunctIndexes(disjunct.value.conjuncts, disjunctIndex);
                    }
                });
            });
        };
        this.addRelationDisjunction = function (conjunct) {
            var domain = _this._search.get().domain;
            var range = conjunct.range, relation = conjunct.relation;
            _this.searchState = {
                kind: 'term-selection',
                termKind: _this.getRelationDisjunctKinds(relation),
                domain: domain,
                range: range,
                relation: relation,
                conjunctIndex: conjunct.conjunctIndex,
                disjunctIndex: _this.newDisjunctIndex(conjunct),
            };
        };
        this.addTextDisjunction = function (conjunct) {
            var domain = _this._search.get().domain;
            var range = conjunct.range;
            _this.searchState = {
                kind: 'text-term-selection',
                domain: domain,
                range: range,
                conjunctIndex: conjunct.conjunctIndex,
                disjunctIndex: _this.newDisjunctIndex(conjunct),
            };
        };
        this.newDisjunctIndex = function (conjunct) {
            var newIndex = _.clone(conjunct.conjunctIndex);
            newIndex.push(conjunct.disjuncts.length);
            return newIndex;
        };
        this.getSearchBaseForConjunct = function (search, conjunctIndex) {
            if (conjunctIndex.length <= 1) {
                return search;
            }
            else {
                var conjunct = search.conjuncts[conjunctIndex[0]];
                var disjunct = conjunct.disjuncts[conjunctIndex[1]];
                if (disjunct) {
                    return _this.getSearchBaseForConjunct(disjunct.value, conjunctIndex.slice(2));
                }
                else {
                    return null;
                }
            }
        };
        this.getConjunctByIndex = function (search, conjunctIndex) {
            var baseSearch = _this.getSearchBaseForConjunct(search, conjunctIndex);
            if (baseSearch) {
                return baseSearch.conjuncts[_.last(conjunctIndex)];
            }
            else {
                return null;
            }
        };
        this.config = baseConfig;
        this.projectionVariable = projectionVariable;
        this._profileStore = profileStore;
        if (nestedSearch.isJust) {
            this.search = Maybe.Nothing();
            this.searchState = {
                kind: 'extended-domain-selection',
                domains: this.domains(),
                range: nestedSearch.get().range,
                disjunct: this.extendedValueToDisjunct(nestedSearch.get().value),
            };
        }
        else if (initialSearch.isJust) {
            this.searchState = null;
            this.search = initialSearch;
        }
        else {
            this.search = initialSearch;
            this.searchState = {
                kind: 'domain-selection',
                domains: this.domains(),
            };
        }
    }
    Object.defineProperty(SearchStore.prototype, "searchState", {
        set: function (state) {
            this._searchState = state;
            this._searchStateProperty(state);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SearchStore.prototype, "currentSearchState", {
        get: function () {
            return this._searchStateProperty.$property;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SearchStore.prototype, "search", {
        set: function (search) {
            this._search = search;
            this._searchProperty(search);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SearchStore.prototype, "currentSearch", {
        get: function () {
            return this._searchProperty.$property;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SearchStore.prototype, "currentSearchQuery", {
        get: function () {
            var _this = this;
            return this._searchProperty.$property.map(function (maybeSearch) { return maybeSearch.map(function (search) { return SparqlQueryGenerator_1.generateSelectQuery(_this.config, _this.projectionVariable, search); }); });
        },
        enumerable: true,
        configurable: true
    });
    SearchStore.prototype.updateNestedState = function (currentState, newState) {
        var updatedState = _.clone(currentState);
        var deepestActiveState = this.getDeepestActiveState(updatedState);
        _.assign(deepestActiveState, newState);
        return updatedState;
    };
    SearchStore.prototype.getDeepestActiveState = function (state) {
        if (this.isNestedSearch(state)) {
            return this.getDeepestActiveState(state.state);
        }
        else {
            return state;
        }
    };
    SearchStore.prototype.selectTextDisjunctState = function (state, range) {
        var conjunctIndex = this._searchState.conjunctIndex;
        var newDisjunctIndex = _.clone(conjunctIndex);
        newDisjunctIndex.push(0);
        return _.assign({}, state, {
            kind: 'text-term-selection',
            range: range,
            disjunctIndex: newDisjunctIndex,
        });
    };
    SearchStore.prototype.selectRelationState = function (state, range) {
        var conjunctIndex = this._searchState.conjunctIndex;
        var relations = this._profileStore.relationsFor({
            domain: Maybe.Just(state.domain),
            range: Maybe.Just(range),
        });
        return _.assign({}, state, {
            kind: 'relation-selection',
            range: range,
            relations: relations,
        });
    };
    SearchStore.prototype.getRelationDisjunctKinds = function (relation) {
        return ModelUtils_1.getCategoryTypes(this.config, relation.hasRange);
    };
    return SearchStore;
}());
SearchStore.SupportedCategoryTypes = ['resource', 'hierarchy', 'date-range', 'text', 'place', 'set'];
exports.SearchStore = SearchStore;
