Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var classNames = require("classnames");
var template_1 = require("platform/components/ui/template");
require("../scss/collapsible-component.scss");
var CollapsibleComponent = (function (_super) {
    tslib_1.__extends(CollapsibleComponent, _super);
    function CollapsibleComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.onCollapse = function () {
            return _this.setState({ containerOpen: false });
        };
        _this.onToggleCollapsed = function () {
            return _this.setState({ containerOpen: !_this.state.containerOpen });
        };
        _this.state = {
            containerOpen: false,
        };
        return _this;
    }
    CollapsibleComponent.prototype.render = function () {
        var toggleClasses = classNames('rs-collapsible__toggle', {
            'open': this.state.containerOpen,
            'closed': !this.state.containerOpen,
        });
        var contentClasses = classNames('rs-collapsible__content', {
            'show': this.state.containerOpen,
            'hidden': !this.state.containerOpen,
        });
        var child = React.Children.only(this.props.children);
        return React.createElement("div", null,
            React.createElement("div", { onClick: this.onToggleCollapsed, className: toggleClasses },
                React.createElement(template_1.TemplateItem, { template: { source: this.props.toggleCollapsibleTemplate } })),
            React.createElement("div", { className: contentClasses }, React.cloneElement(child, { cancelCallback: this.onCollapse })));
    };
    return CollapsibleComponent;
}(React.Component));
CollapsibleComponent.defaultProps = {
    toggleCollapsibleTemplate: "<div>\n        <i className=\"fa fa-pencil\"></i>\n        <strong>\n          <a>Create new...</a>\n        </strong>\n      </div>",
};
exports.CollapsibleComponent = CollapsibleComponent;
exports.default = CollapsibleComponent;
