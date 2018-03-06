Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var rdf_1 = require("platform/api/rdf");
var forms_1 = require("platform/components/forms");
var Datatypes_1 = require("./fixturies/Datatypes");
describe('SingleValueInput Component', function () {
    it('correctly validates form values', function () {
        for (var _i = 0, DATATYPES_FIXTURIES_1 = Datatypes_1.DATATYPES_FIXTURIES; _i < DATATYPES_FIXTURIES_1.length; _i++) {
            var fixture = DATATYPES_FIXTURIES_1[_i];
            var datatype = rdf_1.XsdDataTypeValidation.parseXsdDatatype(fixture.datatype).iri;
            var isIri = datatype.equals(rdf_1.vocabularies.xsd.anyURI);
            for (var _a = 0, _b = fixture.values.valid; _a < _b.length; _a++) {
                var validValue = _b[_a];
                var rdfValue = isIri ? rdf_1.Rdf.iri(validValue) : rdf_1.Rdf.literal(validValue, datatype);
                var result = forms_1.validateType({ value: rdfValue }, datatype);
                chai_1.expect(forms_1.FieldValue.getErrors(result).size).to.be.equal(0, rdfValue + " should be valid value of type <" + rdf_1.XsdDataTypeValidation.datatypeToString(datatype) + ">, " +
                    "but there was errors: " +
                    forms_1.FieldValue.getErrors(result).map(function (e) { return "\"" + e.message + "\""; }).join('\n'));
            }
            for (var _c = 0, _d = fixture.values.invalid; _c < _d.length; _c++) {
                var invalidValue = _d[_c];
                var rdfValue = isIri
                    ? rdf_1.Rdf.iri(invalidValue)
                    : rdf_1.Rdf.literal(invalidValue, datatype);
                var result = forms_1.validateType({ value: rdfValue }, datatype);
                chai_1.expect(forms_1.FieldValue.getErrors(result).size).to.be.equal(1, "Validation \"" + rdfValue + " is <" + rdf_1.XsdDataTypeValidation.datatypeToString(datatype) + ">\" should produce " +
                    ("the following error: \"" + fixture.invalidMessage + "\" but there was none."));
                chai_1.expect(forms_1.FieldValue.getErrors(result).first().message).to.be.equal(fixture.invalidMessage, "Invalid error message when validating \"" + rdfValue + " is <" + rdf_1.XsdDataTypeValidation.datatypeToString(datatype) + ">\"");
            }
        }
    });
});
