Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var react_bootstrap_1 = require("react-bootstrap");
var _ = require("lodash");
var async_1 = require("platform/api/async");
var events_1 = require("platform/api/events");
var selection_1 = require("platform/components/ui/selection");
var SelectionActionChoiceComponent = (function (_super) {
    tslib_1.__extends(SelectionActionChoiceComponent, _super);
    function SelectionActionChoiceComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.cancellation = new async_1.Cancellation();
        _this.onSelectionChange = function (event) {
            var data = event.data;
            var newValues = _.assign({}, _this.state.values, (_a = {}, _a[data.tag] = data.value, _a));
            _this.setState({ values: newValues });
            var _a;
        };
        _this.renderTypeSelector = function () {
            var selection = _.toPairs(_this.state.values)
                .filter(function (pair) { return pair[1]; })
                .map(function (_a) {
                var key = _a[0], value = _a[1];
                return key;
            });
            var _a = _this.props, style = _a.style, title = _a.title, children = _a.children;
            return React.createElement(react_bootstrap_1.DropdownButton, { id: _this.props.id, open: _this.state.open, onToggle: _this.onDropdownToggle, style: style, title: title }, react_1.Children.map(children, function (child) {
                return react_1.cloneElement(child, { selection: selection, closeMenu: _this.closeMenu });
            }));
        };
        _this.closeMenu = function () {
            _this.setState({ open: false });
        };
        _this.onDropdownToggle = function (isOpen) {
            _this.setState({ open: isOpen });
        };
        _this.state = {
            values: {},
            open: false,
        };
        return _this;
    }
    SelectionActionChoiceComponent.prototype.componentDidMount = function () {
        this.cancellation.map(this.context.GLOBAL_EVENTS.listen({
            eventType: selection_1.SelectionEvents.Toggle,
            target: this.props.selection,
        })).onValue(this.onSelectionChange);
    };
    SelectionActionChoiceComponent.prototype.componentWillUnmount = function () {
        this.cancellation.cancelAll();
    };
    SelectionActionChoiceComponent.prototype.render = function () {
        return this.renderTypeSelector();
    };
    return SelectionActionChoiceComponent;
}(react_1.Component));
SelectionActionChoiceComponent.contextTypes = events_1.GlobalEventsContextTypes;
exports.SelectionActionChoiceComponent = SelectionActionChoiceComponent;
exports.default = SelectionActionChoiceComponent;
