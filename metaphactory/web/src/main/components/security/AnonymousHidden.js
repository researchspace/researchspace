Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var _ = require("lodash");
var components_1 = require("platform/api/components");
var template_1 = require("platform/components/ui/template");
var security_1 = require("platform/api/services/security");
var AnonymousHiddenComponentClass = (function (_super) {
    tslib_1.__extends(AnonymousHiddenComponentClass, _super);
    function AnonymousHiddenComponentClass(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.state = {
            isAnonymous: null,
        };
        return _this;
    }
    AnonymousHiddenComponentClass.prototype.componentDidMount = function () {
        var _this = this;
        security_1.Util.isAnonymous(function (b) { return _this.setState({ isAnonymous: b }); });
    };
    AnonymousHiddenComponentClass.prototype.render = function () {
        var isAnonymous = this.state.isAnonymous;
        if (isAnonymous && !_.isUndefined(this.props.alt)) {
            return react_1.createElement(template_1.TemplateItem, { template: { source: this.props.alt } });
        }
        else if (isAnonymous === false) {
            return react_1.Children.only(this.props.children);
        }
        else {
            return null;
        }
    };
    return AnonymousHiddenComponentClass;
}(components_1.Component));
exports.AnonymousHiddenComponentClass = AnonymousHiddenComponentClass;
exports.component = AnonymousHiddenComponentClass;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
