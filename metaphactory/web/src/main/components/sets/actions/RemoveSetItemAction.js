Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var SetManagementApi_1 = require("../SetManagementApi");
var RemoveSetItemAction = (function (_super) {
    tslib_1.__extends(RemoveSetItemAction, _super);
    function RemoveSetItemAction() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.onClick = function () {
            return _this.context['mp-set-management'].removeSetItem(_this.context['mp-set-management--set-view'].getCurrentSet(), _this.context['mp-set-management--set-item-view'].getItem());
        };
        return _this;
    }
    RemoveSetItemAction.prototype.render = function () {
        var child = react_1.Children.only(this.props.children);
        var props = { onClick: this.onClick };
        return react_1.cloneElement(child, props);
    };
    return RemoveSetItemAction;
}(react_1.Component));
RemoveSetItemAction.contextTypes = tslib_1.__assign({}, SetManagementApi_1.SetManagementContextTypes, SetManagementApi_1.SetViewContextTypes, SetManagementApi_1.SetItemViewContextTypes);
exports.RemoveSetItemAction = RemoveSetItemAction;
exports.default = RemoveSetItemAction;
