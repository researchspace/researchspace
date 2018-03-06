Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var lodash_1 = require("lodash");
var components_1 = require("platform/api/components");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var notification_1 = require("platform/components/ui/notification");
var async_1 = require("platform/api/async");
var ldp_query_template_1 = require("platform/api/services/ldp-query-template");
var ldp_query_1 = require("platform/api/services/ldp-query");
var spinner_1 = require("platform/components/ui/spinner");
var SparqlQueryEditorContext_1 = require("./SparqlQueryEditorContext");
var QueryCatalogTemplate = (function (_super) {
    tslib_1.__extends(QueryCatalogTemplate, _super);
    function QueryCatalogTemplate(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.cancellation = new async_1.Cancellation();
        _this.applyingTemplate = _this.cancellation.derive();
        _this.fetchAndSetQuery = function () {
            if (_this.state.fetchingQuery) {
                return;
            }
            var queryEditorContext = _this.context.queryEditorContext;
            if (!queryEditorContext) {
                return;
            }
            _this.applyingTemplate.cancelAll();
            _this.applyingTemplate = _this.cancellation.derive();
            _this.applyingTemplate.map(_this.fetchTemplateWithQuery()).observe({
                value: function (_a) {
                    var template = _a[0], query = _a[1];
                    var parametrizedQuery;
                    try {
                        parametrizedQuery = sparql_1.SparqlUtil.serializeQuery(applyDefaultArguments(query, template));
                    }
                    catch (e) {
                        notification_1.addNotification({
                            level: 'warning',
                            message: 'Failed to substitute default values for query template arguments',
                        }, e);
                        parametrizedQuery = query.value;
                    }
                    queryEditorContext.setQuery(parametrizedQuery);
                    _this.setState({ fetchingQuery: false });
                },
                error: function (error) {
                    notification_1.addNotification({
                        level: 'error',
                        message: 'Failed to fetch query template',
                    }, error);
                    _this.setState({ fetchingQuery: false });
                },
            });
            _this.setState({ fetchingQuery: true });
        };
        _this.state = {};
        var semanticContext = _this.context.semanticContext;
        _this.queryTemplateService = ldp_query_template_1.QueryTemplateService(semanticContext);
        _this.queryService = ldp_query_1.QueryService(semanticContext);
        return _this;
    }
    QueryCatalogTemplate.prototype.render = function () {
        return React.createElement("div", { onClick: this.fetchAndSetQuery },
            this.props.children,
            this.state.fetchingQuery ? React.createElement(spinner_1.Spinner, { spinnerDelay: 0 }) : null);
    };
    QueryCatalogTemplate.prototype.componentWillUnmount = function () {
        this.cancellation.cancelAll();
    };
    QueryCatalogTemplate.prototype.fetchTemplateWithQuery = function () {
        var _this = this;
        return this.queryTemplateService
            .getQueryTemplate(rdf_1.Rdf.iri(this.props.iri))
            .flatMap(function (_a) {
            var template = _a.template, queryIri = _a.queryIri;
            return _this.queryService
                .getQuery(rdf_1.Rdf.iri(queryIri))
                .map(function (query) { return [template, query]; });
        }).toProperty();
    };
    return QueryCatalogTemplate;
}(components_1.Component));
QueryCatalogTemplate.contextTypes = tslib_1.__assign({}, components_1.ContextTypes, SparqlQueryEditorContext_1.ContextTypes);
exports.QueryCatalogTemplate = QueryCatalogTemplate;
function applyDefaultArguments(query, template) {
    var parsedQuery = sparql_1.SparqlUtil.parseQuery(query.value);
    var argsWithDefaults = template.args.filter(function (arg) { return Boolean(arg.defaultValue); });
    if (argsWithDefaults.length === 0) {
        return parsedQuery;
    }
    var bindings = lodash_1.mapValues(lodash_1.keyBy(argsWithDefaults, function (arg) { return arg.variable; }), function (arg) { return arg.defaultValue; });
    return sparql_1.SparqlClient.setBindings(parsedQuery, bindings);
}
exports.default = QueryCatalogTemplate;
