Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var ReactBootstrap = require("react-bootstrap");
var _ = require("lodash");
var PopoverContentComponent_1 = require("./PopoverContentComponent");
var PopoverTriggerComponent_1 = require("./PopoverTriggerComponent");
var OverlayTrigger = react_1.createFactory(ReactBootstrap.OverlayTrigger);
var Popover = react_1.createFactory(ReactBootstrap.Popover);
var PopoverComponentClass = (function (_super) {
    tslib_1.__extends(PopoverComponentClass, _super);
    function PopoverComponentClass() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PopoverComponentClass.prototype.render = function () {
        var title = this.props.title;
        var children = react_1.Children.toArray(this.props.children);
        var triggerComponent = _.find(children, function (child) { return child.type === PopoverTriggerComponent_1.PopoverTriggerComponent; });
        var contentComponent = _.find(children, function (child) { return child.type === PopoverContentComponent_1.PopoverContentComponent; });
        var triggerChildren = react_1.Children.only(triggerComponent).props.children;
        var contentChildren = react_1.Children.only(contentComponent).props.children;
        var popover = Popover({ id: 'mp-popover', title: title }, contentChildren);
        var trigger = react_1.Children.only(triggerComponent).props.trigger;
        var placement = react_1.Children.only(triggerComponent).props.placement;
        var rootClose = react_1.Children.only(triggerComponent).props.rootClose;
        return OverlayTrigger({
            overlay: popover,
            trigger: trigger || ['click'],
            placement: placement,
            rootClose: rootClose || true,
        }, react_1.cloneElement(triggerChildren, {}));
    };
    return PopoverComponentClass;
}(react_1.Component));
exports.PopoverComponentClass = PopoverComponentClass;
exports.component = PopoverComponentClass;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
