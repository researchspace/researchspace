Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var PrintSectionComponent = (function (_super) {
    tslib_1.__extends(PrintSectionComponent, _super);
    function PrintSectionComponent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PrintSectionComponent.prototype.render = function () {
        return react_1.DOM.div({ className: this.props.className, style: this.props.style }, this.props.children);
    };
    return PrintSectionComponent;
}(react_1.Component));
exports.PrintSectionComponent = PrintSectionComponent;
exports.component = PrintSectionComponent;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
