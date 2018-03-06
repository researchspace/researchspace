Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var chai_1 = require("chai");
var sinon = require("sinon");
var navigation_1 = require("platform/api/navigation");
var rdf_1 = require("platform/api/rdf");
var forms_1 = require("platform/components/forms");
navigation_1.__unsafe__setCurrentResource(rdf_1.Rdf.iri('test'));
var AsyncForm_1 = require("./fixturies/AsyncForm");
var FieldDefinition_1 = require("./fixturies/FieldDefinition");
var ADD_BUTTON_SELECTOR = '.cardinality-support__add-value';
var REMOVE_BUTTON_SELECTOR = '.cardinality-support__remove-value';
var children = [
    react_1.createElement(forms_1.PlainTextInput, { for: FieldDefinition_1.FIELD_DEFINITION.id }),
    react_1.DOM.button({ name: 'reset' }),
    react_1.DOM.button({ name: 'submit' }),
];
describe('SemanticForm', function () {
    var server = sinon.fakeServer.create();
    server.respondWith('GET', '/rest/data/rdf/namespace/getRegisteredPrefixes', [200, { 'Content-Type': 'application/json' }, '{ }']);
    it('loads and renders fields', function () {
        var fields = [FieldDefinition_1.FIELD_DEFINITION];
        return new AsyncForm_1.AsyncForm(fields, children).mount().then(function (basicForm) {
            var form = basicForm.wrapper;
            chai_1.expect(form.find('SemanticForm'), 'should have text field').to.have.length(1);
            chai_1.expect(form.find('[name="submit"]', 'should have submit button')).to.have.length(1);
            chai_1.expect(form.find('[name="reset"]'), 'should have reset button').to.have.length(1);
        });
    });
    it('have correct state after input change', function () {
        var fieldsWithString = [tslib_1.__assign({}, FieldDefinition_1.FIELD_DEFINITION, { xsdDatatype: rdf_1.vocabularies.xsd._string })];
        return new AsyncForm_1.AsyncForm(fieldsWithString, children).mount().then(function (basicForm) {
            return basicForm.performChangeAndWaitUpdate(function () {
                var form = basicForm.wrapper;
                form.find('input').simulate('change', { target: { value: 'testValue' } });
            });
        }).then(function (basicForm) {
            var fieldStates = basicForm.model ? basicForm.model.fields.toArray() : [];
            chai_1.expect(fieldStates.length).to.be.greaterThan(0, 'should have model with field state after change');
            var fieldValues = fieldStates[0].values;
            chai_1.expect(fieldValues.size).to.be.equal(1, 'should have exactly one value after change');
            var formRdfValue = forms_1.FieldValue.asRdfNode(fieldValues.first());
            chai_1.expect(formRdfValue.value).to.equal('testValue', 'should have field with correct value after change');
            chai_1.expect(formRdfValue.isLiteral(), 'should have field of type literal after change').to.be.true;
            chai_1.expect(formRdfValue.dataType.value).to.equal(rdf_1.vocabularies.xsd._string.value, 'should have field of data type xsd:string after change');
        });
    });
    it('should support maxOccur', function () {
        var fields = [FieldDefinition_1.FIELD_DEFINITION];
        return new AsyncForm_1.AsyncForm(fields, children).mount().then(function (basicForm) {
            var form = basicForm.wrapper;
            var addButton = form.find(ADD_BUTTON_SELECTOR);
            chai_1.expect(addButton, 'should have one add button').to.have.length(1);
            return basicForm.performChangeAndWaitUpdate(function () { return addButton.simulate('click'); });
        }).then(function (basicForm) {
            var form = basicForm.wrapper;
            chai_1.expect(form.find('PlainTextInput').length, 'should be able to add value when does not exceed maxOccur').to.be.eql(2);
            var addButton = form.find(ADD_BUTTON_SELECTOR);
            chai_1.expect(addButton).to.have.length(0, 'can\'t add field when its exceed maxOccur');
        });
    });
    it('should support minOccur', function () {
        var fieldsWithOptional = [tslib_1.__assign({}, FieldDefinition_1.FIELD_DEFINITION, { minOccurs: 0 })];
        return new AsyncForm_1.AsyncForm(fieldsWithOptional, children).mount().then(function (basicForm) {
            var form = basicForm.wrapper;
            var removeButton = form.find(REMOVE_BUTTON_SELECTOR).first();
            return basicForm.performChangeAndWaitUpdate(function () { return removeButton.simulate('click'); });
        }).then(function (basicForm) {
            var form = basicForm.wrapper;
            chai_1.expect(form.find('PlainTextInput').length, 'can remove field when does not exceed minOccur').to.be.eql(1);
            var removeButton = form.find(REMOVE_BUTTON_SELECTOR);
            chai_1.expect(removeButton.length, 'can\'t remove field when its exceed minOccur').to.be.eql(0);
        });
    });
});
