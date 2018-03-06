Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var _ = require("lodash");
var classnames = require("classnames");
var react_1 = require("react");
var components_1 = require("platform/api/components");
var notification_1 = require("platform/components/ui/notification");
var ComponentToolbarActions_1 = require("platform/components/persistence/ComponentToolbarActions");
var ComponentToolbarComponent_1 = require("platform/components/persistence/ComponentToolbarComponent");
var ComponentToolbarApi_1 = require("./ComponentToolbarApi");
var styles = require("./ComponentToolbar.scss");
var ComponentToolbarComponent = (function (_super) {
    tslib_1.__extends(ComponentToolbarComponent, _super);
    function ComponentToolbarComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.overrideComponentProps = function (props) {
            _this.setState({ propsOverride: props });
        };
        _this.state = {
            error: _this.checkTree(props),
            propsOverride: {},
        };
        return _this;
    }
    ComponentToolbarComponent.prototype.getChildContext = function () {
        return tslib_1.__assign({}, _super.prototype.getChildContext.call(this), { overrideProps: this.overrideComponentProps });
    };
    ComponentToolbarComponent.prototype.componentWillReceiveProps = function (props) {
        this.setState({ error: this.checkTree(props) });
    };
    ComponentToolbarComponent.prototype.checkTree = function (props) {
        if (props.children.length !== 2 ||
            !_.find(props.children, function (child) { return react_1.isValidElement(child) && child.type === ComponentToolbarActions_1.ComponentToolbarActionsComponent; }) ||
            !_.find(props.children, function (child) { return react_1.isValidElement(child) && child.type === ComponentToolbarComponent_1.ComponentToolbarComponentComponent; })) {
            return 'mp-component-toolbar should contain exactly 2 children: mp-component-toolbar-actions and mp-component-toolbar-component';
        }
        return null;
    };
    ComponentToolbarComponent.prototype.render = function () {
        if (this.state.error) {
            return react_1.createElement(notification_1.ErrorNotification, { errorMessage: this.state.error });
        }
        var children = react_1.Children.toArray(this.props.children);
        var actionsParent = _.find(children, function (child) {
            return react_1.isValidElement(child) && child.type === ComponentToolbarActions_1.ComponentToolbarActionsComponent;
        });
        var componentParent = _.find(children, function (child) {
            return react_1.isValidElement(child) && child.type === ComponentToolbarComponent_1.ComponentToolbarComponentComponent;
        });
        var component = react_1.Children.only(componentParent.props.children);
        var updatedComponent = react_1.cloneElement(component, Object.assign({}, component.props, this.state.propsOverride));
        var actions = actionsParent.props.children;
        return react_1.DOM.div({ className: this.props.className, style: this.props.style }, react_1.DOM.div.apply(react_1.DOM, [{
                className: classnames(styles.actions, actionsParent.props.className),
                style: actionsParent.props.style,
            }].concat((react_1.Children.map(actions, function (action) {
            return react_1.cloneElement(action, tslib_1.__assign({}, action.props, { component: updatedComponent }));
        })))), updatedComponent);
    };
    return ComponentToolbarComponent;
}(components_1.Component));
ComponentToolbarComponent.childContextTypes = tslib_1.__assign({}, ComponentToolbarApi_1.ComponentToolbarContextTypes, components_1.Component.childContextTypes);
exports.ComponentToolbarComponent = ComponentToolbarComponent;
exports.default = ComponentToolbarComponent;
