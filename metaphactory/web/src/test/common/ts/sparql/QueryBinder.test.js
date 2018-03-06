Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var sparqljs_1 = require("sparqljs");
var sparql_1 = require("platform/api/sparql");
describe('QueryBinder', function () {
    var parser = new sparqljs_1.Parser({
        'owl': 'http://www.w3.org/2002/07/owl#',
        'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
        'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    });
    it('PropertyPathBinder parametrizes ASK', function () {
        var query = parser.parse("ASK WHERE {\n      ?s ?p1 ?p1 .\n      ?s ?p2 ?p2 .\n    }");
        new sparql_1.PropertyPathBinder({
            p1: { type: 'path', pathType: '/',
                items: ['http:a', 'http:b'] },
            p2: { type: 'path', pathType: '|',
                items: ['http:c'] },
        }).sparqlQuery(query);
        var result = parser.parse("ASK WHERE {\n      ?s <http:a> / <http:b> ?p1 .\n      ?s <http:c> ?p2 .\n    }");
        chai_1.expect(query).to.deep.equal(result);
    });
    it('TextBinder parametrizes SELECT', function () {
        var query = parser.parse('SELECT * WHERE { ?s ?p "text TOKEN othertext" }');
        new sparql_1.TextBinder([
            { test: /TOKEN/, replace: 'replacement' },
        ]).sparqlQuery(query);
        var result = parser.parse('SELECT * WHERE { ?s ?p "text replacement othertext" }');
        chai_1.expect(query).to.deep.equal(result);
    });
    it('PatternBinder parametrizes SELECT', function () {
        var query = parser.parse("SELECT * WHERE { FILTER(?foo) }");
        var patterns = sparql_1.SparqlUtil.parsePatterns("?s ?p ?o . ?s a owl:Thing", query.prefixes);
        new sparql_1.PatternBinder('foo', patterns).sparqlQuery(query);
        var result = parser.parse("\n      SELECT * WHERE {\n        ?s ?p ?o .\n        ?s a owl:Thing\n      }\n    ");
        chai_1.expect(query).to.be.deep.equal(result);
    });
});
