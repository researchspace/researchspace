Object.defineProperty(exports, "__esModule", { value: true });
var uuid = require("uuid");
var Immutable = require("immutable");
var Kefir = require("kefir");
var URI = require("urijs");
var rdf_1 = require("platform/api/rdf");
var FieldValues_1 = require("./FieldValues");
var QueryValues_1 = require("./QueryValues");
var DEFALUT_SUBJECT_TEMPLATE = '{{UUID}}';
function generateSubjectByTemplate(template, ownerSubject, composite) {
    if (!FieldValues_1.CompositeValue.isPlaceholder(composite.subject)) {
        return composite.subject;
    }
    var iriTemplate = template || DEFALUT_SUBJECT_TEMPLATE;
    var subject = iriTemplate.replace(/{{([^{}]+)}}/g, function (match, placeholder) {
        if (placeholder === 'UUID') {
            return uuid.v4();
        }
        else if (composite.definitions.has(placeholder)) {
            var state = composite.fields.get(placeholder);
            var first = (state ? state.values.first() : undefined) || FieldValues_1.FieldValue.empty;
            var valueContent = FieldValues_1.FieldValue.isAtomic(first) ? first.value.value : '';
            return encodeURIComponent(valueContent);
        }
        else {
            return '';
        }
    });
    var isAbsoluteUri = URI(subject).scheme();
    if (isAbsoluteUri || !ownerSubject) {
        return rdf_1.Rdf.iri(subject);
    }
    var combinedPath = URI.joinPaths(ownerSubject.value, subject).toString();
    return rdf_1.Rdf.iri(URI(ownerSubject.value).pathname(combinedPath).toString());
}
exports.generateSubjectByTemplate = generateSubjectByTemplate;
function readyToSubmit(composite, isConsideredError) {
    var freeOfErrors = function (errors) {
        return errors.every(function (error) { return !isConsideredError(error); });
    };
    return freeOfErrors(composite.errors) &&
        composite.fields.every(function (state) {
            return freeOfErrors(state.errors) &&
                state.values.every(function (value) {
                    return FieldValues_1.FieldValue.isComposite(value)
                        ? readyToSubmit(value, isConsideredError)
                        : freeOfErrors(FieldValues_1.FieldValue.getErrors(value));
                });
        });
}
exports.readyToSubmit = readyToSubmit;
function loadDefaultsAndValueSets(composite, inputs) {
    var initialValues = composite.definitions
        .map(function (def) { return loadInitialOrDefaultValues(composite.subject, def, inputs.get(def.id))
        .map(function (values) { return ({ def: def, values: Immutable.List(values) }); })
        .flatMapErrors(function (error) { return Kefir.constant({
        def: def, error: "Failed to load initial values: " + formatError(error),
    }); }); }).toArray();
    var valueSets = composite.definitions
        .filter(function (def) { return Boolean(def.valueSetPattern); })
        .map(function (def) { return QueryValues_1.queryValues(def.valueSetPattern, composite.subject)
        .map(function (set) { return ({ def: def, set: Immutable.List(set) }); })
        .flatMapErrors(function (error) { return Kefir.constant({
        def: def, error: "Failed to load value set: " + formatError(error),
    }); }); }).toArray();
    var initialValuesAndSets = initialValues.concat(valueSets);
    if (initialValuesAndSets.length === 0) {
        return noChanges();
    }
    var mergeFetchedIntoModel = function (model, results) {
        return FieldValues_1.CompositeValue.set(model, {
            fields: model.fields.withMutations(function (states) {
                for (var _i = 0, results_1 = results; _i < results_1.length; _i++) {
                    var _a = results_1[_i], def = _a.def, values = _a.values, set = _a.set, error = _a.error;
                    var state = states.get(def.id);
                    if (values && values.size > 0) {
                        state = FieldValues_1.FieldState.set(state, { values: values });
                    }
                    else if (set) {
                        state = FieldValues_1.FieldState.set(state, { valueSet: set });
                    }
                    else if (error) {
                        state = FieldValues_1.FieldState.set(state, { errors: state.errors.push({
                                kind: FieldValues_1.ErrorKind.Loading,
                                message: error,
                            }) });
                    }
                    states.set(def.id, state);
                }
            }),
        });
    };
    return Kefir.zip(initialValuesAndSets).map(function (results) {
        return function (model) { return mergeFetchedIntoModel(model, results); };
    });
}
exports.loadDefaultsAndValueSets = loadDefaultsAndValueSets;
function loadInitialOrDefaultValues(subject, def, mapping) {
    var isPlaceholderSubject = FieldValues_1.CompositeValue.isPlaceholder(subject);
    var shouldLoadInitialValues = def.selectPattern && !isPlaceholderSubject;
    var initialValuesTask = shouldLoadInitialValues
        ? QueryValues_1.fetchInitialValues(def, subject) : Kefir.constant([]);
    return initialValuesTask.flatMap(function (initialValues) {
        if (isPlaceholderSubject && mapping) {
            return lookForDefaultValues(def, mapping);
        }
        return Kefir.constant(initialValues);
    }).toProperty();
}
function lookForDefaultValues(def, mapping) {
    var _a = mapping.props, defaultValue = _a.defaultValue, defaultValues = _a.defaultValues;
    if (defaultValue || defaultValues) {
        var values = defaultValue ? [defaultValue] : defaultValues;
        var fieldValues = values.map(function (value) { return parseDefaultValue(value, def); });
        if (fieldValues.length > 0) {
            return Kefir.zip(fieldValues).toProperty();
        }
    }
    else if (def.defaultValues) {
        var fieldValues = def.defaultValues.map(function (value) { return parseDefaultValue(value, def); });
        if (fieldValues.length > 0) {
            return Kefir.zip(fieldValues).toProperty();
        }
    }
    return Kefir.constant([]);
}
function parseDefaultValue(value, def) {
    var atomic = createDefaultValue(value, def);
    return QueryValues_1.restoreLabel(atomic);
}
function createDefaultValue(value, def) {
    if (!def.xsdDatatype) {
        return FieldValues_1.FieldValue.fromLabeled({ value: rdf_1.Rdf.literal(value) });
    }
    else if (rdf_1.XsdDataTypeValidation.sameXsdDatatype(def.xsdDatatype, rdf_1.vocabularies.xsd.anyURI)) {
        return FieldValues_1.FieldValue.fromLabeled({ value: rdf_1.Rdf.iri(value) });
    }
    var literal = rdf_1.Rdf.literal(value, def.xsdDatatype);
    var _a = rdf_1.XsdDataTypeValidation.validate(literal), success = _a.success, message = _a.message;
    if (success) {
        return FieldValues_1.FieldValue.fromLabeled({ value: literal });
    }
    else {
        return FieldValues_1.AtomicValue.set(FieldValues_1.FieldValue.fromLabeled({ value: literal }), {
            errors: FieldValues_1.FieldError.noErrors.push({
                kind: FieldValues_1.ErrorKind.Loading,
                message: "Default value doesn't match XSD datatype: " + message,
            })
        });
    }
}
function tryBeginValidation(field, previousComposite, newComposite) {
    if (!field.constraints || field.constraints.length === 0) {
        return undefined;
    }
    var oldValues = previousComposite.fields.get(field.id, FieldValues_1.FieldState.empty).values;
    var newValues = newComposite.fields.get(field.id, FieldValues_1.FieldState.empty).values;
    var streams = newValues.map(function (value, index) {
        var oldValue = index < oldValues.size ? oldValues.get(index) : null;
        return QueryValues_1.validate(newComposite.subject, field, oldValue, value);
    });
    var compositeChange = Kefir.zip(streams.toArray()).map(function (validated) {
        var change = function (currentComposite) {
            var current = currentComposite.fields.get(field.id);
            if (!Immutable.is(current.values, newValues)) {
                return currentComposite;
            }
            var fields = currentComposite.fields.update(field.id, function (state) { return FieldValues_1.FieldState.set(state, {
                values: Immutable.List(validated),
            }); });
            return FieldValues_1.CompositeValue.set(currentComposite, { fields: fields });
        };
        return change;
    });
    return compositeChange;
}
exports.tryBeginValidation = tryBeginValidation;
function formatError(error) {
    if (typeof error === 'string') {
        return error;
    }
    else if (error && typeof error.message === 'string') {
        return error.message;
    }
    else if (error && typeof error.status === 'number') {
        return 'query error';
    }
    else {
        return 'unknown error occured';
    }
}
function noChanges() {
    return Kefir.later(0, function (value) { return value; });
}
function fieldInitialState(def) {
    var valueCount = Math.min(Math.max(def.minOccurs, 1), def.maxOccurs);
    var values = Immutable.List()
        .setSize(valueCount).map(function () { return FieldValues_1.FieldValue.empty; });
    return FieldValues_1.FieldState.set(FieldValues_1.FieldState.empty, { values: values });
}
exports.fieldInitialState = fieldInitialState;
