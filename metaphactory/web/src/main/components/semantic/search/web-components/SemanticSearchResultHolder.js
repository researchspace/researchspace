Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var SemanticSearchApi_1 = require("./SemanticSearchApi");
var SemanticSearchResultHolder = (function (_super) {
    tslib_1.__extends(SemanticSearchResultHolder, _super);
    function SemanticSearchResultHolder() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SemanticSearchResultHolder.prototype.render = function () {
        var child = react_1.Children.only(this.props.children);
        return this.context.resultQuery.map(function (query) { return child; }).getOrElse(null);
    };
    return SemanticSearchResultHolder;
}(react_1.Component));
SemanticSearchResultHolder.contextTypes = SemanticSearchApi_1.ResultContextTypes;
exports.default = SemanticSearchResultHolder;
