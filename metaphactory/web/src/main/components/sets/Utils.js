Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = require("platform/api/events");
var ldp_set_1 = require("platform/api/services/ldp-set");
var SetManagementEvents_1 = require("platform/api/services/ldp-set/SetManagementEvents");
var immutable_1 = require("immutable");
function createNewSetFromItems(source, name, items) {
    return ldp_set_1.getSetServiceForUser().flatMap(function (service) { return service.createSetAndAddItems(name, immutable_1.List(items)); }).onValue(function (value) {
        events_1.trigger({ eventType: SetManagementEvents_1.SetManagementEvents.SetAdded, source: source });
    });
}
exports.createNewSetFromItems = createNewSetFromItems;
