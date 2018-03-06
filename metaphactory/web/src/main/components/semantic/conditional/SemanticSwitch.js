Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var components_1 = require("platform/api/components");
var async_1 = require("platform/api/async");
var sparql_1 = require("platform/api/sparql");
var notification_1 = require("platform/components/ui/notification");
var spinner_1 = require("platform/components/ui/spinner");
var template_1 = require("platform/components/ui/template");
var SemanticSwitch = (function (_super) {
    tslib_1.__extends(SemanticSwitch, _super);
    function SemanticSwitch(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.cancellation = new async_1.Cancellation();
        _this.state = { loading: true };
        return _this;
    }
    SemanticSwitch.prototype.componentDidMount = function () {
        var _this = this;
        var switchQuery;
        try {
            switchQuery = parseSwitchSelectQuery(this.props.query);
        }
        catch (error) {
            this.setState({ loading: false, error: error });
            return;
        }
        var semanticContext = this.context.semanticContext;
        this.cancellation.map(sparql_1.SparqlClient.select(switchQuery, { context: semanticContext })).observe({
            value: function (result) { return _this.setResultCase(result); },
            error: function (error) { return _this.setState({ loading: false, error: error }); },
        });
    };
    SemanticSwitch.prototype.getCaseTemplate = function (key) {
        var propsTemplate = this.props.cases[key];
        if (propsTemplate) {
            return propsTemplate;
        }
        var markupTemplateScope = this.props.markupTemplateScope;
        var localScope = markupTemplateScope ? markupTemplateScope.getOrElse(undefined) : undefined;
        var partial = localScope ? localScope.getPartial(key) : undefined;
        if (partial) {
            return partial.source;
        }
        return undefined;
    };
    SemanticSwitch.prototype.setResultCase = function (result) {
        if (result.results.bindings.length === 0) {
            this.setState({ loading: false });
        }
        else {
            var firstBidning = result.results.bindings[0];
            var caseNode = firstBidning[result.head.vars[0]];
            var selectedCase = caseNode ? caseNode.value : undefined;
            this.setState({ loading: false, selectedCase: selectedCase });
        }
    };
    SemanticSwitch.prototype.render = function () {
        if (this.state.loading) {
            return React.createElement(spinner_1.Spinner, null);
        }
        else if (this.state.error) {
            return React.createElement(notification_1.ErrorNotification, { errorMessage: this.state.error });
        }
        else {
            var template = this.getCaseTemplate(this.state.selectedCase);
            var withFallback = template === undefined
                ? this.getCaseTemplate('default') : template;
            return withFallback
                ? React.createElement(template_1.TemplateItem, { template: { source: withFallback } }) : null;
        }
    };
    return SemanticSwitch;
}(components_1.Component));
SemanticSwitch.defaultProps = {
    cases: {},
};
exports.SemanticSwitch = SemanticSwitch;
function parseSwitchSelectQuery(querySource) {
    if (!querySource) {
        throw new Error('Missing SELECT Sparql query for <semantic-switch>');
    }
    var query = sparql_1.SparqlUtil.parseQuery(querySource);
    if (query.type !== 'query' || query.queryType !== 'SELECT') {
        throw new Error('Sparql query must be a SELECT query');
    }
    if (sparql_1.SparqlTypeGuards.isStarProjection(query.variables) || query.variables.length !== 1) {
        throw new Error('SELECT query for <semantic-switch> ' +
            'must contain only a single projection variable');
    }
    return query;
}
exports.default = SemanticSwitch;
