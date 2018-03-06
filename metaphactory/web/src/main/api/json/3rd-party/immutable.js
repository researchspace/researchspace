Object.defineProperty(exports, "__esModule", { value: true });
var Immutable = require("immutable");
var JsonCore_1 = require("../JsonCore");
function registerSerializersAndDeserializers() {
    JsonCore_1.serializerFor({
        name: 'Immutable.Set',
        predicate: function (obj) {
            return obj instanceof Immutable.Set;
        },
        serializer: function (obj) {
            return obj.toArray();
        },
    });
    JsonCore_1.deserializerFor({
        name: 'Immutable.Set',
        deserializer: function (object) {
            return Immutable.Set(Immutable.Seq.Indexed(object));
        },
    });
    JsonCore_1.serializerFor({
        name: 'Immutable.OrderedSet',
        predicate: function (obj) {
            return obj instanceof Immutable.OrderedSet;
        },
        serializer: function (obj) {
            return obj.toArray();
        },
    });
    JsonCore_1.deserializerFor({
        name: 'Immutable.OrderedSet',
        deserializer: function (object) {
            return Immutable.OrderedSet(Immutable.Seq.Indexed(object));
        },
    });
    JsonCore_1.serializerFor({
        name: 'Immutable.List',
        predicate: function (obj) {
            return obj instanceof Immutable.List;
        },
        serializer: function (obj) {
            return obj.toArray();
        },
    });
    JsonCore_1.deserializerFor({
        name: 'Immutable.List',
        deserializer: function (object) {
            return Immutable.List(Immutable.Seq.Indexed(object));
        },
    });
    JsonCore_1.serializerFor({
        name: 'Immutable.OrderedMap',
        predicate: function (obj) {
            return obj instanceof Immutable.OrderedMap;
        },
        serializer: function (obj) {
            return obj.toObject();
        },
    });
    JsonCore_1.deserializerFor({
        name: 'Immutable.OrderedMap',
        deserializer: function (object) {
            return Immutable.OrderedMap(Immutable.Seq.Keyed(object));
        },
    });
    JsonCore_1.serializerFor({
        name: 'Immutable.Map',
        predicate: function (obj) {
            return obj instanceof Immutable.Map;
        },
        serializer: function (obj) {
            return obj.toObject();
        },
    });
    JsonCore_1.deserializerFor({
        name: 'Immutable.Map',
        deserializer: function (object) {
            return Immutable.Map(Immutable.Seq.Keyed(object));
        },
    });
}
exports.registerSerializersAndDeserializers = registerSerializersAndDeserializers;
function recordSerializer(name, constructorFn) {
    JsonCore_1.serializerFor({
        name: name,
        predicate: function (obj) { return obj instanceof constructorFn; },
        serializer: function (record) {
            return record.toObject();
        },
    });
    JsonCore_1.deserializerFor({
        name: name,
        deserializer: function (obj) { return new constructorFn(obj); },
    });
}
exports.recordSerializer = recordSerializer;
