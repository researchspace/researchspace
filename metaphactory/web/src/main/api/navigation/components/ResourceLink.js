Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var lodash_1 = require("lodash");
var classNames = require("classnames");
var Maybe = require("data.maybe");
var _ = require("lodash");
var components_1 = require("platform/api/components");
var dnd_1 = require("platform/components/dnd");
var Navigation_1 = require("../Navigation");
var ResourceLinkAction;
(function (ResourceLinkAction) {
    ResourceLinkAction[ResourceLinkAction["edit"] = 0] = "edit";
})(ResourceLinkAction = exports.ResourceLinkAction || (exports.ResourceLinkAction = {}));
var ResourceLink = (function (_super) {
    tslib_1.__extends(ResourceLink, _super);
    function ResourceLink(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.renderLink = function (url) {
            var _a = _this.props, title = _a.title, className = _a.className, activeClassName = _a.activeClassName, style = _a.style, resource = _a.resource, draggable = _a.draggable;
            var props = {
                href: url.toString(),
                title: title,
                className: classNames(className, (_b = {},
                    _b[activeClassName] = _this.isLinkActive(),
                    _b)),
                style: style,
                onClick: _this.onClick,
            };
            if (draggable === false) {
                return react_1.DOM.a(props, _this.props.children);
            }
            else {
                return react_1.createElement(dnd_1.Draggable, { iri: resource.value }, react_1.DOM.a(props, _this.props.children));
            }
            var _b;
        };
        _this.onClick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            var query = lodash_1.assign({
                action: ResourceLinkAction[_this.props.action],
            }, _this.props.params);
            Navigation_1.navigateToResource(_this.props.resource, query, _this.getRepository())
                .onValue(function () { });
        };
        _this.getRepository = function () {
            return _this.props.repository ? _this.props.repository :
                (_this.context.semanticContext ? _this.context.semanticContext.repository : undefined);
        };
        _this.isLinkActive = function () {
            var _a = _this.props, resource = _a.resource, params = _a.params;
            var urlParams = lodash_1.assign({}, params);
            if (!_.isUndefined(_this.props.action)) {
                urlParams['action'] = ResourceLinkAction[_this.props.action];
            }
            var currentUrlParms = lodash_1.assign({}, Navigation_1.getCurrentUrl().search(true));
            delete currentUrlParms.uri;
            return Navigation_1.getCurrentResource().equals(resource) &&
                _.isEqual(currentUrlParms, urlParams);
        };
        _this.state = {
            url: Maybe.Nothing(),
            label: Maybe.Nothing(),
        };
        return _this;
    }
    ResourceLink.prototype.componentDidMount = function () {
        var _this = this;
        Navigation_1.constructUrlForResource(this.props.resource, this.props.params, this.getRepository())
            .onValue(function (url) { return _this.setState({ url: Maybe.Just(url) }); });
    };
    ResourceLink.prototype.render = function () {
        return this.state.url.map(this.renderLink).getOrElse(react_1.DOM.a());
    };
    return ResourceLink;
}(components_1.Component));
exports.ResourceLink = ResourceLink;
