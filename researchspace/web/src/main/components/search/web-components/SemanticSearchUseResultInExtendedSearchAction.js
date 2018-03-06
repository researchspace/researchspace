Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var SemanticSearchApi_1 = require("platform/components/semantic/search/web-components/SemanticSearchApi");
var SearchSummary_1 = require("../query-builder/SearchSummary");
var SemanticSearchUseResultInExtendedSearchAction = (function (_super) {
    tslib_1.__extends(SemanticSearchUseResultInExtendedSearchAction, _super);
    function SemanticSearchUseResultInExtendedSearchAction() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.onClick = function () {
            return _this.context.resultQuery.map(function (query) {
                return _this.context.baseQueryStructure.map(function (queryStructure) {
                    return _this.context.useInExtendedFcFrSearch({
                        value: {
                            query: query,
                            label: SearchSummary_1.SearchSummary.summaryToString(queryStructure),
                        }, range: _this.context.domain.get(),
                    });
                });
            });
        };
        return _this;
    }
    SemanticSearchUseResultInExtendedSearchAction.prototype.render = function () {
        var child = React.Children.only(this.props.children);
        var props = {
            onClick: this.onClick,
        };
        return React.cloneElement(child, props);
    };
    return SemanticSearchUseResultInExtendedSearchAction;
}(React.Component));
SemanticSearchUseResultInExtendedSearchAction.contextTypes = SemanticSearchApi_1.ResultContextTypes;
exports.SemanticSearchUseResultInExtendedSearchAction = SemanticSearchUseResultInExtendedSearchAction;
exports.default = SemanticSearchUseResultInExtendedSearchAction;
