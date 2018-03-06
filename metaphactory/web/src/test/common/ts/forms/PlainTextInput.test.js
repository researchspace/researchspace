Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var sinon = require("sinon");
var lodash_1 = require("lodash");
var chai_1 = require("chai");
var enzyme_1 = require("enzyme");
var react_bootstrap_1 = require("react-bootstrap");
var rdf_1 = require("platform/api/rdf");
var forms_1 = require("platform/components/forms");
var LangLiteral = rdf_1.Rdf.LangLiteral;
var FieldProps_1 = require("./fixturies/FieldProps");
describe('Plain Text Component', function () {
    var inputComponent = enzyme_1.mount(react_1.createElement(forms_1.PlainTextInput, FieldProps_1.PROPS));
    describe('render', function () {
        it('with default parameters', function () {
            chai_1.expect(inputComponent.find(react_bootstrap_1.FormControl)).to.have.length(1);
        });
    });
    it('call callback when value is changed', function () {
        var callback = sinon.spy();
        var props = tslib_1.__assign({}, FieldProps_1.PROPS, { updateValue: callback });
        var wrapper = enzyme_1.mount(react_1.createElement(forms_1.PlainTextInput, props));
        wrapper.find('input').simulate('change');
        chai_1.expect(callback.called).to.be.true;
    });
    it('render input when multiline option is false', function () {
        chai_1.expect(inputComponent.find(react_bootstrap_1.FormControl)).to.have.length(1);
    });
    it('render textarea when multiline option is true', function () {
        var props = tslib_1.__assign({}, FieldProps_1.PROPS, { multiline: true });
        var wrapper = enzyme_1.mount(react_1.createElement(forms_1.PlainTextInput, props));
        chai_1.expect(wrapper.find('TextareaAutosize')).to.have.length(1);
    });
    describe('languages', function () {
        var propsWithLang = tslib_1.__assign({}, FieldProps_1.PROPS, { languages: ['lang1', 'lang2'] });
        var inputWithLang = enzyme_1.mount(react_1.createElement(forms_1.PlainTextInput, propsWithLang));
        it('render language select list', function () {
            chai_1.expect(inputWithLang.find('Select')).to.have.length(1);
        });
        it('without language select when languages not exist', function () {
            chai_1.expect(inputComponent.find('Select')).to.not.have.length(1);
        });
        it('show empty language when default don\'t exist', function () {
            chai_1.expect(inputWithLang.find('Select').props().value).to.eql({
                key: undefined,
                label: 'No language',
            });
        });
        it('show default language when its langLiteral', function () {
            var langLiteral = new LangLiteral('value', 'language');
            var props = lodash_1.clone(FieldProps_1.PROPS);
            props.value = forms_1.FieldValue.fromLabeled({ value: langLiteral });
            var wrapper = enzyme_1.mount(react_1.createElement(forms_1.PlainTextInput, props));
            chai_1.expect(wrapper.find('Select').props().value).to.eql({ key: 'language', label: 'language' });
        });
        it('show "No language" if literal', function () {
            var props = tslib_1.__assign({}, FieldProps_1.PROPS, { languages: ['lang1', 'lang2'] });
            var literalInput = enzyme_1.mount(react_1.createElement(forms_1.PlainTextInput, props));
            chai_1.expect(literalInput.find('Select').props().value).to.eql({
                key: undefined,
                label: 'No language',
            });
        });
    });
});
