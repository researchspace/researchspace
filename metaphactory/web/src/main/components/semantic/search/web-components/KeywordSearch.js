Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var Maybe = require("data.maybe");
var react_bootstrap_1 = require("react-bootstrap");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var components_1 = require("platform/api/components");
var utils_1 = require("platform/components/utils");
var Utils_1 = require("../commons/Utils");
var SemanticSearchApi_1 = require("./SemanticSearchApi");
var KeywordSearch = (function (_super) {
    tslib_1.__extends(KeywordSearch, _super);
    function KeywordSearch(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.keys = utils_1.Action();
        _this.initialize = function (query) {
            return _this.keys.$property
                .filter(function (str) { return str.length >= _this.props.minSearchTermLength; })
                .debounce(_this.props.debounce)
                .map(_this.buildQuery(query))
                .onValue(function (q) { return _this.context.setBaseQuery(Maybe.Just(q)); });
        };
        _this.onKeyPress = function (event) {
            return _this.keys(event.target.value);
        };
        _this.buildQuery = function (baseQuery) { return function (token) {
            var _a = _this.props, searchTermVariable = _a.searchTermVariable, escapeLuceneSyntax = _a.escapeLuceneSyntax;
            var value = escapeLuceneSyntax ? sparql_1.SparqlUtil.makeLuceneQuery(token) : rdf_1.Rdf.literal(token);
            return sparql_1.SparqlClient.setBindings(baseQuery, (_b = {}, _b[searchTermVariable] = value, _b));
            var _b;
        }; };
        _this.state = {
            value: undefined,
        };
        return _this;
    }
    KeywordSearch.prototype.componentDidMount = function () {
        Utils_1.setSearchDomain(this.props.domain, this.context);
        this.initialize(sparql_1.SparqlUtil.parseQuerySync(this.props.query));
    };
    KeywordSearch.prototype.componentWillReceiveProps = function (props, context) {
        if (context.searchProfileStore.isJust && context.domain.isNothing) {
            Utils_1.setSearchDomain(props.domain, context);
        }
    };
    KeywordSearch.prototype.render = function () {
        var _a = this.props, placeholder = _a.placeholder, style = _a.style, className = _a.className;
        return React.createElement(react_bootstrap_1.FormGroup, { controlId: 'semantic-search-text-input' },
            React.createElement(react_bootstrap_1.FormControl, { className: className, style: style, value: this.state.value, placeholder: placeholder, onChange: this.onKeyPress }));
    };
    return KeywordSearch;
}(components_1.Component));
KeywordSearch.contextTypes = tslib_1.__assign({}, components_1.ContextTypes, SemanticSearchApi_1.InitialQueryContextTypes);
KeywordSearch.defaultProps = {
    placeholder: 'type to search, minimum 3 symbols ...',
    searchTermVariable: '__token__',
    minSearchTermLength: 3,
    debounce: 300,
};
exports.default = KeywordSearch;
