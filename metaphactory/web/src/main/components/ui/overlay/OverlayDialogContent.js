Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var OverlayContent = (function (_super) {
    tslib_1.__extends(OverlayContent, _super);
    function OverlayContent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    OverlayContent.prototype.render = function () {
        return react_1.DOM.div({}, this.props.children);
    };
    return OverlayContent;
}(react_1.Component));
exports.component = OverlayContent;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
