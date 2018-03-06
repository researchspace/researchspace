Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Kefir = require("kefir");
var Immutable = require("immutable");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var resource_label_1 = require("platform/api/services/resource-label");
var FieldValues_1 = require("./FieldValues");
function fetchInitialValues(def, subject) {
    return queryValues(def.selectPattern, subject).map(function (values) {
        var fieldValues = values.map(function (v) { return FieldValues_1.FieldValue.fromLabeled(v); });
        var initialValueCount = Math.max(1, def.minOccurs, fieldValues.length);
        fieldValues = setSizeAndFill(fieldValues, initialValueCount, FieldValues_1.FieldValue.empty);
        return fieldValues;
    });
}
exports.fetchInitialValues = fetchInitialValues;
function validate(subject, field, oldValue, newValue) {
    if (!FieldValues_1.FieldValue.isAtomic(newValue) || Immutable.is(oldValue, newValue)) {
        return Kefir.later(0, newValue);
    }
    var queries = field.constraints.map(function (constraint) {
        return sparql_1.SparqlUtil.parseQueryAsync(constraint.validatePattern)
            .flatMap(function (query) {
            return (sparql_1.SparqlTypeGuards.isQuery(query) && query.queryType === 'ASK')
                ? Kefir.constant(query)
                : Kefir.constantError(new Error('validatePattern is not an ASK query'));
        })
            .map(function (query) { return sparql_1.SparqlClient.setBindings(query, {
            'subject': subject,
            'value': newValue.value,
        }); })
            .flatMap(function (query) { return sparql_1.SparqlClient.ask(query, '/sparql'); })
            .map(function (success) { return ({ constraint: constraint, success: success, error: undefined }); })
            .flatMapErrors(function (error) { return Kefir.constant({ constraint: constraint, success: false, error: error }); });
    });
    return Kefir.zip(queries).map(function (results) {
        var otherErrors = newValue.errors
            .filter(function (error) { return error.kind !== FieldValues_1.ErrorKind.Validation; }).toList();
        return FieldValues_1.AtomicValue.set(newValue, {
            errors: otherErrors.concat(results
                .filter(function (result) { return !result.success; })
                .map(function (result) { return ({
                kind: FieldValues_1.ErrorKind.Validation,
                message: result.error
                    ? "Failed to validate value: " + result.error
                    : result.constraint.message,
            }); })),
        });
    });
}
exports.validate = validate;
function queryValues(pattern, subject, options) {
    if (!pattern) {
        return Kefir.constant([]);
    }
    return sparql_1.SparqlUtil.parseQueryAsync(pattern)
        .map(function (query) { return sparql_1.SparqlClient.setBindings(query, { 'subject': subject }); })
        .flatMap(function (query) { return sparql_1.SparqlClient.select(query, options); })
        .map(function (result) { return result.results.bindings
        .map(function (binding) { return ({
        value: binding.value,
        label: binding.label ? binding.label.value : undefined,
        binding: binding,
    }); })
        .filter(function (v) { return v.value !== undefined; })
        .map(function (v) { return FieldValues_1.SparqlBindingValue.set(v, {
        value: normalizeValueDatatype(v.value),
        binding: v.binding
    }); })
        .map(restoreLabel); })
        .flatMap(function (values) { return values.length > 0 ? Kefir.zip(values) : Kefir.constant([]); })
        .toProperty();
}
exports.queryValues = queryValues;
function canRestoreLabel(value) {
    return (value.label === null || value.label === undefined)
        && value.value && value.value.isIri();
}
exports.canRestoreLabel = canRestoreLabel;
function restoreLabel(value) {
    if (canRestoreLabel(value)) {
        return resource_label_1.getLabel(value.value)
            .map(function (label) { return (tslib_1.__assign({}, value, { label: label })); });
    }
    else {
        return Kefir.constant(value);
    }
}
exports.restoreLabel = restoreLabel;
function normalizeValueDatatype(node) {
    if (node instanceof rdf_1.Rdf.Literal &&
        !(node instanceof rdf_1.Rdf.LangLiteral)) {
        return rdf_1.Rdf.literal(node.value, rdf_1.XsdDataTypeValidation.replaceDatatypeAliases(node.dataType));
    }
    else {
        return node;
    }
}
function setSizeAndFill(list, newSize, fillValue) {
    var clone = list.slice();
    clone.length = newSize;
    for (var i = list.length; i < newSize; i++) {
        clone[i] = fillValue;
    }
    return clone;
}
