Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var _ = require("lodash");
var HideableLink = (function (_super) {
    tslib_1.__extends(HideableLink, _super);
    function HideableLink(props) {
        var _this = _super.call(this, props) || this;
        _this.state = { isVisible: true };
        return _this;
    }
    HideableLink.prototype.onClick = function () {
        this.props.onClick();
        this.setState({ isVisible: false });
    };
    HideableLink.prototype.render = function () {
        var css = !_.isUndefined(this.props.className) ? this.props.className : 'fa fa-angle-double-down pull-right';
        return this.state.isVisible ? react_1.DOM.i({ className: css }, react_1.DOM.a({ onClick: this.onClick.bind(this) }, this.props.linkText)) : null;
    };
    return HideableLink;
}(react_1.Component));
exports.HideableLink = HideableLink;
exports.default = HideableLink;
