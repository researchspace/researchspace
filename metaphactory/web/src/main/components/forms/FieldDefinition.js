Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var rdf_1 = require("platform/api/rdf");
var vocabularies_1 = require("platform/api/rdf/vocabularies/vocabularies");
function normalizeFieldDefinition(definitionProp) {
    var definition = _.cloneDeep(definitionProp);
    if (Array.isArray(definition.categories)) {
        definition.categories = definition.categories.map(function (category) {
            return typeof category === 'string' ? rdf_1.Rdf.iri(category) : category;
        });
    }
    else {
        definition.categories = [];
    }
    if (!definition.minOccurs || definition.minOccurs === 'unbound') {
        definition.minOccurs = 0;
    }
    else {
        definition.minOccurs = parseInt(definition.minOccurs, 10);
    }
    if (!definition.maxOccurs || definition.maxOccurs === 'unbound') {
        definition.maxOccurs = Infinity;
    }
    else {
        definition.maxOccurs = parseInt(definition.maxOccurs, 10);
    }
    if (typeof definition.domain === 'string') {
        definition.domain = rdf_1.Rdf.iri(definition.domain);
    }
    if (typeof definition.range === 'string') {
        definition.range = rdf_1.Rdf.iri(definition.range);
    }
    if (typeof definition.xsdDatatype === 'string') {
        var datatype = rdf_1.XsdDataTypeValidation.parseXsdDatatype(definition.xsdDatatype);
        definition.xsdDatatype = datatype
            ? datatype.iri : rdf_1.Rdf.iri(definition.xsdDatatype);
    }
    if (definition.xsdDatatype) {
        definition.xsdDatatype = rdf_1.XsdDataTypeValidation.replaceDatatypeAliases(definition.xsdDatatype);
    }
    else if (definition.range) {
        definition.xsdDatatype = vocabularies_1.xsd.anyURI;
    }
    if (!definition.defaultValues) {
        definition.defaultValues = [];
    }
    if (typeof definition.testSubject === 'string') {
        definition.testSubject = rdf_1.Rdf.iri(definition.testSubject);
    }
    if (typeof definition.askPattern === 'string') {
        var sparqlAskContraint = {
            validatePattern: definition.askPattern,
            message: 'Value does not pass the SPARQL ASK test.',
        };
        if (Array.isArray(definition.constraints)) {
            definition.constraints.push(sparqlAskContraint);
        }
        else {
            definition.constraints = [sparqlAskContraint];
        }
    }
    else if (!Array.isArray(definition.constraints)) {
        definition.constraints = [];
    }
    return definition;
}
exports.normalizeFieldDefinition = normalizeFieldDefinition;
function compileTimeAssertDefinitionAssignableToProp() {
    var definition = {};
    return definition;
}
