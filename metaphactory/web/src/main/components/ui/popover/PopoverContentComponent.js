Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var PopoverContentComponent = (function (_super) {
    tslib_1.__extends(PopoverContentComponent, _super);
    function PopoverContentComponent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PopoverContentComponent.prototype.render = function () {
        var _a = this.props, className = _a.className, style = _a.style;
        return react_1.DOM.div({ className: className, style: style }, this.props.children);
    };
    return PopoverContentComponent;
}(react_1.Component));
exports.PopoverContentComponent = PopoverContentComponent;
exports.component = PopoverContentComponent;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
