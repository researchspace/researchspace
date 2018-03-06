Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var sparqljs = require("sparqljs");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
describe('SparqlClient.setBindings', function () {
    var parser = new sparqljs.Parser({
        'owl': 'http://www.w3.org/2002/07/owl#',
        'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
        'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    });
    var parameters = {
        testLiteral: rdf_1.Rdf.literal('test, literal!'),
        testLang: rdf_1.Rdf.langLiteral('Кириллица', 'ru'),
        testDate: rdf_1.Rdf.literal('2016-06-21T18:50:36Z', rdf_1.Rdf.iri('http://www.w3.org/2001/XMLSchema#date')),
        testIri: rdf_1.Rdf.iri('http:some-generic-iri'),
    };
    it('parametrizes SELECT with projection expressions, FROM and BIND', function () {
        var selectQuery = parser.parse("\n      SELECT REDUCED ?foo (CONCAT(\"apple \"@en, ?testLiteral) AS ?bar)\n      FROM <http://example.org/dft.ttl>\n      FROM NAMED <http://example.org/bob>\n      WHERE {\n        ?foo a ?testIri.\n        BIND(STR(?testDate) AS ?bar)\n      }\n    ");
        var result = parser.parse("\n      SELECT REDUCED ?foo (CONCAT(\"apple \"@en, \"test, literal!\"^^<http://www.w3.org/2001/XMLSchema#string>) AS ?bar)\n      FROM <http://example.org/dft.ttl>\n      FROM NAMED <http://example.org/bob>\n      WHERE {\n        ?foo <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http:some-generic-iri>.\n        BIND(STR(\"2016-06-21T18:50:36Z\"^^<http://www.w3.org/2001/XMLSchema#date>) AS ?bar)\n      }\n    ");
        chai_1.expect(sparql_1.SparqlClient.setBindings(selectQuery, parameters)).to.be.deep.equal(result);
    });
    it('parametrizes SELECT with GROUP, HAVING and ORDER', function () {
        var selectQuery = parser.parse("\n      SELECT * WHERE { }\n      GROUP BY ?anything\n      HAVING(?foo = 42 && ?testDate = 33)\n      ORDER BY DESC(?testLiteral)\n    ");
        var result = parser.parse("\n      SELECT * WHERE {  }\n      GROUP BY ?anything\n      HAVING ((?foo = 42) && (\"2016-06-21T18:50:36Z\"^^<http://www.w3.org/2001/XMLSchema#date> = 33))\n      ORDER BY DESC(\"test, literal!\"^^<http://www.w3.org/2001/XMLSchema#string>)\n    ");
        chai_1.expect(sparql_1.SparqlClient.setBindings(selectQuery, parameters)).to.be.deep.equal(result);
    });
    it('parametrizes CONSTRUCT query with FILTER and EXISTS', function () {
        var constructQuery = parser.parse("\n      CONSTRUCT {\n        ?foo a ?testIri\n      } WHERE {\n        <s:bar> ?testIri ?foo\n        FILTER(EXISTS { {?foo <s:p> ?testLiteral } FILTER(?foo = ?testLiteral) })\n      }\n    ");
        var result = parser.parse("\n      CONSTRUCT { ?foo <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http:some-generic-iri>. }\n      WHERE {\n        <s:bar> <http:some-generic-iri> ?foo.\n        FILTER(EXISTS {\n          ?foo <s:p> \"test, literal!\"^^<http://www.w3.org/2001/XMLSchema#string>.\n          FILTER(?foo = \"test, literal!\"^^<http://www.w3.org/2001/XMLSchema#string>)\n        })\n      }\n    ");
        chai_1.expect(sparql_1.SparqlClient.setBindings(constructQuery, parameters)).to.deep.equal(result);
    });
    it('parametrizes DELETE-INSERT query', function () {
        var query = parser.parse("\n      DELETE { ?foo ?testIri ?testLiteral }\n      INSERT { ?foo ?testIri ?testDate }\n      WHERE {\n        ?bar a ?testIri .\n        ?foo <s:p> ?bar\n      }\n    ");
        var result = parser.parse("\n      DELETE { ?foo <http:some-generic-iri> \"test, literal!\"^^<http://www.w3.org/2001/XMLSchema#string>. }\n      INSERT { ?foo <http:some-generic-iri> \"2016-06-21T18:50:36Z\"^^<http://www.w3.org/2001/XMLSchema#date>. }\n      WHERE {\n        ?bar a <http:some-generic-iri> .\n        ?foo <s:p> ?bar.\n      }\n    ");
        chai_1.expect(sparql_1.SparqlClient.setBindings(query, parameters)).to.deep.equal(result);
    });
    it('parametrizes INSERT query with GRAPH pattern', function () {
        var query = parser.parse("\n      INSERT {\n        GRAPH <s:g> { ?foo <s:p> ?testDate }\n      } WHERE {}\n    ");
        var result = parser.parse("\n      INSERT {\n        GRAPH <s:g> {\n          ?foo <s:p> \"2016-06-21T18:50:36Z\"^^<http://www.w3.org/2001/XMLSchema#date>.\n        }\n      } WHERE {}\n    ");
        chai_1.expect(sparql_1.SparqlClient.setBindings(query, parameters)).to.deep.equal(result);
    });
    it('parametrizes DESCRIBE query with UNION and subquery', function () {
        var query = parser.parse("\n      DESCRIBE ?foo WHERE {\n        { ?foo <s:p1> ?testIri }\n        UNION\n        {\n          SELECT ?s (CONCAT(MIN(?bar), ?testLang) AS ?minName)\n          WHERE { ?s ?testIri ?bar }\n          GROUP BY ?bar\n        }\n      }\n    ");
        var result = parser.parse("\n      DESCRIBE ?foo WHERE {\n        { ?foo <s:p1> <http:some-generic-iri> }\n        UNION\n        {\n          SELECT ?s (CONCAT(MIN(?bar), \"\u041A\u0438\u0440\u0438\u043B\u043B\u0438\u0446\u0430\"@ru) AS ?minName)\n          WHERE { ?s <http:some-generic-iri> ?bar }\n          GROUP BY ?bar\n        }\n      }\n    ");
        chai_1.expect(sparql_1.SparqlClient.setBindings(query, parameters)).to.deep.equal(result);
    });
    it('parametrize SELECT query with GRAPH and SERVICE', function () {
        var query = parser.parse("\n      SELECT * WHERE {\n        GRAPH ?testIri { ?foo <s:p1> ?testLiteral }\n        SERVICE ?testIri { ?testDate <s:p2> ?bar }\n      }\n    ");
        var result = parser.parse("\n      SELECT * WHERE {\n        GRAPH <http:some-generic-iri> {\n          ?foo <s:p1> \"test, literal!\"^^<http://www.w3.org/2001/XMLSchema#string>\n        }\n        SERVICE <http:some-generic-iri> {\n          \"2016-06-21T18:50:36Z\"^^<http://www.w3.org/2001/XMLSchema#date> <s:p2> ?bar\n        }\n      }\n    ");
        chai_1.expect(sparql_1.SparqlClient.setBindings(query, parameters)).to.deep.equal(result);
    });
    it('fails to substitute ?variable for "literal" in VALUES pattern', function () {
        var query = parser.parse("\n      SELECT * WHERE { VALUES(?testDate) { (42) } }\n    ");
        chai_1.expect(function () { return sparql_1.SparqlClient.setBindings(query, parameters); }).to.throw();
    });
});
