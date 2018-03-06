Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var chai_1 = require("chai");
var sinon = require("sinon");
var enzyme_1 = require("enzyme");
var forms_1 = require("platform/components/forms");
var rdf_1 = require("platform/api/rdf");
var lodash_1 = require("lodash");
var DATE_TIME = 'http://www.w3.org/2001/XMLSchema-datatypes#dateTime';
var DATE = 'http://www.w3.org/2001/XMLSchema-datatypes#date';
var TIME = 'http://www.w3.org/2001/XMLSchema-datatypes#time';
var BASIC_PROPS = {
    definition: forms_1.normalizeFieldDefinition({
        id: 'nameProp',
        label: 'labelProp',
        xsdDatatype: rdf_1.Rdf.iri(DATE_TIME),
        minOccurs: 1,
        maxOccurs: 1,
        selectPattern: '',
    }),
    for: 'date',
    value: forms_1.FieldValue.fromLabeled({
        value: rdf_1.Rdf.literal('2016-05-23T10:20:13+05:30', rdf_1.vocabularies.xsd.dateTime),
    }),
    mode: undefined,
};
describe('DatePickerInput Component', function () {
    var datepickerComponent = enzyme_1.mount(react_1.createElement(forms_1.DatePickerInput, BASIC_PROPS));
    var datepicker = datepickerComponent.find('DatePickerInput');
    it('render with default parameters', function () {
        chai_1.expect(datepicker).to.have.length(1);
    });
    describe('modes', function () {
        it('can get mode from props', function () {
            var mode = 'date';
            var props = lodash_1.clone(BASIC_PROPS);
            props.mode = mode;
            var component = enzyme_1.mount(react_1.createElement(forms_1.DatePickerInput, props));
            var componentProps = component.props();
            chai_1.expect(componentProps.mode).to.be.equal(mode);
        });
        describe('date', function () {
            var props = lodash_1.clone(BASIC_PROPS);
            props.definition.xsdDatatype = rdf_1.Rdf.iri(DATE);
            var component = enzyme_1.shallow(react_1.createElement(forms_1.DatePickerInput, props));
            var field = component.find('.date-picker-field__date-picker');
            var fieldProps = field.props();
            it('correct rendered', function () {
                chai_1.expect(fieldProps.dateFormat).to.eql(forms_1.OUTPUT_UTC_DATE_FORMAT);
                chai_1.expect(fieldProps.timeFormat).to.be.null;
            });
            it('have correct default value', function () {
                var momentDateTime = fieldProps.value;
                chai_1.expect(momentDateTime).to.be.an('object');
                chai_1.expect(momentDateTime.format(forms_1.OUTPUT_UTC_DATE_FORMAT + " " + forms_1.OUTPUT_UTC_TIME_FORMAT))
                    .is.eql('2016-05-23 04:50:13');
            });
            it('pass correct value after change', function () {
                var callback = sinon.spy();
                var clonedProps = lodash_1.clone(BASIC_PROPS);
                clonedProps.updateValue = callback;
                clonedProps.definition.xsdDatatype = rdf_1.Rdf.iri(DATE);
                var wrapper = enzyme_1.mount(react_1.createElement(forms_1.DatePickerInput, clonedProps));
                wrapper.find('input').simulate('change', { 'target': { 'value': '05/11/22' } });
                var reducer = callback.args[0][0];
                var newValue = reducer(clonedProps.value).value;
                chai_1.expect(newValue.isLiteral() && newValue.dataType.value).to.be.equal(rdf_1.Rdf.iri(DATE).value);
            });
        });
        describe('time', function () {
            var props = lodash_1.clone(BASIC_PROPS);
            props.definition.xsdDatatype = rdf_1.Rdf.iri(TIME);
            var component = enzyme_1.shallow(react_1.createElement(forms_1.DatePickerInput, props));
            var field = component.find('.date-picker-field__date-picker');
            var fieldProps = field.props();
            it('correct render in time mode', function () {
                chai_1.expect(fieldProps.dateFormat).to.be.null;
                chai_1.expect(fieldProps.timeFormat).to.be.equal(forms_1.OUTPUT_UTC_TIME_FORMAT);
            });
        });
        describe('datetime', function () {
            var props = lodash_1.clone(BASIC_PROPS);
            props.definition.xsdDatatype = rdf_1.Rdf.iri(DATE_TIME);
            var component = enzyme_1.shallow(react_1.createElement(forms_1.DatePickerInput, props));
            var field = component.find('.date-picker-field__date-picker');
            var fieldProps = field.props();
            it('correct render in datetime mode', function () {
                chai_1.expect(fieldProps.dateFormat).to.eql(forms_1.OUTPUT_UTC_DATE_FORMAT);
                chai_1.expect(fieldProps.timeFormat).to.be.equal(forms_1.OUTPUT_UTC_TIME_FORMAT);
            });
        });
    });
    it('call callback when value is changed', function () {
        var callback = sinon.spy();
        var props = tslib_1.__assign({}, BASIC_PROPS, { updateValue: callback });
        var wrapper = enzyme_1.mount(react_1.createElement(forms_1.DatePickerInput, props));
        wrapper.find('input').simulate('change', { 'target': { 'value': '05/11/22 11:55:22' } });
        chai_1.expect(callback.called).to.be.true;
    });
});
describe('localMomentFromRdfLiteral return correct normalized UTC value', function () {
    it('for dateTime is already normalized', function () {
        var dateTime = '2016-05-23T10:20:13Z';
        var value = rdf_1.Rdf.literal(dateTime, rdf_1.vocabularies.xsd.dateTime);
        chai_1.expect(forms_1.utcMomentFromRdfLiteral(value).creationData().isUTC).to.be.true;
        chai_1.expect(forms_1.utcMomentFromRdfLiteral(value).format()).to.be.eql('2016-05-23T10:20:13Z');
    });
    it('for dateTime with offset +2', function () {
        var dateTime = '2016-05-23T10:20:13+00:00';
        var value = rdf_1.Rdf.literal(dateTime, rdf_1.vocabularies.xsd.dateTime);
        chai_1.expect(forms_1.utcMomentFromRdfLiteral(value).creationData().isUTC).to.be.true;
        chai_1.expect(forms_1.utcMomentFromRdfLiteral(value).format()).to.be.eql('2016-05-23T10:20:13Z');
    });
    it('for dateTime with offset +2', function () {
        var dateTime = '2016-05-23T10:20:13+02:00';
        var value = rdf_1.Rdf.literal(dateTime, rdf_1.vocabularies.xsd.dateTime);
        chai_1.expect(forms_1.utcMomentFromRdfLiteral(value).creationData().isUTC).to.be.true;
        chai_1.expect(forms_1.utcMomentFromRdfLiteral(value).format()).to.be.eql('2016-05-23T08:20:13Z');
    });
    it('for dateTime with offset -3', function () {
        var dateTime = '2016-05-23T10:20:13-03:00';
        var value = rdf_1.Rdf.literal(dateTime, rdf_1.vocabularies.xsd.dateTime);
        chai_1.expect(forms_1.utcMomentFromRdfLiteral(value).creationData().isUTC).to.be.true;
        chai_1.expect(forms_1.utcMomentFromRdfLiteral(value).format()).to.be.eql('2016-05-23T13:20:13Z');
    });
    it('for date with offset', function () {
        var dateTime = '2002-09-24-06:00';
        var value = rdf_1.Rdf.literal(dateTime, rdf_1.vocabularies.xsd.date);
        chai_1.expect(forms_1.utcMomentFromRdfLiteral(value).creationData().isUTC).to.be.true;
        chai_1.expect(forms_1.utcMomentFromRdfLiteral(value).format()).to.be.eql('2002-09-24T06:00:00Z');
    });
    it('for date without offset', function () {
        var dateTime = '2002-09-24';
        var value = rdf_1.Rdf.literal(dateTime, rdf_1.vocabularies.xsd.date);
        chai_1.expect(forms_1.utcMomentFromRdfLiteral(value).creationData().isUTC).to.be.true;
        chai_1.expect(forms_1.utcMomentFromRdfLiteral(value).format()).to.be.eql('2002-09-24T00:00:00Z');
    });
    it('for invalid date', function () {
        var dateTime = 'not a date';
        var value = rdf_1.Rdf.literal(dateTime, rdf_1.vocabularies.xsd.dateTime);
        chai_1.expect(forms_1.utcMomentFromRdfLiteral(value)).to.be.undefined;
    });
    it('for undefined', function () {
        chai_1.expect(forms_1.utcMomentFromRdfLiteral(undefined)).to.be.undefined;
    });
});
