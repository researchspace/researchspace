Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var uuid = require("uuid");
var Kefir = require("kefir");
exports._subscribers = {};
function listen(eventFilter) {
    return Kefir.stream(function (emitter) {
        var key = uuid.v4();
        exports._subscribers[key] = { eventFilter: eventFilter, emitter: emitter };
        return function () { return delete exports._subscribers[key]; };
    });
}
exports.listen = listen;
function trigger(event) {
    _.forEach(exports._subscribers, function (_a) {
        var eventFilter = _a.eventFilter, emitter = _a.emitter;
        if ((eventFilter.eventType ? eventFilter.eventType === event.eventType : true) &&
            (eventFilter.source ? eventFilter.source === event.source : true) &&
            (eventFilter.target ? _.includes(event.targets || [], eventFilter.target) : true)) {
            emitter.emit(event);
        }
    });
}
exports.trigger = trigger;
