Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var maybe = require("data.maybe");
var sparql_1 = require("platform/api/sparql");
var Utils_1 = require("../commons/Utils");
var SemanticSearchApi_1 = require("./SemanticSearchApi");
var QueryConstant = (function (_super) {
    tslib_1.__extends(QueryConstant, _super);
    function QueryConstant(props, context) {
        return _super.call(this, props, context) || this;
    }
    QueryConstant.prototype.componentDidMount = function () {
        var q = sparql_1.SparqlUtil.parseQuerySync(this.props.query);
        this.context.setBaseQuery(maybe.Just(q));
    };
    QueryConstant.prototype.componentWillReceiveProps = function (props, context) {
        if (context.searchProfileStore.isJust && context.domain.isNothing) {
            Utils_1.setSearchDomain(props.domain, context);
        }
    };
    QueryConstant.prototype.render = function () {
        return null;
    };
    return QueryConstant;
}(react_1.Component));
QueryConstant.contextTypes = SemanticSearchApi_1.InitialQueryContextTypes;
exports.QueryConstant = QueryConstant;
exports.default = QueryConstant;
