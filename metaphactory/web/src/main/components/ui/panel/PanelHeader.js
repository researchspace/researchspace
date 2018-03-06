Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var PanelHeader = (function (_super) {
    tslib_1.__extends(PanelHeader, _super);
    function PanelHeader() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PanelHeader.prototype.render = function () {
        return React.Children.only(this.props.children);
    };
    return PanelHeader;
}(React.Component));
exports.PanelHeader = PanelHeader;
exports.default = PanelHeader;
