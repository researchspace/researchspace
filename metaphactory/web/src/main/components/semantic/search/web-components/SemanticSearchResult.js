Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var _ = require("lodash");
var async_1 = require("platform/api/async");
var utils_1 = require("platform/components/utils");
var events_1 = require("platform/api/events");
var sparql_1 = require("platform/api/sparql");
var notification_1 = require("platform/components/ui/notification");
var results_1 = require("platform/components/semantic/results");
var SemanticSearchApi_1 = require("./SemanticSearchApi");
var SearchConfig_1 = require("../config/SearchConfig");
var SparqlQueryGenerator_1 = require("../data/search/SparqlQueryGenerator");
var SemanticSearchResult = (function (_super) {
    tslib_1.__extends(SemanticSearchResult, _super);
    function SemanticSearchResult(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.cancellation = new async_1.Cancellation();
        _this.listenToChildLoading = function (child) {
            if (child) {
                if (typeof child !== 'string' && child.props.id) {
                    _this.cancellation.map(_this.context.GLOBAL_EVENTS.listen({
                        eventType: events_1.BuiltInEvents.ComponentLoading,
                        source: child.props.id,
                    })).observe({
                        value: function (e) {
                            var isResultCount = utils_1.hasBaseDerivedRelationship(results_1.ResultsNumber, child);
                            _this.context.notifyResultLoading(isResultCount
                                ? { type: 'count', task: e.data }
                                : { type: 'other', task: e.data.map(function () { }) });
                        },
                    });
                }
                else {
                    _this.setState({
                        error: "semantic-search-result child component should have the 'id' property",
                    });
                }
            }
        };
        _this.buildResultQuery = function (props, context, query) {
            return context.resultQuery.map(function (subQuery) {
                var baseQuery = sparql_1.SparqlUtil.parseQuerySync(query);
                (_a = baseQuery.where).unshift.apply(_a, subQuery.where);
                var projectionVar = subQuery.variables[0];
                if (projectionVar.substring(1) !== SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.PROJECTION_ALIAS_VAR) {
                    baseQuery.where.push({
                        expression: projectionVar,
                        type: 'bind',
                        variable: ('?' + SearchConfig_1.SEMANTIC_SEARCH_VARIABLES.PROJECTION_ALIAS_VAR),
                    });
                }
                if (_this.context.baseConfig.limit) {
                    baseQuery.limit = _this.context.baseConfig.limit;
                }
                var queryWithBindings = sparql_1.SparqlClient.setBindings(baseQuery, _this.context.bindings);
                if (_.has(_this.context.bindings, SearchConfig_1.RESULT_VARIABLES.CONTEXT_RELATION_VAR)) {
                    _this.bindRelationPattern(queryWithBindings, _this.context.bindings);
                }
                return sparql_1.SparqlUtil.serializeQuery(queryWithBindings);
                var _a;
            });
        };
        _this.bindRelationPattern = function (query, bindings) {
            _this.context.searchProfileStore.map(function (profileStore) {
                var relation = profileStore.relations.get(bindings[SearchConfig_1.RESULT_VARIABLES.CONTEXT_RELATION_VAR]);
                var patternConfig = SparqlQueryGenerator_1.tryGetRelationPatterns(_this.context.baseConfig, relation).find(function (p) { return p.kind === 'resource' || p.kind === 'literal'; });
                if (patternConfig) {
                    var patterns = sparql_1.SparqlUtil.parsePatterns(patternConfig.queryPattern, query.prefixes);
                    new sparql_1.PatternBinder(SearchConfig_1.RESULT_VARIABLES.CONTEXT_RELATION_PATTERN_VAR, patterns)
                        .sparqlQuery(query);
                }
                return query;
            });
        };
        _this.state = {};
        return _this;
    }
    SemanticSearchResult.prototype.shouldComponentUpdate = function (props, state, context) {
        if (!_.isEqual(context.resultQuery.getOrElse(null), this.context.resultQuery.getOrElse(null)) ||
            !_.isEqual(context.bindings, this.context.bindings) || !_.isEqual(this.state, state)) {
            return true;
        }
        else {
            return false;
        }
    };
    SemanticSearchResult.prototype.componentWillUnmount = function () {
        this.cancellation.cancelAll();
    };
    SemanticSearchResult.prototype.render = function () {
        if (this.state.error) {
            return react_1.createElement(notification_1.ErrorNotification, { errorMessage: this.state.error });
        }
        else {
            return this.mapChildren(this.props.children);
        }
    };
    SemanticSearchResult.prototype.mapChildren = function (children) {
        var _this = this;
        return utils_1.universalChildren(react_1.Children.toArray(children).map(function (child) {
            if (_.isString(child) || _.isNumber(child)) {
                return child;
            }
            else {
                if (_.has(child.props, 'query')) {
                    var controlled_1 = _this.tryMakeControlled(child);
                    return _this.buildResultQuery(_this.props, _this.context, child.props.query).map(function (query) { return _this.updateChildQuery(controlled_1, query); }).getOrElse(null);
                }
                else {
                    return react_1.cloneElement(child, child.props, _this.mapChildren(child.props.children));
                }
            }
        }));
    };
    SemanticSearchResult.prototype.tryMakeControlled = function (child) {
        var _this = this;
        if (utils_1.hasControlledProps(child.type) && child.props.id) {
            var handler = {
                onControlledPropChange: function (propsChange) {
                    _this.context.updateResultState(child.props.id, propsChange);
                },
            };
            var controlledProps = this.context.resultState[child.props.id] || {};
            return react_1.cloneElement(child, tslib_1.__assign({}, controlledProps, handler));
        }
        return child;
    };
    SemanticSearchResult.prototype.updateChildQuery = function (child, newQuery) {
        this.listenToChildLoading(child);
        var newConfig = _.assign({}, child.props, { query: newQuery });
        return react_1.cloneElement(child, newConfig, child.props.children);
    };
    return SemanticSearchResult;
}(react_1.Component));
SemanticSearchResult.contextTypes = tslib_1.__assign({}, SemanticSearchApi_1.ResultContextTypes, events_1.GlobalEventsContextTypes);
exports.default = SemanticSearchResult;
