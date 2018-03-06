Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var rdf_1 = require("platform/api/rdf");
var vocabularies_1 = require("platform/api/rdf/vocabularies/vocabularies");
var JsObjectGraph_1 = require("platform/api/rdf/formats/JsObjectGraph");
var exampleJs = [{
        abc: [123, 3.14, 'str'],
        def: 'abc',
    }, {
        '123': [3.14, {}],
        def: true,
    }];
var exampleGraph = rdf_1.Rdf.graph([
    rdf_1.Rdf.triple(rdf_1.Rdf.iri('http://root.org'), vocabularies_1.rdf.first, rdf_1.Rdf.bnode('0')),
    rdf_1.Rdf.triple(rdf_1.Rdf.iri('http://root.org'), vocabularies_1.rdf.rest, rdf_1.Rdf.bnode('0rest')),
    rdf_1.Rdf.triple(rdf_1.Rdf.bnode('0rest'), vocabularies_1.rdf.first, rdf_1.Rdf.bnode('1')),
    rdf_1.Rdf.triple(rdf_1.Rdf.bnode('0rest'), vocabularies_1.rdf.rest, vocabularies_1.rdf.nil),
    rdf_1.Rdf.triple(rdf_1.Rdf.bnode('0'), JsObjectGraph_1.propKeyToUriDefault('abc'), rdf_1.Rdf.bnode('0_abc')),
    rdf_1.Rdf.triple(rdf_1.Rdf.bnode('0'), JsObjectGraph_1.propKeyToUriDefault('def'), rdf_1.Rdf.literal('abc')),
    rdf_1.Rdf.triple(rdf_1.Rdf.bnode('1'), JsObjectGraph_1.propKeyToUriDefault('123'), rdf_1.Rdf.bnode('1_123')),
    rdf_1.Rdf.triple(rdf_1.Rdf.bnode('1'), JsObjectGraph_1.propKeyToUriDefault('def'), rdf_1.Rdf.literal(true)),
    rdf_1.Rdf.triple(rdf_1.Rdf.bnode('0_abc'), vocabularies_1.rdf.first, rdf_1.Rdf.literal('123', vocabularies_1.xsd.integer)),
    rdf_1.Rdf.triple(rdf_1.Rdf.bnode('0_abc'), vocabularies_1.rdf.rest, rdf_1.Rdf.bnode('0_abc_0rest')),
    rdf_1.Rdf.triple(rdf_1.Rdf.bnode('0_abc_0rest'), vocabularies_1.rdf.first, rdf_1.Rdf.literal('3.14', vocabularies_1.xsd.double)),
    rdf_1.Rdf.triple(rdf_1.Rdf.bnode('0_abc_0rest'), vocabularies_1.rdf.rest, rdf_1.Rdf.bnode('0_abc_1rest')),
    rdf_1.Rdf.triple(rdf_1.Rdf.bnode('0_abc_1rest'), vocabularies_1.rdf.first, rdf_1.Rdf.literal('str')),
    rdf_1.Rdf.triple(rdf_1.Rdf.bnode('0_abc_1rest'), vocabularies_1.rdf.rest, vocabularies_1.rdf.nil),
    rdf_1.Rdf.triple(rdf_1.Rdf.bnode('1_123'), vocabularies_1.rdf.first, rdf_1.Rdf.literal('3.14', vocabularies_1.xsd.double)),
    rdf_1.Rdf.triple(rdf_1.Rdf.bnode('1_123'), vocabularies_1.rdf.rest, rdf_1.Rdf.bnode('1_123_0rest')),
    rdf_1.Rdf.triple(rdf_1.Rdf.bnode('1_123_0rest'), vocabularies_1.rdf.first, rdf_1.Rdf.bnode('1_123_1')),
    rdf_1.Rdf.triple(rdf_1.Rdf.bnode('1_123_0rest'), vocabularies_1.rdf.rest, vocabularies_1.rdf.nil),
]);
function checkObjectToGraphAndBack(example) {
    var graph = JsObjectGraph_1.jsObjectToGraph(example);
    var obj = JsObjectGraph_1.graphToJsObject(graph.pointer, graph.graph);
    chai_1.expect(obj).to.be.deep.equals(example);
}
describe('convertor of js object to/from rdf graph', function () {
    it('convert JS object to RDF graph and back', function () {
        checkObjectToGraphAndBack(exampleJs);
    });
    it('convert RDF graph to JS object', function () {
        var obj = JsObjectGraph_1.graphToJsObject(rdf_1.Rdf.iri('http://root.org'), exampleGraph);
        chai_1.expect(obj).to.be.deep.equal(exampleJs);
    });
    it('convert JS object with nulls to RDF graph and back', function () {
        checkObjectToGraphAndBack(null);
        checkObjectToGraphAndBack([null]);
        checkObjectToGraphAndBack([[]]);
        checkObjectToGraphAndBack({ k: null });
        checkObjectToGraphAndBack({ k: [] });
        checkObjectToGraphAndBack({ k: {} });
        checkObjectToGraphAndBack({ k: [{}, null, [], [true, false], { key: null, key2: 123 }] });
    });
    it('convert JS object with nulls to RDF graph and back', function () {
        checkObjectToGraphAndBack(undefined);
        checkObjectToGraphAndBack([undefined]);
        checkObjectToGraphAndBack({ k: undefined });
        checkObjectToGraphAndBack({ k: [{}, undefined, [], [true, false], { key: undefined, key2: 123 }] });
    });
});
