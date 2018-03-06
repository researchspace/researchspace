Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var classnames = require("classnames");
var Footer = (function (_super) {
    tslib_1.__extends(Footer, _super);
    function Footer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Footer.prototype.render = function () {
        var _a = this.props, baseClass = _a.baseClass, readonly = _a.readonly, itemViewMode = _a.itemViewMode, onModeChanged = _a.onModeChanged, isReordering = _a.isReordering, canReorder = _a.canReorder;
        return (React.createElement("div", { className: baseClass + "__footer" },
            (isReordering && canReorder) ? React.createElement(ReorderConfirmation, tslib_1.__assign({}, this.props)) : null,
            React.createElement("div", { className: baseClass + "__footer-buttons", role: 'group' },
                React.createElement(ItemViewModeSwitch, { baseClass: baseClass, mode: itemViewMode, onModeChanged: onModeChanged }),
                (!readonly && canReorder) ? React.createElement(ReorderItemsButton, tslib_1.__assign({}, this.props)) : null,
                React.createElement("div", { className: baseClass + "__footer-spacer" }),
                readonly ? null : this.renderAddNewSetButton())));
    };
    Footer.prototype.renderAddNewSetButton = function () {
        return React.createElement("div", { className: 'btn-group btn-group-xs', role: 'group' },
            React.createElement("button", { type: 'button', title: 'Create new set', className: 'btn btn-default', onClick: this.props.onPressCreateNewSet },
                React.createElement("i", { className: 'fa fa-plus' }),
                "\u00A0",
                React.createElement("i", { className: 'fa fa-folder fa-lg' })));
    };
    return Footer;
}(React.Component));
exports.Footer = Footer;
var ReorderItemsButton = (function (_super) {
    tslib_1.__extends(ReorderItemsButton, _super);
    function ReorderItemsButton() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ReorderItemsButton.prototype.render = function () {
        var _a = this.props, baseClass = _a.baseClass, isReordering = _a.isReordering, onPressReorder = _a.onPressReorder;
        return (React.createElement("div", { className: "btn-group btn-group-xs " + baseClass + "__toggle-reorder-items", role: 'group' },
            React.createElement("button", { type: 'button', title: 'Reorder items', "aria-pressed": isReordering, className: classnames({ 'btn btn-default': true, active: isReordering }), onClick: onPressReorder },
                React.createElement("i", { className: 'fa fa-lg fa-random' }))));
    };
    return ReorderItemsButton;
}(React.Component));
exports.ReorderItemsButton = ReorderItemsButton;
var ReorderConfirmation = (function (_super) {
    tslib_1.__extends(ReorderConfirmation, _super);
    function ReorderConfirmation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ReorderConfirmation.prototype.render = function () {
        var _a = this.props, baseClass = _a.baseClass, onPressReorder = _a.onPressReorder, onPressReorderApply = _a.onPressReorderApply;
        return (React.createElement("div", { className: baseClass + "__footer-reorder-confirmation" },
            React.createElement("div", { className: baseClass + "__footer-reorder-message" }, "Drag items to reorder"),
            React.createElement("div", { className: baseClass + "__footer-reorder-buttons" },
                React.createElement("button", { type: 'button', title: 'Cancel reordering items', className: "btn btn-xs btn-danger " + baseClass + "__footer-reorder-cancel", onClick: onPressReorder }, "Cancel"),
                React.createElement("button", { type: 'button', title: 'Save items order', className: 'btn btn-xs btn-success', onClick: onPressReorderApply }, "Save changes"))));
    };
    return ReorderConfirmation;
}(React.Component));
exports.ReorderConfirmation = ReorderConfirmation;
var ItemViewModeSwitch = (function (_super) {
    tslib_1.__extends(ItemViewModeSwitch, _super);
    function ItemViewModeSwitch() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ItemViewModeSwitch.prototype.render = function () {
        var baseClass = this.props.baseClass;
        var className = baseClass + "__item-view-mode btn-group btn-group-xs";
        return React.createElement("div", { className: className, role: 'group' },
            this.renderModeButton('grid', 'Switch to grid view', React.createElement("span", { className: 'fa fa-lg fa-th' })),
            this.renderModeButton('list', 'Switch to list view', React.createElement("span", { className: 'fa fa-lg fa-th-list' })));
    };
    ItemViewModeSwitch.prototype.renderModeButton = function (mode, title, children) {
        var _this = this;
        var isPressed = mode === this.props.mode;
        return React.createElement("button", { key: mode, type: 'button', title: title, className: classnames({ 'btn btn-default': true, 'active': isPressed }), "aria-pressed": isPressed, onClick: isPressed ? undefined : function () { return _this.props.onModeChanged(mode); } }, children);
    };
    return ItemViewModeSwitch;
}(React.Component));
exports.ItemViewModeSwitch = ItemViewModeSwitch;
