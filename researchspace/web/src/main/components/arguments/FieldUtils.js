Object.defineProperty(exports, "__esModule", { value: true });
var ldp_field_1 = require("platform/api/services/ldp-field");
function getArgumentsFieldDefinition(iri) {
    return ldp_field_1.getFieldDefinitionProp(iri).map(function (field) {
        var argumentsField = field;
        argumentsField.iri = argumentsField.id;
        argumentsField.id = 'field';
        return argumentsField;
    });
}
exports.getArgumentsFieldDefinition = getArgumentsFieldDefinition;
