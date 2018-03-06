Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var _ = require("lodash");
var data_maybe_1 = require("data.maybe");
var ldp_1 = require("platform/api/services/ldp");
var rdf_1 = require("platform/api/rdf");
var sp = rdf_1.vocabularies.sp, field = rdf_1.vocabularies.field, rdfs = rdf_1.vocabularies.rdfs, VocabPlatform = rdf_1.vocabularies.VocabPlatform;
var FieldDefinition_1 = require("platform/components/forms/FieldDefinition");
function getFieldDefinitionProp(fieldIri) {
    var ldp = new ldp_1.LdpService(rdf_1.vocabularies.VocabPlatform.FieldDefinitionContainer.value);
    return ldp.get(fieldIri).map(function (graph) { return deserialize(fieldIri, graph); });
}
exports.getFieldDefinitionProp = getFieldDefinitionProp;
function getFieldDefinition(fieldIri) {
    return getFieldDefinitionProp(fieldIri).map(FieldDefinition_1.normalizeFieldDefinition);
}
exports.getFieldDefinition = getFieldDefinition;
function deserialize(fieldIri, graph) {
    var predicates = {
        description: [rdfs.comment],
        domain: [field.domain],
        xsdDatatype: [field.xsd_datatype],
        range: [field.range],
        minOccurs: [field.min_occurs],
        maxOccurs: [field.max_occurs],
        selectPattern: [field.select_pattern, sp.text],
        deletePattern: [field.delete_pattern, sp.text],
        askPattern: [field.ask_pattern, sp.text],
        valueSetPattern: [field.valueset_pattern, sp.text],
        autosuggestionPattern: [field.autosuggestion_pattern, sp.text],
        testSubject: [field.testsubject],
        insertPattern: [field.insert_pattern, sp.text],
        label: [rdfs.label],
    };
    var pg = rdf_1.Rdf.pg(fieldIri, graph);
    var partialField = _.mapValues(predicates, function (propertyPath) {
        return rdf_1.Rdf.getValueFromPropertyPath(propertyPath, pg)
            .map(function (n) { return n.value; })
            .getOrElse(undefined);
    });
    var defaultValues = rdf_1.Rdf.getValuesFromPropertyPath([field.default_value], pg).map(function (v) { return v.value; });
    var categories = rdf_1.Rdf.getValuesFromPropertyPath([field.category], pg);
    var treePatterns = rdf_1.Rdf.getValueFromPropertyPath([field.tree_patterns], pg).chain(function (config) {
        if (!(config.isLiteral() && config.dataType.equals(VocabPlatform.SyntheticJsonDatatype))) {
            return data_maybe_1.Nothing();
        }
        try {
            return data_maybe_1.Just(JSON.parse(config.value));
        }
        catch (e) {
            return data_maybe_1.Nothing();
        }
    }).getOrElse(undefined);
    return tslib_1.__assign({ id: fieldIri.value }, partialField, { categories: categories,
        defaultValues: defaultValues,
        treePatterns: treePatterns });
}
