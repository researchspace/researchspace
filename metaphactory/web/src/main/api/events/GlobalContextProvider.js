Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var EventsApi_1 = require("./EventsApi");
var EventsStore = require("./EventsStore");
var GlobalContextProvider = (function (_super) {
    tslib_1.__extends(GlobalContextProvider, _super);
    function GlobalContextProvider() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    GlobalContextProvider.prototype.getChildContext = function () {
        return {
            GLOBAL_EVENTS: {
                listen: EventsStore.listen,
                trigger: EventsStore.trigger,
            },
        };
    };
    GlobalContextProvider.prototype.render = function () {
        return react_1.Children.only(this.props.children);
    };
    return GlobalContextProvider;
}(react_1.Component));
GlobalContextProvider.childContextTypes = EventsApi_1.GlobalEventsContextTypes;
exports.GlobalContextProvider = GlobalContextProvider;
exports.default = GlobalContextProvider;
