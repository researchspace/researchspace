Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var chai_1 = require("chai");
var sinon = require("sinon");
var enzyme_1 = require("enzyme");
var rdf_1 = require("platform/api/rdf");
var forms_1 = require("platform/components/forms");
var Immutable = require("immutable");
var DATATYPE = rdf_1.Rdf.iri('http://www.w3.org/2001/XMLSchema-datatypes#string');
var VALUE = {
    value: rdf_1.Rdf.iri('http://www.metaphacts.com/resource/example/test'),
    label: rdf_1.Rdf.literal('label'),
    parent: '',
};
var BASIC_PROPS = {
    definition: forms_1.normalizeFieldDefinition({
        id: 'nameProp',
        label: 'labelProp',
        xsdDatatype: DATATYPE,
        minOccurs: 1,
        maxOccurs: 1,
        valueSetPattern: '',
    }),
    for: 'date',
    value: forms_1.FieldValue.empty,
    valueSet: Immutable.List([VALUE]),
};
var AUTOCOMPLETE_SELECTOR = 'AutoCompletionInput';
describe('AutocompleteInput Component', function () {
    var autocompleteComponent = enzyme_1.shallow(react_1.createElement(forms_1.AutocompleteInput, BASIC_PROPS));
    var autocomplete = autocompleteComponent.find(AUTOCOMPLETE_SELECTOR);
    var fieldProps = autocomplete.props();
    it('render with default parameters', function () {
        chai_1.expect(autocomplete).to.have.length(1);
    });
    it('have minimum query limit for request', function () {
        chai_1.expect(fieldProps.minimumInput).to.be.equal(3);
    });
    it('have template for suggestion', function () {
        var template = "<span title=\"{{label.value}}\">{{label.value}}</span>";
        chai_1.expect(fieldProps.templates.suggestion).to.be.equal(template);
    });
    it('call callback when value is changed', function () {
        var callback = sinon.spy();
        var props = tslib_1.__assign({}, BASIC_PROPS, { updateValue: callback });
        var wrapper = enzyme_1.shallow(react_1.createElement(forms_1.AutocompleteInput, props));
        var inputProps = wrapper.find(AUTOCOMPLETE_SELECTOR).props();
        inputProps.actions.onSelected();
        chai_1.expect(callback.called).to.be.true;
    });
});
