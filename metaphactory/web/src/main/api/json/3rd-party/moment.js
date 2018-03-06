Object.defineProperty(exports, "__esModule", { value: true });
var moment = require("moment");
var JsonCore_1 = require("../JsonCore");
function registerSerializersAndDeserializers() {
    JsonCore_1.serializerFor({
        name: 'Moment',
        predicate: function (obj) {
            return moment.isMoment(obj);
        },
        serializer: function (obj) {
            return obj.toISOString();
        },
    });
    JsonCore_1.deserializerFor({
        name: 'Moment',
        deserializer: function (object) {
            return moment(object, moment.ISO_8601);
        },
    });
}
exports.registerSerializersAndDeserializers = registerSerializersAndDeserializers;
