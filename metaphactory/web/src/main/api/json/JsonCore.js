Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var immutable_1 = require("immutable");
var TYPE_VARIABLE_NAME = '#type';
var VALUE_VARIABLE_NAME = '#value';
var deserializers = [];
var serializers = [];
function deserializer(target, key, descriptor) {
    deserializers.push({
        name: target.prototype.constructor.name,
        deserializer: descriptor.value,
    });
    return descriptor;
}
exports.deserializer = deserializer;
function serializer(target, key, descriptor) {
    serializers.push({
        name: target.constructor.name,
        predicate: function (obj) { return obj instanceof target.constructor; },
        serializer: descriptor.value,
    });
    return descriptor;
}
exports.serializer = serializer;
function serializerFor(serializer) {
    serializers.push(serializer);
}
exports.serializerFor = serializerFor;
function deserializerFor(deserializer) {
    return deserializers.push(deserializer);
}
exports.deserializerFor = deserializerFor;
function serialize(object) {
    if (_.isUndefined(object) || _.isNull(object) || _.isNumber(object) || _.isString(object)) {
        return object;
    }
    else if (_.isArray(object)) {
        return _.map(object, serialize);
    }
    else if (!(object instanceof immutable_1.Iterable) && _.isPlainObject(object)) {
        return _.transform(object, function (res, val, key) {
            res[key] = serialize(val);
            return res;
        }, {});
    }
    else {
        var serializerObj = _.find(serializers, function (serializer) { return serializer.predicate(object); });
        if (serializerObj) {
            return addTypeDiscriminator(serializerObj.serializer, serializerObj.name)(object);
        }
        else {
            return object;
        }
    }
}
exports.serialize = serialize;
function deserialize(object) {
    if (_.isUndefined(object) || _.isNull(object) || _.isNumber(object) || _.isString(object)) {
        return object;
    }
    else if (_.isArray(object)) {
        return _.map(object, deserialize);
    }
    else {
        var deserializerObj = _.find(deserializers, function (deserializer) { return object[TYPE_VARIABLE_NAME] === deserializer.name; });
        if (deserializerObj) {
            return deserializerObj.deserializer(deserialize(object[VALUE_VARIABLE_NAME]));
        }
        else if (_.isPlainObject(object)) {
            return _.transform(object, function (res, val, key) {
                res[key] = deserialize(val);
                return res;
            }, {});
        }
        else {
            return object;
        }
    }
}
exports.deserialize = deserialize;
function addTypeDiscriminator(originalFn, serializedObjectType) {
    return function (obj) {
        var json = {};
        json[TYPE_VARIABLE_NAME] = serializedObjectType;
        json[VALUE_VARIABLE_NAME] = serialize(originalFn.apply(obj, [obj]));
        return json;
    };
}
