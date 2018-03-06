Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var async_1 = require("platform/api/async");
var events_1 = require("platform/api/events");
var EventProxy = (function (_super) {
    tslib_1.__extends(EventProxy, _super);
    function EventProxy() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.cancelation = new async_1.Cancellation();
        _this.onEvent = function (event) {
            _this.context.GLOBAL_EVENTS.trigger({
                eventType: _this.props.proxyEventType,
                source: _this.props.id,
                targets: _this.props.proxyTargets,
                data: event.data,
            });
        };
        return _this;
    }
    EventProxy.prototype.componentDidMount = function () {
        this.cancelation.map(this.context.GLOBAL_EVENTS.listen({
            eventType: this.props.onEventType,
            source: this.props.onEventSource,
        })).onValue(this.onEvent);
    };
    EventProxy.prototype.componentWillUnmount = function () {
        this.cancelation.cancelAll();
    };
    EventProxy.prototype.render = function () {
        return null;
    };
    return EventProxy;
}(react_1.Component));
EventProxy.contextTypes = events_1.GlobalEventsContextTypes;
exports.EventProxy = EventProxy;
exports.default = EventProxy;
