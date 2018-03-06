Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var immutable_1 = require("immutable");
exports.Entity = immutable_1.Record({
    iri: null,
    label: null,
    tuple: null,
});
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
        label: binding[labelBindingName].value,
    });
}
exports.bindingToEntity = bindingToEntity;
