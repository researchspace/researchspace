Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Maybe = require("data.maybe");
var react_1 = require("react");
var components_1 = require("platform/api/components");
var navigation_1 = require("platform/api/navigation");
var SetManagementApi_1 = require("../SetManagementApi");
var ManageSetAction = (function (_super) {
    tslib_1.__extends(ManageSetAction, _super);
    function ManageSetAction() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.onClick = function () {
            var setIri = _this.context['mp-set-management--set-view'].getCurrentSet();
            var repository = Maybe.fromNullable(_this.context.semanticContext).map(function (c) { return c.repository; }).getOrElse(undefined);
            navigation_1.navigateToResource(setIri, {}, repository).onEnd(function () { });
            closeAllOpenBootstrapDropdowns();
        };
        return _this;
    }
    ManageSetAction.prototype.render = function () {
        var child = react_1.Children.only(this.props.children);
        return react_1.cloneElement(child, { onClick: this.onClick });
    };
    return ManageSetAction;
}(components_1.Component));
ManageSetAction.contextTypes = tslib_1.__assign({}, SetManagementApi_1.SetManagementContextTypes, SetManagementApi_1.SetViewContextTypes, components_1.Component.contextTypes);
exports.ManageSetAction = ManageSetAction;
function closeAllOpenBootstrapDropdowns() {
    document.dispatchEvent(new MouseEvent('click'));
}
exports.default = ManageSetAction;
