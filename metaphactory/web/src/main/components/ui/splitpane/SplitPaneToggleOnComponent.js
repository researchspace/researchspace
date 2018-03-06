Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var assign = require("object-assign");
var SplitPaneToggleOnComponent = (function (_super) {
    tslib_1.__extends(SplitPaneToggleOnComponent, _super);
    function SplitPaneToggleOnComponent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SplitPaneToggleOnComponent.prototype.render = function () {
        var child = react_1.Children.only(this.props.children);
        var style = assign({}, { cursor: 'pointer' }, child.props.style);
        return react_1.cloneElement(child, { onClick: this.props.onClick, style: style });
    };
    return SplitPaneToggleOnComponent;
}(react_1.Component));
exports.SplitPaneToggleOnComponent = SplitPaneToggleOnComponent;
exports.component = SplitPaneToggleOnComponent;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
