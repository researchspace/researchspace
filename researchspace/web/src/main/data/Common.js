Object.defineProperty(exports, "__esModule", { value: true });
var immutable_1 = require("immutable");
var _ = require("lodash");
var json_1 = require("platform/api/json");
exports.Entity = immutable_1.Record({
    iri: null,
    label: null,
    tuple: null,
});
json_1.recordSerializer('Entity', exports.Entity);
function bindingsToEntities(bindings, iriBindingName, labelBindingName) {
    var entities = _.map(bindings, function (binding) { return bindingToEntity(binding, iriBindingName, labelBindingName); });
    return immutable_1.List(entities);
}
exports.bindingsToEntities = bindingsToEntities;
function bindingToEntity(binding, iriBindingName, labelBindingName) {
    var iri = binding[iriBindingName];
    return exports.Entity({
        tuple: binding,
        iri: iri,
        label: binding[labelBindingName],
    });
}
exports.bindingToEntity = bindingToEntity;
