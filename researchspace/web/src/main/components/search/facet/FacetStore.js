Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var maybe = require("data.maybe");
var _ = require("lodash");
var Kefir = require("kefir");
var immutable_1 = require("immutable");
var moment = require("moment");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var utils_1 = require("platform/components/utils");
var SearchConfig_1 = require("platform/components/semantic/search/config/SearchConfig");
var SearchDefaults = require("platform/components/semantic/search/config/Defaults");
var F = require("platform/components/semantic/search/data/facet/Model");
var SearchModel = require("platform/components/semantic/search/data/search/Model");
var SparqlQueryGenerator_1 = require("platform/components/semantic/search/data/search/SparqlQueryGenerator");
var LabelsService = require("platform/api/services/resource-label");
var FacetStore = (function () {
    function FacetStore(config, context) {
        var _this = this;
        this.ast = utils_1.Action();
        this.relations = utils_1.Action();
        this.values = utils_1.Action({ values: [], loading: false, error: false });
        this.facetData = utils_1.Action();
        this.facetedQuery = utils_1.Action();
        this.facetView = utils_1.Action();
        this.selectValueAction = utils_1.Action();
        this.deselectValueAction = utils_1.Action();
        this.relationsCache = {};
        this.valuesCache = {};
        this.initialValues = function (ast) {
            var selectedValues = immutable_1.OrderedMap();
            return selectedValues.withMutations(function (mutable) {
                ast.conjuncts.forEach(function (conjunct) { return mutable.set(conjunct.relation, immutable_1.List(conjunct.disjuncts.map(function (d) { return d.value; }))); });
            });
        };
        this.buldAst = function (values) {
            var i = 0;
            var conjuncts = values.map(function (selections, relation) {
                var disjunctKind = _this.getDisjunctType(relation);
                var disjuncts = selections.map(function (selection, j) {
                    return _this.createValueDisjunct(selection, disjunctKind, i, j);
                }).toArray();
                i = i + 1;
                return {
                    kind: SearchModel.ConjunctKinds.Relation,
                    conjunctIndex: [i],
                    relation: relation,
                    range: relation.hasRange,
                    disjuncts: disjuncts,
                };
            }).toArray();
            return { conjuncts: conjuncts };
        };
        this.getDisjunctType = function (relation) {
            var relationType = _this.getFacetValuesQueryForRelation(_this.config, relation).kind;
            switch (relationType) {
                case 'resource': return SearchModel.EntityDisjunctKinds.Resource;
                case 'date-range': return SearchModel.TemporalDisjunctKinds.DateRange;
                case 'literal': return SearchModel.LiteralDisjunctKind;
                case 'numeric-range': return SearchModel.NumericRangeDisjunctKind;
            }
        };
        this.createValueDisjunct = function (value, disjunctType, i, j) {
            return ({
                kind: disjunctType,
                disjunctIndex: [i, j],
                value: value,
            });
        };
        this.selectCategory = function (category) {
            _this.toggleCategoryAction(maybe.Just(category));
        };
        this.deselectCategory = function () {
            _this.toggleCategoryAction(maybe.Nothing());
        };
        this.selectRelation = function (relation) {
            _this.toggleRelationAction(maybe.Just(relation));
        };
        this.deselectRelation = function () {
            _this.toggleRelationAction(maybe.Nothing());
        };
        this.selectFacetValue = function (relation) {
            return function (value) {
                return _this.selectValueAction({ relation: relation, value: value });
            };
        };
        this.deselectFacetValue = function (relation) {
            return function (value) {
                return _this.deselectValueAction({ relation: relation, value: value });
            };
        };
        this.executeRelationCheckQuery = function (parametrized, relation) {
            return sparql_1.SparqlClient.ask(parametrized, { context: _this.context.semanticContext })
                .map(function (isFacetEnabled) {
                relation.available = isFacetEnabled;
                _this.relationsCache[parametrized] = isFacetEnabled;
                return relation;
            })
                .flatMapErrors(function (_) {
                relation.available = false;
                return Kefir.constant(relation);
            });
        };
        this.context = context;
        this.config = config;
        var initialAst = config.initialAst || { conjuncts: [] };
        this.ast(initialAst);
        this.selectedValues = utils_1.Action(this.initialValues(initialAst));
        var baseQuery = _.clone(this.config.baseQuery);
        baseQuery.prefixes = {};
        this.queries = {
            baseQuery: baseQuery,
        };
        this.actions = {
            selectCategory: this.selectCategory,
            deselectCategory: this.deselectCategory,
            selectRelation: this.selectRelation,
            deselectRelation: this.deselectRelation,
            selectFacetValue: this.selectFacetValue,
            deselectFacetValue: this.deselectFacetValue,
        };
        var categories = this.config.searchProfileStore.rangesFor(this.config.domain).map(this.buildFacetCategoryBinding);
        var selectedCategory = config.config.selectFirstCategory ?
            maybe.Just(categories.first()) : maybe.Nothing();
        this.toggleCategoryAction = utils_1.Action(selectedCategory);
        this.toggleRelationAction = utils_1.Action(maybe.Nothing());
        Kefir.combine({
            relations: this.relations.$property,
            viewState: this.facetView.$property,
            ast: this.ast.$property,
            categories: Kefir.constant(categories),
        }).debounce(200).onValue(this.facetData);
        Kefir.combine({ value: this.selectValueAction.$property }, { selected: this.selectedValues.$property }).onValue(function (_a) {
            var value = _a.value, selected = _a.selected;
            var selectedValues = selected.get(value.relation) || immutable_1.List();
            selectedValues = selectedValues.push(value.value);
            _this.selectedValues(selected.set(value.relation, selectedValues));
        });
        Kefir.combine({ value: this.deselectValueAction.$property }, { selected: this.selectedValues.$property }).onValue(function (_a) {
            var value = _a.value, selected = _a.selected;
            var selectedValues = selected.get(value.relation).filterNot(function (selectedValue) { return F.partialValueEquals(value.value, selectedValue); });
            _this.selectedValues(selected.set(value.relation, selectedValues));
        });
        this.selectedValues.$property.map(this.buldAst).onValue(this.ast);
        this.ast.$property.onValue(function (ast) {
            _this.facetedQuery(_this.generateQuery(_this.queries.baseQuery, ast.conjuncts));
            _this.valuesCache = {};
        });
        Kefir.combine({
            ast: this.ast.$property,
            category: this.toggleCategoryAction.$property,
        }).onValue(function (_a) {
            var ast = _a.ast, category = _a.category;
            return _this.fetchRelations(_this.queries.baseQuery, ast.conjuncts, category).onValue(_this.relations);
        });
        this.facetView({
            category: selectedCategory,
            relation: maybe.Nothing(),
            values: { values: [], loading: false },
            selectedValues: immutable_1.OrderedMap(),
            relationType: null,
            categoryTemplate: config.config.categories.tupleTemplate,
            relationTemplate: config.config.relations.tupleTemplate,
            valuesTemplate: config.config.defaultValueTemplate,
            selectorMode: config.baseConfig.selectorMode,
        });
        Kefir.combine({
            relation: this.toggleRelationAction.$property,
            category: this.toggleCategoryAction.$property,
            values: this.values.$property,
            selectedValues: this.selectedValues.$property,
        }, { facetView: this.facetView.$property }).onValue(function (_a) {
            var relation = _a.relation, category = _a.category, values = _a.values, facetView = _a.facetView, selectedValues = _a.selectedValues;
            facetView.relation = relation;
            facetView.category = category;
            facetView.values = values;
            facetView.selectedValues = selectedValues;
            if (relation.isJust) {
                facetView.relationType =
                    _this.getFacetValuesQueryForRelation(_this.config, relation.get()).kind;
            }
            _this.facetView(facetView);
        });
        Kefir.combine({
            relation: this.toggleRelationAction.$property,
        }, {
            ast: this.ast.$property,
        }).onValue(function (_a) {
            var ast = _a.ast, relation = _a.relation;
            if (relation.isNothing) {
                _this.values({ values: [], loading: false, error: false });
            }
            else {
                var relationIri_1 = relation.get().iri.value;
                _this.values({ values: [], loading: true, error: false });
                var facetValues = void 0;
                if (_this.valuesCache[relationIri_1]) {
                    facetValues = Kefir.constant(_this.valuesCache[relationIri_1]);
                }
                else {
                    facetValues = _this.fetchFacetValues(ast.conjuncts, relation.get());
                }
                facetValues
                    .onValue(function (facetValues) {
                    _this.values({ values: facetValues, loading: false, error: false });
                    _this.valuesCache = (_a = {}, _a[relationIri_1] = facetValues, _a);
                    var _a;
                })
                    .onError(function (error) {
                    console.error(error);
                    _this.values({ values: [], loading: false, error: true });
                });
            }
        });
    }
    FacetStore.prototype.getFacetedQuery = function () {
        return this.facetedQuery.$property;
    };
    FacetStore.prototype.getFacetAst = function () {
        return this.ast.$property;
    };
    FacetStore.prototype.getFacetData = function () {
        return this.facetData.$property;
    };
    FacetStore.prototype.facetActions = function () {
        return this.actions;
    };
    FacetStore.prototype.fetchRelations = function (baseQuery, conjuntcs, maybeCategory) {
        var _this = this;
        var relations = this.config.searchProfileStore.relationsFor({
            domain: maybe.Just(this.config.domain),
            range: maybeCategory,
        }).map(this.buildFacetRelationBinding);
        var facetEnabledQuery = sparql_1.SparqlUtil.parseQuery('ASK { FILTER(?__relationPattern__) }');
        (_a = facetEnabledQuery.where).unshift.apply(_a, baseQuery.where);
        facetEnabledQuery.where = facetEnabledQuery.where.concat(this.generateQueryClause(conjuntcs));
        var enabledFacets = relations.valueSeq()
            .sortBy(function (relation) { return relation.label; })
            .map(function (relation) { return _this.fetchRelation(facetEnabledQuery, relation); })
            .toArray();
        return Kefir.merge(enabledFacets).toProperty().scan(function (rels, rel) { return rels.set(rel.iri, rel); }, relations);
        var _a;
    };
    FacetStore.prototype.fetchRelation = function (enabledBaseQuery, relation) {
        var queryPattern = "?subject ?__relation__ ?propValue";
        var relationConfigs = SparqlQueryGenerator_1.tryGetRelationPatterns(this.config.baseConfig, relation);
        if (relationConfigs.length === 1) {
            var config = relationConfigs[0];
            if (config.kind === 'resource' ||
                config.kind === 'literal' ||
                config.kind === 'hierarchy' ||
                config.kind === 'text' ||
                config.kind === 'set') {
                queryPattern = config.queryPattern;
            }
        }
        else if (relationConfigs.length > 1) {
            console.warn("Found multiple matching patterns for facet relation " + relation.iri);
        }
        var parsedPattern = sparql_1.SparqlUtil.parsePatterns(queryPattern, enabledBaseQuery.prefixes);
        var facetQuery = sparql_1.cloneQuery(enabledBaseQuery);
        new sparql_1.PatternBinder('__relationPattern__', parsedPattern).sparqlQuery(facetQuery);
        var parametrized = sparql_1.SparqlClient.setBindings(facetQuery, (_a = {}, _a[SearchConfig_1.FACET_VARIABLES.RELATION_VAR] = relation.iri, _a));
        var serializedQuery = sparql_1.SparqlUtil.serializeQuery(parametrized);
        if (_.has(this.relationsCache, serializedQuery)) {
            relation.available = this.relationsCache[serializedQuery];
            return Kefir.constant(relation);
        }
        else {
            return this.executeRelationCheckQuery(serializedQuery, relation);
        }
        var _a;
    };
    FacetStore.prototype.buildFacetRelationBinding = function (relation) {
        var tuple = {
            '$relation': relation.tuple,
            '$domain': relation.hasDomain.tuple,
            '$range': relation.hasRange.tuple,
            available: undefined,
        };
        return tslib_1.__assign({}, relation, { tuple: tuple });
    };
    FacetStore.prototype.buildFacetCategoryBinding = function (category) {
        var tuple = {
            '$category': category.tuple
        };
        return tslib_1.__assign({}, category, { tuple: tuple });
    };
    FacetStore.prototype.fetchFacetValues = function (conjuncts, relation) {
        var relationConfig = this.getFacetValuesQueryForRelation(this.config, relation);
        switch (relationConfig.kind) {
            case 'resource': return this.fetchFacetResourceValues(conjuncts, relation, relationConfig);
            case 'date-range': return this.fetchFacetDateRangeValues(conjuncts, relation, relationConfig);
            case 'literal': return this.fetchFacetLiteralValues(conjuncts, relation, relationConfig);
            case 'numeric-range':
                return this.fetchFacetNumericRangeValues(conjuncts, relation, relationConfig);
        }
    };
    FacetStore.prototype.augmentWithLabelsFromServiceIfNeeded = function (values) {
        if (values.length > 0 && typeof values[0].label !== 'string') {
            return LabelsService.getLabels(values.map(function (value) { return value.iri; })).map(function (labels) { return values.map(function (value) {
                var label = labels.get(value.iri);
                value.tuple[SearchConfig_1.FACET_VARIABLES.VALUE_RESOURCE_LABEL_VAR] = rdf_1.Rdf.literal(label);
                return {
                    iri: value.iri,
                    label: label,
                    description: label,
                    tuple: value.tuple
                };
            }); });
        }
        else {
            return Kefir.constant(values);
        }
    };
    FacetStore.prototype.fetchFacetResourceValues = function (conjuncts, relation, relationConfig) {
        var _this = this;
        return this.executeValuesQuery(conjuncts, relation, relationConfig.valuesQuery, true).map(function (res) { return res.results.bindings.map(function (binding) { return ({
            iri: binding[SearchConfig_1.FACET_VARIABLES.VALUE_RESOURCE_VAR],
            label: SearchConfig_1.FACET_VARIABLES.VALUE_RESOURCE_LABEL_VAR in binding ?
                binding[SearchConfig_1.FACET_VARIABLES.VALUE_RESOURCE_LABEL_VAR].value : undefined,
            description: SearchConfig_1.FACET_VARIABLES.VALUE_RESOURCE_LABEL_VAR in binding ?
                binding[SearchConfig_1.FACET_VARIABLES.VALUE_RESOURCE_LABEL_VAR].value : undefined,
            tuple: binding,
        }); }); }).flatMap(function (values) { return _this.augmentWithLabelsFromServiceIfNeeded(values); }).map(function (values) { return _.sortBy(values, function (v) { return v.label; }); }).toProperty();
    };
    FacetStore.prototype.fetchFacetDateRangeValues = function (conjuncts, relation, relationConfig) {
        return this.executeValuesQuery(conjuncts, relation, relationConfig.valuesQuery).map(function (res) { return res.results.bindings.map(function (binding) { return ({
            begin: moment(binding[SearchConfig_1.FACET_VARIABLES.VALUE_DATE_RANGE_BEGIN_VAR].value, moment.ISO_8601),
            end: moment(binding[SearchConfig_1.FACET_VARIABLES.VALUE_DATE_RANGE_END_VAR].value, moment.ISO_8601),
        }); }).filter(function (_a) {
            var begin = _a.begin, end = _a.end;
            return begin.isValid() && end.isValid();
        }); });
    };
    FacetStore.prototype.fetchFacetLiteralValues = function (conjuncts, relation, relationConfig) {
        return this.executeValuesQuery(conjuncts, relation, relationConfig.valuesQuery).map(function (res) { return res.results.bindings.map(function (binding) { return ({
            literal: binding[SearchConfig_1.FACET_VARIABLES.VALUE_LITERAL],
            tuple: binding,
        }); }); });
    };
    FacetStore.prototype.fetchFacetNumericRangeValues = function (conjuncts, relation, relationConfig) {
        return this.executeValuesQuery(conjuncts, relation, relationConfig.valuesQuery).map(function (res) { return res.results.bindings.map(function (binding) { return ({
            begin: parseFloat(binding[SearchConfig_1.FACET_VARIABLES.VALUE_LITERAL].value),
            end: parseFloat(binding[SearchConfig_1.FACET_VARIABLES.VALUE_LITERAL].value),
            tuple: binding,
        }); }); });
    };
    FacetStore.prototype.executeValuesQuery = function (conjuncts, relation, facetValuesQuery, isResourceQuery) {
        if (isResourceQuery === void 0) { isResourceQuery = false; }
        var facetsQuery = SparqlQueryGenerator_1.rewriteProjectionVariable(sparql_1.SparqlUtil.parseQuerySync(facetValuesQuery), this.getProjectionVariable(this.queries.baseQuery));
        (_a = facetsQuery.where).unshift.apply(_a, this.queries.baseQuery.where);
        facetsQuery.where = facetsQuery.where.concat(this.generateQueryClause(this.excludeClauseForRelation(conjuncts, relation.iri)));
        if (isResourceQuery && this.config.config.facetValuesThreshold > 0) {
            facetsQuery.limit = this.config.config.facetValuesThreshold + 1;
        }
        var query = sparql_1.SparqlClient.setBindings(facetsQuery, (_b = {},
            _b[SearchConfig_1.FACET_VARIABLES.RELATION_VAR] = relation.iri,
            _b));
        return sparql_1.SparqlClient.select(query, { context: this.context.semanticContext });
        var _a, _b;
    };
    FacetStore.prototype.excludeClauseForRelation = function (conjuncts, relation) {
        return _.reject(conjuncts, function (conjunct) { return conjunct.relation.iri.equals(relation); });
    };
    FacetStore.prototype.generateQuery = function (baseQuery, conjuncts) {
        var patterns = this.generateQueryClause(conjuncts);
        var query = _.clone(baseQuery);
        query.where = query.where.concat(patterns);
        return query;
    };
    FacetStore.prototype.getFacetValuesQueryForRelation = function (config, relation) {
        var _a = config.config, valueCategories = _a.valueCategories, valueRelations = _a.valueRelations;
        var rangeIri = relation.hasRange.iri.toString();
        var relationIri = relation.iri.toString();
        if (_.has(valueRelations, relationIri)) {
            return valueRelations[relationIri];
        }
        else if (_.has(valueCategories, rangeIri)) {
            return valueCategories[rangeIri];
        }
        else {
            return generateFacetValuePatternFromRelation(config, relation);
        }
    };
    FacetStore.prototype.getProjectionVariable = function (baseQuery) {
        var variables = baseQuery.variables;
        return variables[0];
    };
    FacetStore.prototype.generateQueryClause = function (conjuncts) {
        return SparqlQueryGenerator_1.conjunctsToQueryPatterns(this.config.baseConfig, this.getProjectionVariable(this.queries.baseQuery), this.config.domain, conjuncts);
    };
    return FacetStore;
}());
exports.FacetStore = FacetStore;
function generateFacetValuePatternFromRelation(config, relation) {
    var relationPatterns = SparqlQueryGenerator_1.tryGetRelationPatterns(config.baseConfig, relation)
        .filter(function (p) { return p.kind === 'resource' || p.kind === 'literal'; });
    var patternConfig = relationPatterns.length === 1 ? relationPatterns[0] : undefined;
    if (relationPatterns.length > 1) {
        console.warn("Found multiple matching patterns for facet relation " + relation.iri);
    }
    var _a = patternConfig || {}, _b = _a.kind, kind = _b === void 0 ? 'resource' : _b, queryPattern = _a.queryPattern;
    if (queryPattern === undefined) {
        queryPattern = (kind === 'resource' ? SearchDefaults.DefaultFacetValuesQueries.ResourceRelationPattern :
            kind === 'literal' ? SearchDefaults.DefaultFacetValuesQueries.LiteralRelationPattern :
                assertHandledEveryPatternKind(kind));
    }
    var query = sparql_1.SparqlUtil.parseQuery(getDefaultValuesQuery(config.config, kind));
    var parsed = sparql_1.SparqlUtil.parsePatterns(queryPattern, query.prefixes);
    var facetRelationPattern = transformRelationPatternForFacetValues(parsed, kind);
    new sparql_1.PatternBinder(SearchConfig_1.FACET_VARIABLES.RELATION_PATTERN_VAR, facetRelationPattern)
        .sparqlQuery(query);
    var valuesQuery = sparql_1.SparqlUtil.serializeQuery(query);
    return (kind === 'resource' ? { kind: 'resource', valuesQuery: valuesQuery } :
        kind === 'literal' ? { kind: 'literal', valuesQuery: valuesQuery } :
            assertHandledEveryPatternKind(kind));
}
function getDefaultValuesQuery(config, kind) {
    var defaultQueries = SearchDefaults.DefaultFacetValuesQueries;
    return (kind === 'resource' ? (config.defaultValueQueries.resource || defaultQueries.forResource()) :
        kind === 'literal' ? (config.defaultValueQueries.literal || defaultQueries.forLiteral()) :
            assertHandledEveryPatternKind(kind));
}
function transformRelationPatternForFacetValues(pattern, kind) {
    var binder;
    if (kind === 'resource') {
        binder = new sparql_1.VariableRenameBinder(SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.RESOURCE_VAR, SearchConfig_1.FACET_VARIABLES.VALUE_RESOURCE_VAR);
    }
    else if (kind === 'literal') {
        binder = new sparql_1.VariableRenameBinder(SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.LITERAL_VAR, SearchConfig_1.FACET_VARIABLES.VALUE_LITERAL);
    }
    else {
        assertHandledEveryPatternKind(kind);
    }
    var clonedPattern = _.cloneDeep(pattern);
    clonedPattern.forEach(function (p) { return binder.pattern(p); });
    return clonedPattern;
}
function assertHandledEveryPatternKind(kind) {
    throw new Error("Unexpected pattern kind: " + kind);
}
