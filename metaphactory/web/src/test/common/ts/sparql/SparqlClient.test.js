Object.defineProperty(exports, "__esModule", { value: true });
var Kefir = require("kefir");
var chai_1 = require("chai");
var sinon = require("sinon");
var chaiString = require("chai-string");
chai_1.use(chaiString);
var NamespaceService = require("platform/api/services/namespace");
sinon.stub(NamespaceService, 'getRegisteredPrefixes', function () {
    return Kefir.constant({});
});
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var xhrTestUtils_1 = require("../../../xhrTestUtils");
describe('SparqlClient', function () {
    xhrTestUtils_1.default();
    it('SPARQL select query', function (done) {
        var rawResponse = JSON.stringify({
            'head': {
                'vars': ['x', 'y'],
            },
            'results': {
                'bindings': [
                    {
                        'x': {
                            'type': 'uri',
                            'value': 'http://example.com/1',
                        },
                        'y': {
                            'type': 'literal',
                            'value': 'Example1',
                        },
                    },
                    {
                        'x': {
                            'type': 'uri',
                            'value': 'http://example.com/2',
                        },
                        'y': {
                            'type': 'literal',
                            'datatype': 'http://www.w3.org/2001/XMLSchema#integer',
                            'value': '2',
                        },
                    },
                    {
                        'x': {
                            'type': 'uri',
                            'value': 'http://example.com/3',
                        },
                        'y': {
                            'type': 'literal',
                            'xml:lang': 'en',
                            'value': 'Example3',
                        },
                    },
                ],
            },
        });
        var expectedResponse = {
            'head': {
                'vars': ['x', 'y'],
            },
            'results': {
                'distinct': undefined,
                'ordered': undefined,
                'bindings': [
                    {
                        'x': rdf_1.Rdf.iri('http://example.com/1'),
                        'y': rdf_1.Rdf.literal('Example1'),
                    },
                    {
                        'x': rdf_1.Rdf.iri('http://example.com/2'),
                        'y': rdf_1.Rdf.literal('2', rdf_1.vocabularies.xsd.integer),
                    },
                    {
                        'x': rdf_1.Rdf.iri('http://example.com/3'),
                        'y': rdf_1.Rdf.langLiteral('Example3', 'en'),
                    },
                ],
            },
        };
        var query = 'SELECT ?x ?y WHERE {?x ?p ?y.}';
        sparql_1.SparqlClient.select(query).onValue(function (res) {
            chai_1.expect(res).to.be.deep.equal(expectedResponse);
            done();
        }).onError(done);
        chai_1.expect(this.request.requestBody).to.be.equalIgnoreSpaces(query);
        chai_1.expect(this.request.requestHeaders).to.be.deep.equal({
            'Content-Type': 'application/sparql-query;charset=utf-8',
            'Accept': 'application/sparql-results+json',
        });
        this.request.respond(200, { 'Content-Type': 'application/sparql-results+json' }, rawResponse);
    });
    it('SPARQL construct query', function (done) {
        var rawResponse = "\n        <http://example.com/1>  <http://example.com/p> \"Example1\".\n        <http://example.com/2>  <http://example.com/p> \"2\"^^<http://www.w3.org/2001/XMLSchema#integer>.\n        <http://example.com/3>  <http://example.com/p> \"Example3\"@en.\n    ";
        var expectedResponse = [
            rdf_1.Rdf.triple(rdf_1.Rdf.iri('http://example.com/1'), rdf_1.Rdf.iri('http://example.com/p'), rdf_1.Rdf.literal('Example1')),
            rdf_1.Rdf.triple(rdf_1.Rdf.iri('http://example.com/2'), rdf_1.Rdf.iri('http://example.com/p'), rdf_1.Rdf.literal('2', rdf_1.vocabularies.xsd.integer)),
            rdf_1.Rdf.triple(rdf_1.Rdf.iri('http://example.com/3'), rdf_1.Rdf.iri('http://example.com/p'), rdf_1.Rdf.langLiteral('Example3', 'en')),
        ];
        var query = 'CONSTRUCT {?s ?p ?o.} WHERE {?s ?p ?o.}';
        sparql_1.SparqlClient.construct(query).onValue(function (res) {
            chai_1.expect(res).to.be.deep.equal(expectedResponse);
            done();
        }).onError(done);
        chai_1.expect(this.request.requestBody).to.be.equalIgnoreSpaces(query);
        chai_1.expect(this.request.requestHeaders).to.be.deep.equal({
            'Content-Type': 'application/sparql-query;charset=utf-8',
            'Accept': 'text/turtle',
        });
        this.request.respond(200, { 'Content-Type': 'text/turtle' }, rawResponse);
    });
    it('SPARQL ask query', function (done) {
        var rawResponse = JSON.stringify({
            'head': [],
            'boolean': true,
        });
        var query = 'ASK WHERE {?s ?p ?o.}';
        sparql_1.SparqlClient.ask(query).onValue(function (res) {
            chai_1.expect(res).to.be.equal(true);
            done();
        }).onError(done);
        chai_1.expect(this.request.requestBody).to.be.equalIgnoreSpaces(query);
        chai_1.expect(this.request.requestHeaders).to.be.deep.equal({
            'Content-Type': 'application/sparql-query;charset=utf-8',
            'Accept': 'application/sparql-results+json',
        });
        this.request.respond(200, { 'Content-Type': 'application/sparql-results+json' }, rawResponse);
    });
    it('should add query parameter as VALUES clause', function (done) {
        var query = "\n      SELECT * WHERE {\n        ?s ?p ?o.\n      }\n    ";
        var expectedQuery = "\n      SELECT * WHERE {\n        VALUES (?s) {\n          (<http://example.com>)\n        }\n        ?s ?p ?o.\n      }";
        var parametrizedQuery = sparql_1.SparqlClient.prepareQuery(query, [{ s: rdf_1.Rdf.iri('http://example.com') }]);
        parametrizedQuery.onValue(function (preparedQuery) {
            chai_1.expect(sparql_1.SparqlUtil.serializeQuery(preparedQuery)).to.be.equalIgnoreSpaces(expectedQuery);
            done();
        }).onError(function (error) { return done(error); });
    });
    it('should add multiple query parameters as VALUES clause', function (done) {
        var query = "\n      SELECT * WHERE {\n        ?s ?p ?o.\n      }\n    ";
        var expectedQuery = "\n      SELECT * WHERE {\n        VALUES (?s ?p) {\n          (<http://example.com/1> \"example1\"^^<http://www.w3.org/2001/XMLSchema#string>)\n          (<http://example.com/2> \"example2\"^^<http://www.w3.org/2001/XMLSchema#string>)\n        }\n        ?s ?p ?o.\n      }";
        var parametrizedQuery = sparql_1.SparqlClient.prepareQuery(query, [
            {
                s: rdf_1.Rdf.iri('http://example.com/1'),
                p: rdf_1.Rdf.literal('example1'),
            },
            {
                s: rdf_1.Rdf.iri('http://example.com/2'),
                p: rdf_1.Rdf.literal('example2'),
            },
        ]);
        parametrizedQuery.onValue(function (preparedQuery) {
            chai_1.expect(sparql_1.SparqlUtil.serializeQuery(preparedQuery)).to.be.equalIgnoreSpaces(expectedQuery);
            done();
        }).onError(function (error) { return done(error); });
    });
});
