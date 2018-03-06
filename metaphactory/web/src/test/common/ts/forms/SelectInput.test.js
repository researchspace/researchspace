Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var chai_1 = require("chai");
var sinon = require("sinon");
var enzyme_1 = require("enzyme");
var Immutable = require("immutable");
var rdf_1 = require("platform/api/rdf");
var forms_1 = require("platform/components/forms");
var DATATYPE = rdf_1.Rdf.iri('http://www.w3.org/2001/XMLSchema-datatypes#string');
var VALUE = {
    value: rdf_1.Rdf.literal('http://www.metaphacts.com/resource/example/test'),
    label: 'label',
    binding: {
        value: rdf_1.Rdf.literal('http://www.metaphacts.com/resource/example/test'),
        label: rdf_1.Rdf.literal('label'),
    },
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
describe('SelectInput Component', function () {
    var baseSelect = enzyme_1.shallow(react_1.createElement(forms_1.SelectInput, BASIC_PROPS));
    var select = baseSelect.find('Select');
    it('render with default parameters', function () {
        chai_1.expect(select).to.have.length(1);
    });
    it('show correct values', function () {
        var val = forms_1.FieldValue.fromLabeled({
            value: rdf_1.Rdf.iri('http://www.metaphacts.com/resource/example/test'),
            label: 'test',
        });
        BASIC_PROPS.value = val;
        var selectFiled = enzyme_1.mount(react_1.createElement(forms_1.SelectInput, BASIC_PROPS));
        chai_1.expect(selectFiled.find('SelectInput').props().value).to.be.eql(val);
    });
    it('call callback when value is changed', function () {
        var callback = sinon.spy();
        var props = tslib_1.__assign({}, BASIC_PROPS, { updateValue: callback });
        var wrapper = enzyme_1.shallow(react_1.createElement(forms_1.SelectInput, props));
        wrapper.find('Select').simulate('change');
        chai_1.expect(callback.called).to.be.true;
    });
});
