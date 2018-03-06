Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var forms_1 = require("platform/components/forms");
var xhrTestUtils_1 = require("../../../xhrTestUtils");
describe('converting insert queries of field definitions into construct queries', function () {
    xhrTestUtils_1.default();
    it('with plain bgp patterns', function (done) {
        var expectedConstructString = "\n    CONSTRUCT {\n      <http://testsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://testvalue>.\n      <http://testsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://testtype>.\n    }WHERE {\n      <http://testsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://testvalue>.\n      <http://testsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://testtype>.\n      <http://testsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://testtype2>.\n    }\n    ".replace(/\s/g, '');
        sparql_1.SparqlUtil.parseQueryAsync("INSERT {\n      $subject a $value.\n      <http://testsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://testtype>.\n    } WHERE {\n      $subject a $value.\n      <http://testsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://testtype>.\n      <http://testsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://testtype2>.\n    }").onValue(function (insertQuery) {
            chai_1.expect(forms_1.LdpPersistence.default.createFieldConstructQueries(insertQuery, [rdf_1.Rdf.iri('http://testvalue')], rdf_1.Rdf.iri('http://testsubject')).map(function (construct) { return sparql_1.SparqlUtil.serializeQuery(construct).replace(/\s/g, ''); }).toArray()).to.be.deep.equal([expectedConstructString]);
            done();
        });
        this.request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({}));
    });
    it('with bgp and graph pattern in where', function (done) {
        var expectedConstructString = "\n    CONSTRUCT {\n      <http://testsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://testvalue>.\n    }WHERE {\n      <http://testsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://testvalue>.\n    }\n    ".replace(/\s/g, '');
        sparql_1.SparqlUtil.parseQueryAsync("INSERT {\n      $subject a $value.\n      GRAPH <http://testgraph>{\n        <http://testsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://testtype>.\n      }\n    } WHERE {\n      $subject a $value\n    }").onValue(function (insertQuery) {
            chai_1.expect(forms_1.LdpPersistence.default.createFieldConstructQueries(insertQuery, [rdf_1.Rdf.iri('http://testvalue')], rdf_1.Rdf.iri('http://testsubject')).map(function (construct) { return sparql_1.SparqlUtil.serializeQuery(construct).replace(/\s/g, ''); }).toArray()).to.be.deep.equal([expectedConstructString]);
            done();
        });
        this.request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({}));
    });
    it('with bgp and graph pattern in insert, and other patterns in where', function (done) {
        var expectedConstructString = "\n    CONSTRUCT {\n      <http://testsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://testvalue>.\n    }WHERE {\n      {\n        <http://testsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://testvalue>.\n        SERVICE<http://testservice>{\n          <http://servicesubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://servicetype>.\n        }\n        GRAPH <http://testgraphinwhere>{\n          <http://graphsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://graphtype>.\n        }\n      }UNION{\n        <http://unionsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://uniontype>.\n      }\n    }\n    ".replace(/\s/g, '');
        sparql_1.SparqlUtil.parseQueryAsync("INSERT {\n      $subject a $value.\n      GRAPH <http://testgraph>{\n        <http://testsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://testtype>.\n      }\n    } WHERE {\n      {\n        $subject a $value\n        SERVICE<http://testservice>{\n          <http://servicesubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://servicetype>.\n        }\n        GRAPH <http://testgraphinwhere>{\n          <http://graphsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://graphtype>.\n        }\n      }UNION{\n        <http://unionsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://uniontype>.\n      }\n    }").onValue(function (insertQuery) {
            chai_1.expect(forms_1.LdpPersistence.default.createFieldConstructQueries(insertQuery, [rdf_1.Rdf.iri('http://testvalue')], rdf_1.Rdf.iri('http://testsubject')).map(function (construct) { return sparql_1.SparqlUtil.serializeQuery(construct).replace(/\s/g, ''); }).toArray()).to.be.deep.equal([expectedConstructString]);
            done();
        });
        this.request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({}));
    });
    it('with multiple new values', function (done) {
        var expectedConstructString = "\n    CONSTRUCT {\n      <http://testsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://testvalue>.\n    }WHERE {\n      <http://testsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://testvalue>.\n    }\n    ".replace(/\s/g, '');
        var expectedConstructString2 = "\n    CONSTRUCT {\n      <http://testsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://testvalue2>.\n    }WHERE {\n      <http://testsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://testvalue2>.\n    }\n    ".replace(/\s/g, '');
        sparql_1.SparqlUtil.parseQueryAsync('INSERT {$subject a $value} WHERE {$subject a $value}').onValue(function (insertQuery) {
            chai_1.expect(forms_1.LdpPersistence.default.createFieldConstructQueries(insertQuery, [rdf_1.Rdf.iri('http://testvalue'), rdf_1.Rdf.iri('http://testvalue2')], rdf_1.Rdf.iri('http://testsubject')).map(function (construct) { return sparql_1.SparqlUtil.serializeQuery(construct).replace(/\s/g, ''); }).toArray()).to.be.deep.equal([expectedConstructString, expectedConstructString2]);
            done();
        });
        this.request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({}));
    });
});
