function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var immutable_1 = require("./3rd-party/immutable");
var data_maybe_1 = require("./3rd-party/data.maybe");
var moment_1 = require("./3rd-party/moment");
__export(require("./JsonCore"));
var immutable_2 = require("./3rd-party/immutable");
exports.recordSerializer = immutable_2.recordSerializer;
immutable_1.registerSerializersAndDeserializers();
data_maybe_1.registerSerializersAndDeserializers();
moment_1.registerSerializersAndDeserializers();
