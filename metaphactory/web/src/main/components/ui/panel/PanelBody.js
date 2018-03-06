Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var PanelBody = (function (_super) {
    tslib_1.__extends(PanelBody, _super);
    function PanelBody() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PanelBody.prototype.render = function () {
        return React.Children.only(this.props.children);
    };
    return PanelBody;
}(React.Component));
exports.PanelBody = PanelBody;
exports.default = PanelBody;
