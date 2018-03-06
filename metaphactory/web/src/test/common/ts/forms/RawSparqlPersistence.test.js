Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var Immutable = require("immutable");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var forms_1 = require("platform/components/forms");
describe('RawSparqlPersistence', function () {
    var definition = forms_1.normalizeFieldDefinition({
        id: 'platformLabel',
        label: 'Platform label',
        xsdDatatype: 'xsd:string',
        minOccurs: 0,
        maxOccurs: 3,
        selectPattern: 'prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
            'SELECT ?value WHERE {$subject rdfs:label ?value}',
        insertPattern: 'prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
            'INSERT { $subject rdfs:label $value } WHERE {}',
        deletePattern: 'prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
            'DELETE { $subject rdfs:label $value} WHERE {}',
    });
    var subject = rdf_1.Rdf.iri('http://www.metaphacts.com/resource/Start');
    var emptyModel = {
        type: forms_1.CompositeValue.type,
        subject: subject,
        definitions: Immutable.Map([[definition.id, definition]]),
        fields: Immutable.Map(),
        errors: forms_1.FieldError.noErrors,
    };
    var values = Immutable.List().push(forms_1.FieldValue.fromLabeled({ value: rdf_1.Rdf.literal('testValue') }));
    it('Return INSERT query if value has been added into form model', function () {
        var expectedQuery = [
            'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
            'INSERT { <http://www.metaphacts.com/resource/Start> ' +
                'rdfs:label "testValue"^^<http://www.w3.org/2001/XMLSchema#string>. }',
            'WHERE {  }',
        ].join('\n');
        var currentModel = forms_1.CompositeValue.set(emptyModel, {
            fields: emptyModel.fields.set(definition.id, {
                values: values, errors: forms_1.FieldError.noErrors,
            }),
        });
        var updateQueries = forms_1.RawSparqlPersistence.createFormUpdateQueries(emptyModel, currentModel);
        updateQueries.forEach(function (query) {
            chai_1.expect(sparql_1.SparqlUtil.serializeQuery(query)).to.equal(expectedQuery);
        });
    });
    it('Return DELETE query if value has been removed from form model', function () {
        var expectedQuery = [
            'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
            'DELETE { <http://www.metaphacts.com/resource/Start> ' +
                'rdfs:label "testValue"^^<http://www.w3.org/2001/XMLSchema#string>. }',
            'WHERE {  }',
        ].join('\n');
        var initialModel = forms_1.CompositeValue.set(emptyModel, {
            fields: Immutable.Map().set(definition.id, {
                values: values, errors: forms_1.FieldError.noErrors,
            }),
        });
        var updateQueries = forms_1.RawSparqlPersistence.createFormUpdateQueries(initialModel, emptyModel);
        updateQueries.forEach(function (query) {
            chai_1.expect(sparql_1.SparqlUtil.serializeQuery(query)).to.equal(expectedQuery);
        });
    });
    it('Don\'t return query if form model has not changed', function () {
        var updateQueries = forms_1.RawSparqlPersistence.createFormUpdateQueries(emptyModel, emptyModel);
        chai_1.expect(updateQueries.size).to.equal(0);
    });
});
