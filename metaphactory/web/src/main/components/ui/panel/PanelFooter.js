Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var PanelFooter = (function (_super) {
    tslib_1.__extends(PanelFooter, _super);
    function PanelFooter() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PanelFooter.prototype.render = function () {
        return React.Children.only(this.props.children);
    };
    return PanelFooter;
}(React.Component));
exports.PanelFooter = PanelFooter;
exports.default = PanelFooter;
