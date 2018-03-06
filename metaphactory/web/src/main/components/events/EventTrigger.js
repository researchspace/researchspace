Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var events_1 = require("platform/api/events");
var EventTrigger = (function (_super) {
    tslib_1.__extends(EventTrigger, _super);
    function EventTrigger() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.onClick = function () {
            return _this.context.GLOBAL_EVENTS.trigger({
                eventType: _this.props.type,
                source: _this.props.id,
                targets: _this.props.targets,
            });
        };
        return _this;
    }
    EventTrigger.prototype.render = function () {
        var child = react_1.Children.only(this.props.children);
        var props = { onClick: this.onClick };
        return react_1.cloneElement(child, props);
    };
    return EventTrigger;
}(react_1.Component));
EventTrigger.contextTypes = events_1.GlobalEventsContextTypes;
exports.EventTrigger = EventTrigger;
exports.default = EventTrigger;
