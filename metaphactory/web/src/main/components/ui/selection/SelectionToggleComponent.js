Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var events_1 = require("platform/api/events");
var async_1 = require("platform/api/async");
var SelectionEvents_1 = require("./SelectionEvents");
var SelectionToggleComponent = (function (_super) {
    tslib_1.__extends(SelectionToggleComponent, _super);
    function SelectionToggleComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.cancellation = new async_1.Cancellation();
        _this.onSelectionChange = function (event) {
            var data = event.data;
            if (data.tag === _this.props.tag) {
                _this.setState({ value: data.value });
            }
        };
        _this.toggleSelection = function () {
            var newValue = !_this.state.value;
            var description = {
                value: newValue,
                tag: _this.props.tag,
            };
            _this.context.GLOBAL_EVENTS.trigger({
                eventType: SelectionEvents_1.SelectionEvents.Toggle,
                source: 'SelectionToggle',
                targets: [_this.props.selection],
                data: description,
            });
        };
        _this.state = {
            value: false,
        };
        return _this;
    }
    SelectionToggleComponent.prototype.componentDidMount = function () {
        this.cancellation.map(this.context.GLOBAL_EVENTS.listen({
            eventType: SelectionEvents_1.SelectionEvents.Toggle,
            target: this.props.selection,
        })).onValue(this.onSelectionChange);
    };
    SelectionToggleComponent.prototype.componentWillUnmount = function () {
        this.cancellation.cancelAll();
    };
    SelectionToggleComponent.prototype.render = function () {
        return React.createElement("input", { type: 'checkbox', checked: this.state.value, onChange: this.toggleSelection });
    };
    return SelectionToggleComponent;
}(react_1.Component));
SelectionToggleComponent.contextTypes = events_1.GlobalEventsContextTypes;
exports.default = SelectionToggleComponent;
