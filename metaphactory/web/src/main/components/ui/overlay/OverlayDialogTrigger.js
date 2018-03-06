Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var OverlayTrigger = (function (_super) {
    tslib_1.__extends(OverlayTrigger, _super);
    function OverlayTrigger() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    OverlayTrigger.prototype.render = function () {
        return react_1.DOM.div({}, this.props.children);
    };
    return OverlayTrigger;
}(react_1.Component));
exports.OverlayTrigger = OverlayTrigger;
exports.component = OverlayTrigger;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
