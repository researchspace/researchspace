Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var SplitPaneSidebarOpenComponent = (function (_super) {
    tslib_1.__extends(SplitPaneSidebarOpenComponent, _super);
    function SplitPaneSidebarOpenComponent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SplitPaneSidebarOpenComponent.prototype.render = function () {
        var _a = this.props, className = _a.className, style = _a.style;
        return react_1.DOM.div({ className: className, style: style }, this.props.children);
    };
    return SplitPaneSidebarOpenComponent;
}(react_1.Component));
exports.SplitPaneSidebarOpenComponent = SplitPaneSidebarOpenComponent;
exports.component = SplitPaneSidebarOpenComponent;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
