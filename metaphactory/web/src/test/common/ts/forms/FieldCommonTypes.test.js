Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var lodash_1 = require("lodash");
var rdf_1 = require("platform/api/rdf");
var forms_1 = require("platform/components/forms");
var FieldDefinition_1 = require("./fixturies/FieldDefinition");
describe('FieldCommonTypes', function () {
    it('have noErrors', function () {
        chai_1.expect(forms_1.FieldError.noErrors.size).to.be.equal(0);
    });
    it('have noValue', function () {
        chai_1.expect(forms_1.FieldValue.isEmpty(forms_1.FieldValue.empty)).to.be.true;
    });
    it('can normalize field definition', function () {
        var result = {
            id: FieldDefinition_1.FIELD_DEFINITION.id,
            label: FieldDefinition_1.FIELD_DEFINITION.label,
            description: FieldDefinition_1.FIELD_DEFINITION.description,
            categories: [],
            xsdDatatype: rdf_1.Rdf.iri('test'),
            minOccurs: 1,
            maxOccurs: 2,
            defaultValues: [],
            selectPattern: '',
            constraints: [
                {
                    validatePattern: 'ASK { ?s ?p ?o }',
                    message: 'test',
                },
                {
                    validatePattern: 'ASK { BIND(false as ?b). FILTER(?b=true)}',
                    message: 'Value does not pass the SPARQL ASK test.',
                },
            ],
            valueSetPattern: '',
            autosuggestionPattern: 'SELECT * WHERE { ?s ?p ?o }',
        };
        chai_1.expect(forms_1.normalizeFieldDefinition(FieldDefinition_1.FIELD_DEFINITION)).to.eql(result);
    });
    it('can normalize field definition with cardinality', function () {
        var result = {
            id: 'test',
            minOccurs: 0,
            maxOccurs: Infinity,
            defaultValues: [],
            categories: [],
            constraints: [],
        };
        chai_1.expect(forms_1.normalizeFieldDefinition(FieldDefinition_1.FIELD_DEFINITION_CARDINATILIY)).to.eql(result);
    });
    it('add minOccur', function () {
        var definition = lodash_1.clone(FieldDefinition_1.FIELD_DEFINITION);
        delete definition.minOccurs;
        chai_1.expect(forms_1.normalizeFieldDefinition(definition).minOccurs).to.be.eql(0);
    });
    it('add maxOccur', function () {
        var definition = lodash_1.clone(FieldDefinition_1.FIELD_DEFINITION);
        delete definition.maxOccurs;
        chai_1.expect(forms_1.normalizeFieldDefinition(definition).maxOccurs).to.be.eql(Infinity);
    });
    it('preserves omitted XSD datatype', function () {
        var definition = lodash_1.clone(FieldDefinition_1.FIELD_DEFINITION);
        delete definition.xsdDatatype;
        chai_1.expect(forms_1.normalizeFieldDefinition(definition).xsdDatatype).to.be.eql(undefined);
    });
    it('normalizes dataType', function () {
        var definition = lodash_1.clone(FieldDefinition_1.FIELD_DEFINITION);
        definition.xsdDatatype = 'http://www.w3.org/2001/XMLSchema-datatypes#string';
        chai_1.expect(forms_1.normalizeFieldDefinition(definition).xsdDatatype).to.be.eql(rdf_1.Rdf.iri('http://www.w3.org/2001/XMLSchema#string'));
    });
});
