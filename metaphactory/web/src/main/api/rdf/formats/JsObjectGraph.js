Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var rdf_1 = require("platform/api/rdf");
var vocabularies_1 = require("platform/api/rdf/vocabularies/vocabularies");
var PROP_IRI_STRING = 'http://www.metaphacts.com/ontology/json/key';
exports.JSON_NULL_IRI = rdf_1.Rdf.iri('http://www.metaphacts.com/ontology/json/null');
exports.JSON_UNDEFINED_IRI = rdf_1.Rdf.iri('http://www.metaphacts.com/ontology/json/undefined');
function propKeyToUriDefault(key, baseIri) {
    if (baseIri === void 0) { baseIri = PROP_IRI_STRING; }
    if (key.includes('/')) {
        throw 'JSON key should not include "/" char';
    }
    return rdf_1.Rdf.iri(baseIri + '/' + key);
}
exports.propKeyToUriDefault = propKeyToUriDefault;
function uriToPropKeyDefault(uri) {
    return uri.value.substr(uri.value.lastIndexOf('/') + 1);
}
exports.uriToPropKeyDefault = uriToPropKeyDefault;
function jsObjectToGraph(value, baseIri, propKeyToUri) {
    if (baseIri === void 0) { baseIri = PROP_IRI_STRING; }
    if (propKeyToUri === void 0) { propKeyToUri = propKeyToUriDefault; }
    if (_.isUndefined(value)) {
        return rdf_1.Rdf.pg(exports.JSON_UNDEFINED_IRI, rdf_1.Rdf.EMPTY_GRAPH);
    }
    else if (_.isNull(value)) {
        return rdf_1.Rdf.pg(exports.JSON_NULL_IRI, rdf_1.Rdf.EMPTY_GRAPH);
    }
    else if (value.constructor === String) {
        return rdf_1.Rdf.pg(rdf_1.Rdf.literal(value, vocabularies_1.xsd._string), rdf_1.Rdf.EMPTY_GRAPH);
    }
    else if (value.constructor === Boolean) {
        return rdf_1.Rdf.pg(rdf_1.Rdf.literal(value, vocabularies_1.xsd.boolean), rdf_1.Rdf.EMPTY_GRAPH);
    }
    else if (value.constructor === Number) {
        if (Math.round(value) === value) {
            return rdf_1.Rdf.pg(rdf_1.Rdf.literal(value, vocabularies_1.xsd.integer), rdf_1.Rdf.EMPTY_GRAPH);
        }
        else {
            return rdf_1.Rdf.pg(rdf_1.Rdf.literal(value, vocabularies_1.xsd.double), rdf_1.Rdf.EMPTY_GRAPH);
        }
    }
    else if (value.constructor === Array) {
        if (value.length === 0) {
            return rdf_1.Rdf.pg(vocabularies_1.rdf.nil, rdf_1.Rdf.EMPTY_GRAPH);
        }
        else {
            var root = rdf_1.Rdf.bnode();
            var valuePointedGraph = jsObjectToGraph(value[0], baseIri + '/_item', propKeyToUri);
            var restPointedGraph = jsObjectToGraph(value.slice(1), baseIri, propKeyToUri);
            var triples = [];
            triples.push.apply(triples, valuePointedGraph.graph.triples.toArray());
            triples.push.apply(triples, restPointedGraph.graph.triples.toArray());
            triples.push(rdf_1.Rdf.triple(root, vocabularies_1.rdf.first, valuePointedGraph.pointer));
            triples.push(rdf_1.Rdf.triple(root, vocabularies_1.rdf.rest, restPointedGraph.pointer));
            return rdf_1.Rdf.pg(root, rdf_1.Rdf.graph(triples));
        }
    }
    else if (_.isPlainObject(value)) {
        var root = rdf_1.Rdf.bnode();
        var result = [];
        for (var key in value) {
            if (value.hasOwnProperty(key)) {
                var valuePointedGraph = jsObjectToGraph(value[key], baseIri + '/' + key, propKeyToUri);
                result.push.apply(result, valuePointedGraph.graph.triples.toArray());
                result.push(rdf_1.Rdf.triple(root, propKeyToUri(key, baseIri), valuePointedGraph.pointer));
            }
        }
        return rdf_1.Rdf.pg(root, rdf_1.Rdf.graph(result));
    }
    return rdf_1.Rdf.pg(exports.JSON_NULL_IRI, rdf_1.Rdf.EMPTY_GRAPH);
}
exports.jsObjectToGraph = jsObjectToGraph;
function graphToJsObjectHelper(root, graph, uriToPropKey) {
    var outgoing = graph.triples.filter(function (t) { return t.s.equals(root); });
    if (!outgoing.filter(function (t) { return t.p.equals(vocabularies_1.rdf.first); }).isEmpty()) {
        var firstTriples = graph.triples.filter(function (t) { return t.s.equals(root) && t.p.equals(vocabularies_1.rdf.first); });
        var restTriples = graph.triples.filter(function (t) { return t.s.equals(root) && t.p.equals(vocabularies_1.rdf.rest); });
        var first = graphToJsObject(firstTriples.first().o, graph, uriToPropKey);
        var rest = restTriples.isEmpty() ? [] : graphToJsObject(restTriples.first().o, graph, uriToPropKey);
        return [first].concat(rest);
    }
    else {
        var result_1 = {};
        outgoing.forEach(function (t) {
            var key = uriToPropKey(t.p);
            if (key) {
                result_1[key] = graphToJsObject(t.o, graph, uriToPropKey);
            }
        });
        return result_1;
    }
}
function graphToJsObject(root, graph, uriToPropKey) {
    if (uriToPropKey === void 0) { uriToPropKey = uriToPropKeyDefault; }
    return root.cata(function (iri) {
        if (iri.equals(vocabularies_1.rdf.nil)) {
            return [];
        }
        else if (iri.equals(exports.JSON_UNDEFINED_IRI)) {
            return undefined;
        }
        else if (iri.equals(exports.JSON_NULL_IRI)) {
            return null;
        }
        else {
            return graphToJsObjectHelper(iri, graph, uriToPropKey);
        }
    }, function (literal) {
        if (literal.dataType.equals(vocabularies_1.xsd._string)) {
            return literal.value;
        }
        else if (literal.dataType.equals(vocabularies_1.xsd.boolean)) {
            return literal.value === 'true';
        }
        else if (literal.dataType.equals(vocabularies_1.xsd.double)) {
            return parseFloat(literal.value);
        }
        else if (literal.dataType.equals(vocabularies_1.xsd.integer)) {
            return parseInt(literal.value);
        }
    }, function (bnode) {
        return graphToJsObjectHelper(bnode, graph, uriToPropKey);
    });
}
exports.graphToJsObject = graphToJsObject;
