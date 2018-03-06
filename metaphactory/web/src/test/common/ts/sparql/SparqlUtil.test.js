Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var chaiString = require("chai-string");
chai_1.use(chaiString);
var sparql_1 = require("platform/api/sparql");
var Sparql = sparql_1.SparqlUtil.Sparql, serializeQuery = sparql_1.SparqlUtil.serializeQuery;
describe('SparqlUtil', function () {
    it('Use Sparql string template function to parse the query', function () {
        sparql_1.SparqlUtil.init({
            foaf: 'http://xmlns.com/foaf/0.1/',
            rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
        });
        var query = (_a = ["\n          PREFIX foaf: <http://xmlns.com/foaf/0.1/>\n          PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n          SELECT ?s WHERE {\n            ?s a foaf:Person ;\n               rdfs:label ?label .\n          }\n        "], _a.raw = ["\n          PREFIX foaf: <http://xmlns.com/foaf/0.1/>\n          PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n          SELECT ?s WHERE {\n            ?s a foaf:Person ;\n               rdfs:label ?label .\n          }\n        "], Sparql(_a));
        var expected = [
            'PREFIX foaf: <http://xmlns.com/foaf/0.1/>',
            'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
            'SELECT ?s WHERE {',
            '  ?s <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> foaf:Person.',
            '  ?s rdfs:label ?label.',
            '}',
        ].join('\n');
        chai_1.expect(serializeQuery(query)).to.be.equal(expected);
        var _a;
    });
});
