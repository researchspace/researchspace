Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var assign = require("object-assign");
var SplitPaneToggleOffComponent = (function (_super) {
    tslib_1.__extends(SplitPaneToggleOffComponent, _super);
    function SplitPaneToggleOffComponent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SplitPaneToggleOffComponent.prototype.render = function () {
        var child = react_1.Children.only(this.props.children);
        var style = assign({}, { cursor: 'pointer' }, child.props.style);
        return react_1.cloneElement(child, { onClick: this.props.onClick, style: style });
    };
    return SplitPaneToggleOffComponent;
}(react_1.Component));
exports.SplitPaneToggleOffComponent = SplitPaneToggleOffComponent;
exports.component = SplitPaneToggleOffComponent;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
