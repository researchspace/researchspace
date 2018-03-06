Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var SetManagementApi_1 = require("../SetManagementApi");
var RenameSetAction = (function (_super) {
    tslib_1.__extends(RenameSetAction, _super);
    function RenameSetAction() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.onClick = function () {
            _this.context['mp-set-management'].startRenamingSet(_this.context['mp-set-management--set-view'].getCurrentSet());
        };
        return _this;
    }
    RenameSetAction.prototype.render = function () {
        var child = react_1.Children.only(this.props.children);
        return react_1.cloneElement(child, { onClick: this.onClick });
    };
    return RenameSetAction;
}(react_1.Component));
RenameSetAction.contextTypes = tslib_1.__assign({}, SetManagementApi_1.SetManagementContextTypes, SetManagementApi_1.SetViewContextTypes);
exports.RenameSetAction = RenameSetAction;
exports.default = RenameSetAction;
