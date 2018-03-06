Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var rdf_1 = require("platform/api/rdf");
describe('turtle writer/parser', function () {
    it('conversion beetwen RDF typed literal and N3 literal', function () {
        var literal = rdf_1.Rdf.literal('example');
        var expectedN3Literal = '"example"^^http://www.w3.org/2001/XMLSchema#string';
        var n3Literal = rdf_1.turtle.serialize.nodeToN3(literal);
        chai_1.expect(n3Literal).to.be.equal(expectedN3Literal);
        chai_1.expect(rdf_1.turtle.deserialize.n3ValueToRdf(n3Literal)).to.be.deep.equal(literal);
    });
    it('conversion beetwen RDF lang literal and N3 literal', function () {
        var literal = rdf_1.Rdf.langLiteral('example', 'en');
        var expectedN3Literal = '"example"@en';
        var n3Literal = rdf_1.turtle.serialize.nodeToN3(literal);
        chai_1.expect(n3Literal).to.be.equal(expectedN3Literal);
        chai_1.expect(rdf_1.turtle.deserialize.n3ValueToRdf(n3Literal)).to.be.deep.equal(literal);
    });
    it('conversion beetwen RDF Iri and N3 value', function () {
        var iri = rdf_1.Rdf.iri('http://example.com');
        var expectedN3Value = 'http://example.com';
        var n3Value = rdf_1.turtle.serialize.nodeToN3(iri);
        chai_1.expect(n3Value).to.be.equal(expectedN3Value);
        chai_1.expect(rdf_1.turtle.deserialize.n3ValueToRdf(n3Value)).to.be.deep.equal(iri);
    });
    it('conversion beetwen RDF Bnode and N3 value', function () {
        var bnode = rdf_1.Rdf.bnode('_:node');
        var expectedN3Value = '_:node';
        var n3Value = rdf_1.turtle.serialize.nodeToN3(bnode);
        chai_1.expect(n3Value).to.be.equal(expectedN3Value);
        chai_1.expect(rdf_1.turtle.deserialize.n3ValueToRdf(n3Value)).to.be.deep.equal(bnode);
    });
    it('conversion beetwen RDF Triple and N3 Triple', function () {
        var triple = rdf_1.Rdf.triple(rdf_1.Rdf.bnode('_:node'), rdf_1.Rdf.iri('http://example.com'), rdf_1.Rdf.literal('5', rdf_1.vocabularies.xsd.integer));
        var expectedN3Triple = {
            subject: '_:node',
            predicate: 'http://example.com',
            object: '"5"^^http://www.w3.org/2001/XMLSchema#integer',
        };
        var n3Triple = rdf_1.turtle.serialize.tripleToN3(triple);
        chai_1.expect(n3Triple).to.be.deep.equal(expectedN3Triple);
        chai_1.expect(rdf_1.turtle.deserialize.n3TripleToRdf(n3Triple)).to.be.deep.equal(triple);
    });
});
