Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var TextTruncateExpandCollapseComponent = (function (_super) {
    tslib_1.__extends(TextTruncateExpandCollapseComponent, _super);
    function TextTruncateExpandCollapseComponent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TextTruncateExpandCollapseComponent.prototype.render = function () {
        var child = react_1.Children.only(this.props.children);
        return react_1.cloneElement(child, { onClick: this.props.onClick });
    };
    return TextTruncateExpandCollapseComponent;
}(react_1.Component));
exports.TextTruncateExpandCollapseComponent = TextTruncateExpandCollapseComponent;
exports.component = TextTruncateExpandCollapseComponent;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
