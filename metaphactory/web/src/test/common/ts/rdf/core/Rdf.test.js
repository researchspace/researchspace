Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var rdf_1 = require("platform/api/rdf");
var xsd = rdf_1.vocabularies.xsd;
describe('RDF', function () {
    describe('utils', function () {
        it('parse full IRI', function () {
            var iri = rdf_1.Rdf.fullIri('<http://example.com>');
            chai_1.expect(iri.value).to.be.equal('http://example.com');
        });
        it('throws error when try to parse full IRI which is not enclosed in <>', function () {
            var iri = function () { return rdf_1.Rdf.fullIri('http://example.com'); };
            chai_1.expect(iri).to.throw(Error);
        });
    });
    describe('Node', function () {
        var pairsOfEqualNodes = [
            [rdf_1.Rdf.iri('some:iri'), rdf_1.Rdf.iri('some:iri')],
            [rdf_1.Rdf.literal('42', xsd.integer), rdf_1.Rdf.literal('42', xsd.integer)],
            [rdf_1.Rdf.langLiteral('42', 'en'), rdf_1.Rdf.langLiteral('42', 'en')],
        ];
        var pairsOfUnequalNodes = [
            [rdf_1.Rdf.iri('some:iri'), rdf_1.Rdf.iri('some:other-iri')],
            [rdf_1.Rdf.iri('some:iri'), rdf_1.Rdf.literal('some:iri')],
            [rdf_1.Rdf.iri('some:iri'), rdf_1.Rdf.langLiteral('some:iri', 'en')],
            [rdf_1.Rdf.literal('hello'), rdf_1.Rdf.literal('world')],
            [rdf_1.Rdf.literal('42', xsd.integer), rdf_1.Rdf.literal('42', xsd.double)],
            [rdf_1.Rdf.literal('42', xsd.integer), rdf_1.Rdf.literal('42')],
            [rdf_1.Rdf.literal('foo'), rdf_1.Rdf.langLiteral('foo', 'en')],
            [rdf_1.Rdf.langLiteral('hello', 'en'), rdf_1.Rdf.langLiteral('world', 'en')],
            [rdf_1.Rdf.langLiteral('bar', 'en'), rdf_1.Rdf.langLiteral('bar', 'ru')],
        ];
        var pairsOfFalseComparisons = [
            [rdf_1.Rdf.iri('foo:foo'), 'foo:foo'],
            [rdf_1.Rdf.iri('foo:foo'), { value: 'foo:foo' }],
            [rdf_1.Rdf.literal('foo'), 'foo'],
            [rdf_1.Rdf.literal('42', xsd.integer), 42],
            [rdf_1.Rdf.literal(true), true],
            [rdf_1.Rdf.langLiteral('bar', 'en'), {}],
        ];
        it('equals to same node is correct, reflexive and symmetric', function () {
            for (var _i = 0, pairsOfEqualNodes_1 = pairsOfEqualNodes; _i < pairsOfEqualNodes_1.length; _i++) {
                var _a = pairsOfEqualNodes_1[_i], first = _a[0], second = _a[1];
                chai_1.expect(first.equals(first) && second.equals(second)).to.be.equal(true, first + " and " + second + " should be equal to itself");
                chai_1.expect(first.equals(second) && second.equals(first)).to.be.equal(true, first + " should be equal to " + second + " (and in reverse too)");
            }
        });
        it('equal nodes has same hashCode', function () {
            for (var _i = 0, pairsOfEqualNodes_2 = pairsOfEqualNodes; _i < pairsOfEqualNodes_2.length; _i++) {
                var _a = pairsOfEqualNodes_2[_i], first = _a[0], second = _a[1];
                chai_1.expect(first.hashCode()).to.be.equal(second.hashCode(), "Hashcode of equal nodes " + first + " and " + second + " must match");
            }
        });
        it('different nodes are unequal', function () {
            for (var _i = 0, pairsOfUnequalNodes_1 = pairsOfUnequalNodes; _i < pairsOfUnequalNodes_1.length; _i++) {
                var _a = pairsOfUnequalNodes_1[_i], first = _a[0], second = _a[1];
                chai_1.expect(first.equals(second)).to.be.equal(false, first + " should not equals " + second);
                chai_1.expect(second.equals(first)).to.be.equal(false, first + " should not equals " + second);
            }
        });
        it('never equals to a non-Node', function () {
            for (var _i = 0, pairsOfFalseComparisons_1 = pairsOfFalseComparisons; _i < pairsOfFalseComparisons_1.length; _i++) {
                var _a = pairsOfFalseComparisons_1[_i], node = _a[0], other = _a[1];
                chai_1.expect(node.equals(other)).to.be.equal(false, "Node " + node + " should not equals to non-Node value " + JSON.stringify(other));
            }
        });
    });
});
