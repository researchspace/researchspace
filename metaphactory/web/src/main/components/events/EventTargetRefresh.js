Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var events_1 = require("platform/api/events");
var async_1 = require("platform/api/async");
var EventTargetRefresh = (function (_super) {
    tslib_1.__extends(EventTargetRefresh, _super);
    function EventTargetRefresh(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.cancelation = new async_1.Cancellation();
        _this.onRefresh = function () { return _this.setState({ refresh: true }, function () { return _this.setState({ refresh: false }); }); };
        _this.state = {
            refresh: false,
        };
        return _this;
    }
    EventTargetRefresh.prototype.componentDidMount = function () {
        this.cancelation.map(this.context.GLOBAL_EVENTS.listen({
            eventType: events_1.BuiltInEvents.ComponentRefresh,
            target: this.props.id,
        })).onValue(this.onRefresh);
    };
    EventTargetRefresh.prototype.componentWillUnmount = function () {
        this.cancelation.cancelAll();
    };
    EventTargetRefresh.prototype.render = function () {
        if (this.state.refresh) {
            return react_1.DOM.div();
        }
        else {
            return react_1.Children.only(this.props.children);
        }
    };
    return EventTargetRefresh;
}(react_1.Component));
EventTargetRefresh.contextTypes = events_1.GlobalEventsContextTypes;
exports.EventTargetRefresh = EventTargetRefresh;
exports.default = EventTargetRefresh;
