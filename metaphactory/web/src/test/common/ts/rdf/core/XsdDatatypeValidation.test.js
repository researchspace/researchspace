Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var rdf_1 = require("platform/api/rdf");
var parseXsdDatatype = rdf_1.XsdDataTypeValidation.parseXsdDatatype, validate = rdf_1.XsdDataTypeValidation.validate, sameXsdDatatype = rdf_1.XsdDataTypeValidation.sameXsdDatatype, equal = rdf_1.XsdDataTypeValidation.equal, datatypeEqual = rdf_1.XsdDataTypeValidation.datatypeEqual, datatypeToString = rdf_1.XsdDataTypeValidation.datatypeToString;
var SHORT_STRING = 'xsd:string';
var RDF_SHORT_FORM = 'rdf:langString';
var FULL_FORM = 'http://www.w3.org/2001/XMLSchema#string';
var RDF_FULL_FORM = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString';
var VALID_RESPONSE = { success: true };
describe('XsdDatatypeValidation', function () {
    describe('parseXsdDatatype', function () {
        it('should parse string in full form', function () {
            chai_1.expect(parseXsdDatatype(FULL_FORM)).to.be.eql({
                iri: rdf_1.Rdf.iri(FULL_FORM),
                prefix: 'xsd',
                localName: 'string',
            });
        });
        it('should parse datatype namespace', function () {
            var DATATYPE = 'http://www.w3.org/2001/XMLSchema-datatypes#string';
            chai_1.expect(parseXsdDatatype(DATATYPE)).to.be.eql({
                iri: rdf_1.Rdf.iri(DATATYPE),
                prefix: 'xsd',
                localName: 'string',
            });
        });
        it('should parse string in short form for rdf', function () {
            chai_1.expect(parseXsdDatatype(RDF_FULL_FORM)).to.be.eql({
                iri: rdf_1.Rdf.iri(RDF_FULL_FORM),
                prefix: 'rdf',
                localName: 'langString',
            });
        });
        it('should parse string in short form for xsd', function () {
            chai_1.expect(parseXsdDatatype(SHORT_STRING)).to.be.eql({
                iri: rdf_1.Rdf.iri(FULL_FORM),
                prefix: 'xsd',
                localName: 'string',
            });
        });
        it('should parse string in short form for rdf', function () {
            chai_1.expect(parseXsdDatatype(RDF_SHORT_FORM)).to.be.eql({
                iri: rdf_1.Rdf.iri(RDF_FULL_FORM),
                prefix: 'rdf',
                localName: 'langString',
            });
        });
        it('should parse Rdf.iri in full form ', function () {
            chai_1.expect(parseXsdDatatype(rdf_1.Rdf.iri(FULL_FORM))).to.be.eql({
                iri: rdf_1.Rdf.iri(FULL_FORM),
                prefix: 'xsd',
                localName: 'string',
            });
        });
        it('should parse Rdf.iri in short form', function () {
            chai_1.expect(parseXsdDatatype(rdf_1.Rdf.iri(SHORT_STRING))).to.be.undefined;
        });
        it('should return undefined when datatype is invalid', function () {
            chai_1.expect(parseXsdDatatype('')).to.be.undefined;
        });
    });
    describe('validate', function () {
        it('should return success when datatype is valid', function () {
            chai_1.expect(validate(rdf_1.Rdf.literal(SHORT_STRING))).to.be.eql(VALID_RESPONSE);
        });
    });
    describe('sameXsdDatatype', function () {
        it('should return true for same datatypes', function () {
            chai_1.expect(sameXsdDatatype(rdf_1.Rdf.iri(SHORT_STRING), rdf_1.Rdf.iri(SHORT_STRING))).to.be.true;
        });
        it('should return false for different datatypes', function () {
            chai_1.expect(sameXsdDatatype(rdf_1.Rdf.iri(SHORT_STRING), rdf_1.Rdf.iri('xsd:date'))).to.be.false;
        });
    });
    describe('equal', function () {
        it('should return true for same datatypes', function () {
            chai_1.expect(equal(rdf_1.Rdf.literal(SHORT_STRING), rdf_1.Rdf.literal(SHORT_STRING))).to.be.eql({ success: true });
        });
        it('should return error for different datatypes', function () {
            chai_1.expect(equal(rdf_1.Rdf.literal(SHORT_STRING), rdf_1.Rdf.literal('xsd:date'))).to.be.eql({
                success: false,
                message: 'Invalid value, expected is [xsd:string]',
                child: {
                    iri: rdf_1.Rdf.iri(FULL_FORM),
                    prefix: 'xsd',
                    localName: 'string',
                },
                errorPart: 'xsd:date',
            });
        });
    });
    describe('datatypeEqual', function () {
        describe('for string', function () {
            var datatype = {
                iri: rdf_1.Rdf.iri(FULL_FORM),
                prefix: 'xsd',
                localName: 'string',
            };
            it('should return true for for same values', function () {
                chai_1.expect(datatypeEqual(datatype, 'true', 'true')).to.be.eql(VALID_RESPONSE);
            });
            it('should return false for for different values', function () {
                chai_1.expect(datatypeEqual(datatype, 'true', '')).to.be.eql({
                    child: {
                        iri: rdf_1.Rdf.iri(FULL_FORM),
                        prefix: 'xsd',
                        localName: 'string',
                    },
                    success: false,
                    message: 'Invalid value, expected is [true]',
                    errorPart: '',
                });
            });
        });
    });
    describe('datatypeToString', function () {
        it('should return string', function () {
            chai_1.expect(datatypeToString(rdf_1.Rdf.iri(FULL_FORM))).to.be.eql(SHORT_STRING);
        });
    });
});
