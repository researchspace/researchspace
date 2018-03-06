Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var lodash_1 = require("lodash");
var react_1 = require("react");
var DateTimePicker = require("react-datetime");
var moment = require("moment");
var rdf_1 = require("platform/api/rdf");
var FieldValues_1 = require("../FieldValues");
var SingleValueInput_1 = require("./SingleValueInput");
var Decorations_1 = require("./Decorations");
require("./datetime.scss");
exports.INPUT_XSD_DATE_FORMAT = 'YYYY-MM-DDZZ';
exports.INPUT_XSD_TIME_FORMAT = 'HH:mm:ssZZ';
exports.OUTPUT_UTC_DATE_FORMAT = 'YYYY-MM-DD';
exports.OUTPUT_UTC_TIME_FORMAT = 'HH:mm:ss';
var DatePickerInput = (function (_super) {
    tslib_1.__extends(DatePickerInput, _super);
    function DatePickerInput() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.onDateSelected = function (value) {
            var parsed;
            if (typeof value === 'string') {
                parsed = _this.parse(value);
            }
            else {
                var utcMoment = localMomentAsIfItWasUtc(value);
                var mode = getModeFromDatatype(_this.datatype);
                var formattedDate = (mode === 'date' ? utcMoment.format(exports.OUTPUT_UTC_DATE_FORMAT) :
                    mode === 'time' ? utcMoment.format(exports.OUTPUT_UTC_TIME_FORMAT) :
                        utcMoment.format());
                parsed = _this.parse(formattedDate);
            }
            _this.setAndValidate(parsed);
        };
        return _this;
    }
    Object.defineProperty(DatePickerInput.prototype, "datatype", {
        get: function () {
            return this.props.definition.xsdDatatype || rdf_1.vocabularies.xsd.dateTime;
        },
        enumerable: true,
        configurable: true
    });
    DatePickerInput.prototype.render = function () {
        var rdfNode = FieldValues_1.FieldValue.asRdfNode(this.props.value);
        var dateLiteral = dateLiteralFromRdfNode(rdfNode);
        var utcMoment = utcMomentFromRdfLiteral(dateLiteral);
        var localMoment = utcMomentAsIfItWasLocal(utcMoment);
        var mode = this.props.mode || getModeFromDatatype(this.datatype);
        var displayedDate = (localMoment ? localMoment :
            dateLiteral ? dateLiteral.value :
                (rdfNode && rdfNode.isLiteral()) ? rdfNode.value :
                    undefined);
        var placeholder = typeof this.props.placeholder === 'undefined'
            ? defaultPlaceholder(this.props.definition, mode) : this.props.placeholder;
        return react_1.DOM.div({ className: 'date-picker-field' }, react_1.createElement(DateTimePicker, {
            className: 'date-picker-field__date-picker',
            onChange: this.onDateSelected,
            closeOnSelect: true,
            value: displayedDate,
            viewMode: mode === 'time' ? 'time' : 'days',
            dateFormat: (mode === 'date' || mode === 'dateTime') ? exports.OUTPUT_UTC_DATE_FORMAT : null,
            timeFormat: (mode === 'time' || mode === 'dateTime') ? exports.OUTPUT_UTC_TIME_FORMAT : null,
            inputProps: { placeholder: placeholder },
        }), react_1.createElement(Decorations_1.ValidationMessages, { errors: FieldValues_1.FieldValue.getErrors(this.props.value) }));
    };
    DatePickerInput.prototype.parse = function (isoDate) {
        if (isoDate.length === 0) {
            return FieldValues_1.FieldValue.empty;
        }
        return FieldValues_1.AtomicValue.set(this.props.value, {
            value: rdf_1.Rdf.literal(isoDate, this.datatype),
        });
    };
    return DatePickerInput;
}(SingleValueInput_1.AtomicValueInput));
exports.DatePickerInput = DatePickerInput;
function getModeFromDatatype(datatype) {
    var parsed = rdf_1.XsdDataTypeValidation.parseXsdDatatype(datatype);
    if (parsed && parsed.prefix === 'xsd') {
        switch (parsed.localName) {
            case 'date': return 'date';
            case 'time': return 'time';
        }
    }
    return 'dateTime';
}
exports.getModeFromDatatype = getModeFromDatatype;
function dateLiteralFromRdfNode(node) {
    if (!node || !node.isLiteral()) {
        return undefined;
    }
    var dateString = node.value;
    var types = [rdf_1.vocabularies.xsd.date, rdf_1.vocabularies.xsd.time, rdf_1.vocabularies.xsd.dateTime];
    return lodash_1.find(types.map(function (type) { return rdf_1.Rdf.literal(dateString, type); }), function (literal) { return rdf_1.XsdDataTypeValidation.validate(literal).success; });
}
function utcMomentFromRdfLiteral(literal) {
    if (!literal) {
        return undefined;
    }
    var mode = getModeFromDatatype(literal.dataType);
    var parsedMoment = (mode === 'date' ? moment.utc(literal.value, exports.INPUT_XSD_DATE_FORMAT) :
        mode === 'time' ? moment.utc(literal.value, exports.INPUT_XSD_TIME_FORMAT) :
            moment.utc(literal.value));
    return parsedMoment.isValid() ? parsedMoment : undefined;
}
exports.utcMomentFromRdfLiteral = utcMomentFromRdfLiteral;
function utcMomentAsIfItWasLocal(utcMoment) {
    if (!utcMoment) {
        return undefined;
    }
    var localOffset = moment().utcOffset();
    return utcMoment.clone().subtract(localOffset, 'm').local();
}
function localMomentAsIfItWasUtc(localMoment) {
    var localOffset = moment().utcOffset();
    return localMoment.clone().utc().add(localOffset, 'm');
}
function defaultPlaceholder(definition, mode) {
    var valueType = mode === 'time' ? 'time' : 'date';
    return "Select or enter " + (definition.label || valueType).toLocaleLowerCase() + " here...";
}
exports.default = DatePickerInput;
