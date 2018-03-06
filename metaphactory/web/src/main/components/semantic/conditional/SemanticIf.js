Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var components_1 = require("platform/api/components");
var async_1 = require("platform/api/async");
var sparql_1 = require("platform/api/sparql");
var notification_1 = require("platform/components/ui/notification");
var spinner_1 = require("platform/components/ui/spinner");
var template_1 = require("platform/components/ui/template");
var SemanticIf = (function (_super) {
    tslib_1.__extends(SemanticIf, _super);
    function SemanticIf(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.cancellation = new async_1.Cancellation();
        _this.state = { loading: true };
        return _this;
    }
    SemanticIf.prototype.componentDidMount = function () {
        var _this = this;
        var askQuery;
        try {
            askQuery = parseAskQuery(this.props.query);
        }
        catch (error) {
            this.setState({ loading: false, error: error });
            return;
        }
        var semanticContext = this.context.semanticContext;
        this.cancellation.map(sparql_1.SparqlClient.ask(askQuery, { context: semanticContext })).observe({
            value: function (askResult) { return _this.setState({ loading: false, askResult: askResult }); },
            error: function (error) { return _this.setState({ loading: false, error: error }); },
        });
    };
    SemanticIf.prototype.getTemplate = function (key) {
        var propsTemplate = this.props[key];
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
    SemanticIf.prototype.render = function () {
        if (this.state.loading) {
            return React.createElement(spinner_1.Spinner, null);
        }
        else if (this.state.error) {
            return React.createElement(notification_1.ErrorNotification, { errorMessage: this.state.error });
        }
        else {
            var askResult = this.state.askResult;
            var template = this.getTemplate(askResult ? 'then' : 'else');
            return template ? React.createElement(template_1.TemplateItem, { template: { source: template } }) : null;
        }
    };
    return SemanticIf;
}(components_1.Component));
exports.SemanticIf = SemanticIf;
function parseAskQuery(queryText) {
    if (!queryText) {
        throw new Error('Missing ASK Sparql query for <semantic-if>');
    }
    var query = sparql_1.SparqlUtil.parseQuery(queryText);
    if (query.type !== 'query' || query.queryType !== 'ASK') {
        throw new Error('Sparql query must be an ASK query');
    }
    return query;
}
exports.default = SemanticIf;
