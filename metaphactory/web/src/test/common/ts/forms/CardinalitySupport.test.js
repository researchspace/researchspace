Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var chai_1 = require("chai");
var sinon = require("sinon");
var rdf_1 = require("platform/api/rdf");
var navigation_1 = require("platform/api/navigation");
var forms_1 = require("platform/components/forms");
var AsyncForm_1 = require("./fixturies/AsyncForm");
navigation_1.__unsafe__setCurrentResource(rdf_1.Rdf.iri('http://test'));
var fieldProps = {
    definition: forms_1.normalizeFieldDefinition({
        id: '',
        label: '',
        xsdDatatype: rdf_1.vocabularies.xsd._string,
        minOccurs: 0,
        maxOccurs: 0,
        selectPattern: '',
    }),
    for: 'testId',
    value: forms_1.FieldValue.empty,
    dataState: forms_1.DataState.Ready,
};
var ADD_BUTTON_SELECTOR = '.cardinality-support__add-value';
var REMOVE_BUTTON_SELECTOR = '.cardinality-support__remove-value';
describe('CardinalitySupport', function () {
    var children = [
        react_1.createElement(forms_1.PlainTextInput, fieldProps),
    ];
    var server = sinon.fakeServer.create();
    server.respondWith('GET', '/rest/data/rdf/namespace/getRegisteredPrefixes', [200, { 'Content-Type': 'application/json' }, '{ }']);
    it('remove and add values according to minOccurs=2 and maxOccurs=3 definitions', function () {
        var fields = [{
                id: 'testId',
                xsdDatatype: rdf_1.vocabularies.xsd._string,
                minOccurs: 2,
                maxOccurs: 3,
            }];
        return new AsyncForm_1.AsyncForm(fields, children).mount().then(function (asyncForm) {
            var form = asyncForm.wrapper;
            chai_1.expect(form.find('PlainTextInput').length).to.be.eql(2, 'should render field with two inputs pre-initalized');
            var addButton = form.find(ADD_BUTTON_SELECTOR);
            chai_1.expect(addButton).to.have.length(1, 'does have an add value button');
            return asyncForm.performChangeAndWaitUpdate(function () { return addButton.simulate('click'); });
        }).then(function (asyncForm) {
            var form = asyncForm.wrapper;
            chai_1.expect(form.find('PlainTextInput').length).to.be.eql(3, 'can add field value until number of values equals maxOccurs');
            chai_1.expect(form.find(ADD_BUTTON_SELECTOR).length).to.be.equal(0, 'can\'t add field value when number of values equals maxOccurs');
            var removeButton = form.find(REMOVE_BUTTON_SELECTOR).first();
            return asyncForm.performChangeAndWaitUpdate(function () { return removeButton.simulate('click'); });
        }).then(function (asyncForm) {
            var form = asyncForm.wrapper;
            chai_1.expect(form.find('PlainTextInput').length).to.be.eql(2, 'can remove field value when number of values is not lower minOccurs');
            var removeButton = form.find(REMOVE_BUTTON_SELECTOR);
            chai_1.expect(removeButton.length).to.be.eql(0, 'can\'t remove field when number of values is equals to minOccurs');
        });
    });
    it('remove and add values according to minOccurs=0 and maxOccurs=2 definitions', function () {
        var fields = [{
                id: 'testId',
                xsdDatatype: rdf_1.vocabularies.xsd._string,
                minOccurs: 0,
                maxOccurs: 2,
            }];
        return new AsyncForm_1.AsyncForm(fields, children).mount().then(function (asyncForm) {
            var form = asyncForm.wrapper;
            chai_1.expect(form.find('PlainTextInput').length).to.be.eql(1, 'render field component with 1 inputs pre-initalized');
            var addButton = form.find(ADD_BUTTON_SELECTOR);
            chai_1.expect(addButton).to.have.length(1, 'does have an add value button initalized');
            chai_1.expect(form.find('PlainTextInput').length).to.be.eql(1, 'does have one input initalized');
            return asyncForm.performChangeAndWaitUpdate(function () { return addButton.simulate('click'); });
        }).then(function (asyncForm) {
            var form = asyncForm.wrapper;
            chai_1.expect(form.find('PlainTextInput').length).to.be.eql(2, 'can add field value until number of values equals maxOccurs');
            chai_1.expect(form.find(ADD_BUTTON_SELECTOR).length).to.be.equal(0, 'can\'t add field value when number of values equals maxOccurs');
            var removeButton = form.find(REMOVE_BUTTON_SELECTOR).first();
            return asyncForm.performChangeAndWaitUpdate(function () { return removeButton.simulate('click'); });
        }).then(function (asyncForm) {
            var form = asyncForm.wrapper;
            chai_1.expect(form.find('PlainTextInput').length).to.be.eql(1, 'can remove field value when number of values is not lower minOccurs');
            var removeButton = form.find(REMOVE_BUTTON_SELECTOR).first();
            return asyncForm.performChangeAndWaitUpdate(function () { return removeButton.simulate('click'); });
        }).then(function (asyncForm) {
            var form = asyncForm.wrapper;
            chai_1.expect(form.find('PlainTextInput').everyWhere(function (input) {
                var node = input.getDOMNode();
                return node.offsetParent === null;
            })).to.be.equal(true, 'can remove last value as well');
            chai_1.expect(form.find(REMOVE_BUTTON_SELECTOR).length).to.be.equal(0, 'can\'t remove field when number of values is equals to minOccurs (0)');
        });
    });
});
