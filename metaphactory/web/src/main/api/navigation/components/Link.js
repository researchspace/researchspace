Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var classNames = require("classnames");
var uri = require("urijs");
var _ = require("lodash");
var Navigation_1 = require("../Navigation");
var NavigationUtils_1 = require("../NavigationUtils");
var LinkComponent = (function (_super) {
    tslib_1.__extends(LinkComponent, _super);
    function LinkComponent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.onClick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            Navigation_1.navigateToUrl(_this.constructUrl(_this.props)).onValue(function () { });
        };
        return _this;
    }
    LinkComponent.prototype.render = function () {
        var _a = this.props, title = _a.title, className = _a.className, activeClassName = _a.activeClassName;
        var props = {
            title: title,
            className: classNames(className, (_b = {},
                _b[activeClassName] = this.isLinkActive(this.props),
                _b)),
            onClick: this.onClick,
        };
        return react_1.DOM.a(props, this.props.children);
        var _b;
    };
    LinkComponent.prototype.constructUrl = function (props) {
        var url = props.url;
        var query = NavigationUtils_1.extractParams(props);
        return uri(url).setSearch(query);
    };
    LinkComponent.prototype.isLinkActive = function (props) {
        var url = this.constructUrl(props);
        return Navigation_1.getCurrentUrl().equals(url) &&
            (_.isUndefined(this.props.active) ? true : this.props.active);
    };
    return LinkComponent;
}(react_1.Component));
exports.LinkComponent = LinkComponent;
exports.default = LinkComponent;
