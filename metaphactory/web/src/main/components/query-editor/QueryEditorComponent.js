Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var components_1 = require("platform/api/components");
var ReactBootstrap = require("react-bootstrap");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var navigation_1 = require("platform/api/navigation");
var ldp_query_1 = require("platform/api/services/ldp-query");
var QueryValidatorComponent_1 = require("./QueryValidatorComponent");
var FormGroup = react_1.createFactory(ReactBootstrap.FormGroup);
var Alert = react_1.createFactory(ReactBootstrap.Alert);
var Button = react_1.createFactory(ReactBootstrap.Button);
var QueryValidator = react_1.createFactory(QueryValidatorComponent_1.QueryValidatorComponent);
var SELECT_TEMPLATE_COUNT_QUERY = "PREFIX spin: <http://spinrdf.org/spin#>\nSELECT (COUNT(?template) as ?templateCount) WHERE {\n  ?template spin:body ?query\n}";
var QueryEditorComponent = (function (_super) {
    tslib_1.__extends(QueryEditorComponent, _super);
    function QueryEditorComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.createQuery = function () {
            _this.queryService.addItem(_this.state.query).onValue(function (iri) { return navigation_1.navigateToResource(iri).onValue(function () { }); }).onError(function () { });
        };
        _this.updateQuery = function () {
            var iri = rdf_1.Rdf.iri(_this.props.iri);
            return _this.queryService.updateItem(iri, _this.state.query).onValue(function () { }).onError(function () { });
        };
        _this.onChangeQuery = function (query, isValid) {
            _this.setState({ query: query, isValid: isValid });
        };
        var semanticContext = _this.context.semanticContext;
        _this.queryService = ldp_query_1.QueryService(semanticContext);
        _this.state = { isValid: false };
        return _this;
    }
    QueryEditorComponent.prototype.componentDidMount = function () {
        var _this = this;
        var iri = this.props.iri;
        if (iri) {
            this.getQueryTemplateCount(iri).onValue(function (templateCount) {
                _this.setState({ templateCount: templateCount });
            });
        }
    };
    QueryEditorComponent.prototype.getQueryTemplateCount = function (iri) {
        var query = sparql_1.SparqlClient.setBindings(sparql_1.SparqlUtil.parseQuery(SELECT_TEMPLATE_COUNT_QUERY), { 'query': rdf_1.Rdf.iri(iri) });
        var context = this.context.semanticContext;
        return sparql_1.SparqlClient.select(query, { context: context }).map(function (res) {
            return parseInt(res.results.bindings[0]['templateCount'].value);
        });
    };
    QueryEditorComponent.prototype.render = function () {
        var iri = this.props.iri;
        var _a = this.state, isValid = _a.isValid, templateCount = _a.templateCount;
        return react_1.DOM.div({}, FormGroup({}, templateCount
            ? Alert({ bsStyle: 'warning' }, react_1.DOM.strong({}, 'Warning! '), "This query is used in " + templateCount + " templates.\n              Modifications to the query below may break existing templates.")
            : null, QueryValidator({
            iri: this.props.iri,
            onChange: this.onChangeQuery,
        })), Button({
            bsStyle: 'success',
            disabled: !isValid,
            onClick: iri ? this.updateQuery : this.createQuery,
        }, iri ? 'Update' : 'Create'));
    };
    return QueryEditorComponent;
}(components_1.Component));
exports.QueryEditorComponent = QueryEditorComponent;
exports.component = QueryEditorComponent;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
