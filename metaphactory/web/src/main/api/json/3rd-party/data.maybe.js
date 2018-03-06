Object.defineProperty(exports, "__esModule", { value: true });
var JsonCore_1 = require("../JsonCore");
var maybe = require("data.maybe");
function registerSerializersAndDeserializers() {
    JsonCore_1.serializerFor({
        name: 'Data.Maybe',
        predicate: function (obj) {
            return obj instanceof maybe;
        },
        serializer: function (obj) {
            if (obj.isNothing) {
                return {};
            }
            else {
                return {
                    value: obj.get(),
                };
            }
        },
    });
    JsonCore_1.deserializerFor({
        name: 'Data.Maybe',
        deserializer: function (object) {
            if (object.value) {
                return maybe.Just(object.value);
            }
            else {
                return maybe.Nothing();
            }
        },
    });
}
exports.registerSerializersAndDeserializers = registerSerializersAndDeserializers;
