Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var _ = require("lodash");
var react_bootstrap_1 = require("react-bootstrap");
var PanelHeader_1 = require("./PanelHeader");
var PanelFooter_1 = require("./PanelFooter");
var PanelBody_1 = require("./PanelBody");
var Panel = (function (_super) {
    tslib_1.__extends(Panel, _super);
    function Panel() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.findComponent = function (children, component) {
            var element = _.find(children, function (child) { return child.type === component; });
            return element;
        };
        return _this;
    }
    Panel.prototype.render = function () {
        var children = react_1.Children.toArray(this.props.children);
        var header = this.findComponent(children, PanelHeader_1.PanelHeader);
        var body = this.findComponent(children, PanelBody_1.PanelBody);
        var footer = this.findComponent(children, PanelFooter_1.PanelFooter);
        return React.createElement(react_bootstrap_1.Panel, tslib_1.__assign({}, this.props, { header: header, footer: footer }), body);
    };
    return Panel;
}(react_1.Component));
exports.Panel = Panel;
exports.default = Panel;
