Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var data_maybe_1 = require("data.maybe");
var ldp_field_1 = require("platform/api/services/ldp-field");
var rdf_1 = require("platform/api/rdf");
var sp = rdf_1.vocabularies.sp, field = rdf_1.vocabularies.field, rdf = rdf_1.vocabularies.rdf, rdfs = rdf_1.vocabularies.rdfs, xsd = rdf_1.vocabularies.xsd, VocabPlatform = rdf_1.vocabularies.VocabPlatform;
var ValidatedTreeConfig;
(function (ValidatedTreeConfig) {
    function wrap(config) {
        if (config.type === 'simple') {
            return {
                type: 'simple',
                schemePattern: asValue(config.schemePattern),
                relationPattern: asValue(config.relationPattern),
            };
        }
        else {
            return {
                type: 'full',
                rootsQuery: asValue(config.rootsQuery),
                childrenQuery: asValue(config.childrenQuery),
                parentsQuery: asValue(config.parentsQuery),
                searchQuery: asValue(config.searchQuery),
            };
        }
    }
    ValidatedTreeConfig.wrap = wrap;
    function asValue(value) {
        return typeof value === 'string' ? { value: value } : undefined;
    }
    function unwrap(config) {
        if (config.type === 'simple') {
            var schemePattern = config.schemePattern, relationPattern = config.relationPattern;
            return {
                type: 'simple',
                schemePattern: schemePattern ? schemePattern.value : undefined,
                relationPattern: relationPattern ? relationPattern.value : undefined,
            };
        }
        else {
            var rootsQuery = config.rootsQuery, childrenQuery = config.childrenQuery, parentsQuery = config.parentsQuery, searchQuery = config.searchQuery;
            return {
                type: 'full',
                rootsQuery: rootsQuery.value,
                childrenQuery: childrenQuery.value,
                parentsQuery: parentsQuery.value,
                searchQuery: searchQuery.value,
            };
        }
    }
    ValidatedTreeConfig.unwrap = unwrap;
})(ValidatedTreeConfig = exports.ValidatedTreeConfig || (exports.ValidatedTreeConfig = {}));
function createFieldDefinitionGraph(properties) {
    var id = properties.id, label = properties.label, description = properties.description, domain = properties.domain, xsdDatatype = properties.xsdDatatype, range = properties.range, min = properties.min, max = properties.max, defaultValues = properties.defaultValues, testSubject = properties.testSubject, selectPattern = properties.selectPattern, insertPattern = properties.insertPattern, deletePattern = properties.deletePattern, askPattern = properties.askPattern, valueSetPattern = properties.valueSetPattern, autosuggestionPattern = properties.autosuggestionPattern, categories = properties.categories, treePatterns = properties.treePatterns;
    var triples = new Array();
    var baseIri = rdf_1.Rdf.iri('');
    triples.push(rdf_1.Rdf.triple(baseIri, rdf.type, field.Field));
    triples.push(rdf_1.Rdf.triple(baseIri, rdfs.label, rdf_1.Rdf.literal(label, xsd._string)));
    if (description && description.length > 0) {
        triples.push(rdf_1.Rdf.triple(baseIri, rdfs.comment, rdf_1.Rdf.literal(description, xsd._string)));
    }
    var bInsert = rdf_1.Rdf.bnode();
    triples.push(rdf_1.Rdf.triple(baseIri, field.insert_pattern, bInsert));
    triples.push(rdf_1.Rdf.triple(bInsert, rdf.type, sp.Query));
    triples.push(rdf_1.Rdf.triple(bInsert, sp.text, rdf_1.Rdf.literal(insertPattern, xsd._string)));
    if (domain) {
        triples.push(rdf_1.Rdf.triple(baseIri, field.domain, rdf_1.Rdf.iri(domain)));
    }
    if (xsdDatatype) {
        triples.push(rdf_1.Rdf.triple(baseIri, field.xsd_datatype, rdf_1.Rdf.iri(xsdDatatype)));
    }
    if (range) {
        triples.push(rdf_1.Rdf.triple(baseIri, field.range, rdf_1.Rdf.iri(range)));
    }
    if (min) {
        triples.push(rdf_1.Rdf.triple(baseIri, field.min_occurs, rdf_1.Rdf.literal(min, xsd._string)));
    }
    if (max) {
        triples.push(rdf_1.Rdf.triple(baseIri, field.max_occurs, rdf_1.Rdf.literal(max, xsd._string)));
    }
    for (var _i = 0, defaultValues_1 = defaultValues; _i < defaultValues_1.length; _i++) {
        var value = defaultValues_1[_i];
        triples.push(rdf_1.Rdf.triple(baseIri, field.default_value, rdf_1.Rdf.literal(value, xsd._string)));
    }
    if (categories && !lodash_1.isEmpty(categories)) {
        lodash_1.forEach(categories, function (category) { return triples.push(rdf_1.Rdf.triple(baseIri, field.category, category)); });
    }
    if (selectPattern && selectPattern.length > 0) {
        var bSelect = rdf_1.Rdf.bnode();
        triples.push(rdf_1.Rdf.triple(baseIri, field.select_pattern, bSelect));
        triples.push(rdf_1.Rdf.triple(bSelect, rdf.type, sp.Query));
        triples.push(rdf_1.Rdf.triple(bSelect, sp.text, rdf_1.Rdf.literal(selectPattern, xsd._string)));
    }
    if (askPattern && askPattern.length > 0) {
        var bAsk = rdf_1.Rdf.bnode();
        triples.push(rdf_1.Rdf.triple(baseIri, field.ask_pattern, bAsk));
        triples.push(rdf_1.Rdf.triple(bAsk, rdf.type, sp.Query));
        triples.push(rdf_1.Rdf.triple(bAsk, sp.text, rdf_1.Rdf.literal(askPattern, xsd._string)));
    }
    if (deletePattern && deletePattern.length > 0) {
        var bDelete = rdf_1.Rdf.bnode();
        triples.push(rdf_1.Rdf.triple(baseIri, field.delete_pattern, bDelete));
        triples.push(rdf_1.Rdf.triple(bDelete, rdf.type, sp.Query));
        triples.push(rdf_1.Rdf.triple(bDelete, sp.text, rdf_1.Rdf.literal(deletePattern, xsd._string)));
    }
    if (valueSetPattern && valueSetPattern.length > 0) {
        var bValueset = rdf_1.Rdf.bnode();
        triples.push(rdf_1.Rdf.triple(baseIri, field.valueset_pattern, bValueset));
        triples.push(rdf_1.Rdf.triple(bValueset, rdf.type, sp.Query));
        triples.push(rdf_1.Rdf.triple(bValueset, sp.text, rdf_1.Rdf.literal(valueSetPattern, xsd._string)));
    }
    if (autosuggestionPattern && autosuggestionPattern.length > 0) {
        var bAuto = rdf_1.Rdf.bnode();
        triples.push(rdf_1.Rdf.triple(baseIri, field.autosuggestion_pattern, bAuto));
        triples.push(rdf_1.Rdf.triple(bAuto, rdf.type, sp.Query));
        triples.push(rdf_1.Rdf.triple(bAuto, sp.text, rdf_1.Rdf.literal(autosuggestionPattern, xsd._string)));
    }
    if (testSubject) {
        triples.push(rdf_1.Rdf.triple(baseIri, field.testsubject, rdf_1.Rdf.iri(testSubject)));
    }
    if (treePatterns) {
        var treePatternsJson = JSON.stringify(treePatterns, null, 2);
        triples.push(rdf_1.Rdf.triple(baseIri, field.tree_patterns, rdf_1.Rdf.literal(treePatternsJson, VocabPlatform.SyntheticJsonDatatype)));
    }
    return rdf_1.Rdf.graph(triples);
}
exports.createFieldDefinitionGraph = createFieldDefinitionGraph;
function getFieldDefitionState(fieldIri) {
    var createValue = function (value) {
        return { value: value };
    };
    return ldp_field_1.getFieldDefinitionProp(fieldIri).map(function (fieldDef) { return ({
        isLoading: false,
        id: data_maybe_1.fromNullable(fieldIri.value).map(createValue),
        label: data_maybe_1.fromNullable(fieldDef.label).map(createValue),
        description: data_maybe_1.fromNullable(fieldDef.description).map(createValue),
        categories: fieldDef.categories,
        domain: data_maybe_1.fromNullable(fieldDef.domain).map(createValue),
        xsdDatatype: data_maybe_1.fromNullable(fieldDef.xsdDatatype).map(createValue),
        range: data_maybe_1.fromNullable(fieldDef.range).map(createValue),
        min: data_maybe_1.fromNullable(fieldDef.minOccurs).map(createValue),
        max: data_maybe_1.fromNullable(fieldDef.maxOccurs).map(createValue),
        defaults: fieldDef.defaultValues.map(createValue),
        testSubject: data_maybe_1.fromNullable(fieldDef.testSubject).map(createValue),
        insertPattern: data_maybe_1.fromNullable(fieldDef.insertPattern).map(createValue),
        selectPattern: data_maybe_1.fromNullable(fieldDef.selectPattern).map(createValue),
        askPattern: data_maybe_1.fromNullable(fieldDef.askPattern).map(createValue),
        deletePattern: data_maybe_1.fromNullable(fieldDef.deletePattern).map(createValue),
        valueSetPattern: data_maybe_1.fromNullable(fieldDef.valueSetPattern).map(createValue),
        autosuggestionPattern: data_maybe_1.fromNullable(fieldDef.autosuggestionPattern).map(createValue),
        treePatterns: data_maybe_1.fromNullable(fieldDef.treePatterns).map(ValidatedTreeConfig.wrap),
    }); });
}
exports.getFieldDefitionState = getFieldDefitionState;
function unwrapState(state) {
    var id = state.id, label = state.label, description = state.description, categories = state.categories, domain = state.domain, xsdDatatype = state.xsdDatatype, range = state.range, min = state.min, max = state.max, defaults = state.defaults, testSubject = state.testSubject, selectPattern = state.selectPattern, insertPattern = state.insertPattern, deletePattern = state.deletePattern, askPattern = state.askPattern, valueSetPattern = state.valueSetPattern, autosuggestionPattern = state.autosuggestionPattern, treePatterns = state.treePatterns;
    var fields = {
        id: id, label: label, description: description, domain: domain, xsdDatatype: xsdDatatype, range: range, min: min, max: max, testSubject: testSubject, selectPattern: selectPattern,
        insertPattern: insertPattern, deletePattern: deletePattern, askPattern: askPattern, valueSetPattern: valueSetPattern, autosuggestionPattern: autosuggestionPattern,
    };
    var mapped = lodash_1.mapValues(fields, function (value) { return value.map(function (v) { return v.value; }).getOrElse(undefined); });
    mapped.categories = categories;
    mapped.defaultValues = defaults.map(function (v) { return v.value; });
    mapped.treePatterns = treePatterns.map(ValidatedTreeConfig.unwrap).getOrElse(undefined);
    return mapped;
}
exports.unwrapState = unwrapState;
