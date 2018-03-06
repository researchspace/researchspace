Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var PopoverTriggerComponent = (function (_super) {
    tslib_1.__extends(PopoverTriggerComponent, _super);
    function PopoverTriggerComponent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PopoverTriggerComponent.prototype.render = function () {
        var _a = this.props, className = _a.className, style = _a.style;
        return react_1.DOM.div({ className: className, style: style }, this.props.children);
    };
    return PopoverTriggerComponent;
}(react_1.Component));
exports.PopoverTriggerComponent = PopoverTriggerComponent;
exports.component = PopoverTriggerComponent;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
