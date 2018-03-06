Object.defineProperty(exports, "__esModule", { value: true });
var rdf_1 = require("platform/api/rdf");
var vocabularies_1 = require("platform/api/rdf/vocabularies/vocabularies");
var JsObjectGraph_1 = require("platform/api/rdf/formats/JsObjectGraph");
var PERSISTED_COMPONENT = rdf_1.Rdf.iri('http://www.metaphacts.com/ontology/PersistedComponent');
var COMPONENT_TYPE = rdf_1.Rdf.iri('http://www.metaphacts.com/ontology/componentType');
var COMPONENT_PROPS = rdf_1.Rdf.iri('http://www.metaphacts.com/ontology/componentProps');
var COMPONENT_TYPE_IRI_PREFIX = 'http://www.metaphacts.com/ontology/components/';
function componentToGraph(component, label, description) {
    var componentRoot = rdf_1.Rdf.iri('');
    var componentTypeIriString = COMPONENT_TYPE_IRI_PREFIX + component.type.__htmlTag;
    var propsPointedGraph = JsObjectGraph_1.jsObjectToGraph(component.props, componentTypeIriString);
    var result = propsPointedGraph.graph.triples.toArray();
    result.push(rdf_1.Rdf.triple(componentRoot, vocabularies_1.rdf.type, PERSISTED_COMPONENT), rdf_1.Rdf.triple(componentRoot, COMPONENT_TYPE, rdf_1.Rdf.iri(componentTypeIriString)), rdf_1.Rdf.triple(componentRoot, COMPONENT_PROPS, propsPointedGraph.pointer));
    if (label) {
        result.push(rdf_1.Rdf.triple(componentRoot, vocabularies_1.rdfs.label, rdf_1.Rdf.literal(label)));
    }
    if (description) {
        result.push(rdf_1.Rdf.triple(componentRoot, vocabularies_1.rdfs.comment, rdf_1.Rdf.literal(description)));
    }
    return rdf_1.Rdf.graph(result);
}
exports.componentToGraph = componentToGraph;
function graphToComponent(graph) {
    var root = graph.triples.filter(function (t) {
        return t.p.equals(vocabularies_1.rdf.type) && t.o.equals(PERSISTED_COMPONENT);
    }).first().s;
    var componentType = graph.triples.filter(function (t) {
        return t.s.equals(root) && t.p.equals(COMPONENT_TYPE);
    }).first().o.value;
    var componentProps = graph.triples.filter(function (t) {
        return t.s.equals(root) && t.p.equals(COMPONENT_PROPS);
    }).first().o;
    return {
        componentType: componentType.substr(COMPONENT_TYPE_IRI_PREFIX.length),
        componentProps: JsObjectGraph_1.graphToJsObject(componentProps, graph),
    };
}
exports.graphToComponent = graphToComponent;
