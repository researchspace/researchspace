Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var rdf_1 = require("platform/api/rdf");
var resource_label_1 = require("platform/api/services/resource-label");
var SemanticSearchApi_1 = require("platform/components/semantic/search/web-components/SemanticSearchApi");
var SemanticSearchUseResultItemInExtendedSearchAction = (function (_super) {
    tslib_1.__extends(SemanticSearchUseResultItemInExtendedSearchAction, _super);
    function SemanticSearchUseResultItemInExtendedSearchAction() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.onClick = function () {
            var iri = rdf_1.Rdf.iri(_this.props.iri);
            resource_label_1.getLabel(iri).onValue(function (label) {
                return _this.context.useInExtendedFcFrSearch({
                    value: {
                        iri: iri,
                        label: label,
                        description: label,
                        tuple: {},
                    }, range: _this.context.domain.get(),
                });
            });
        };
        return _this;
    }
    SemanticSearchUseResultItemInExtendedSearchAction.prototype.render = function () {
        var child = React.Children.only(this.props.children);
        var props = {
            onClick: this.onClick,
        };
        return React.cloneElement(child, props);
    };
    return SemanticSearchUseResultItemInExtendedSearchAction;
}(React.Component));
SemanticSearchUseResultItemInExtendedSearchAction.contextTypes = SemanticSearchApi_1.ResultContextTypes;
exports.SemanticSearchUseResultItemInExtendedSearchAction = SemanticSearchUseResultItemInExtendedSearchAction;
exports.default = SemanticSearchUseResultItemInExtendedSearchAction;
