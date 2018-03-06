Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var components_1 = require("platform/api/components");
var rdf_1 = require("platform/api/rdf");
var FieldValues_1 = require("../FieldValues");
var SingleValueInput = (function (_super) {
    tslib_1.__extends(SingleValueInput, _super);
    function SingleValueInput(props, context) {
        return _super.call(this, props, context) || this;
    }
    SingleValueInput.prototype.dataState = function () {
        return FieldValues_1.DataState.Ready;
    };
    SingleValueInput.prototype.validate = function (selected) {
        return selected;
    };
    SingleValueInput.prototype.finalize = function (owner, value) {
        return value;
    };
    SingleValueInput.prototype.canEdit = function () {
        var dataState = this.props.dataState;
        return dataState === FieldValues_1.DataState.Ready || dataState === FieldValues_1.DataState.Verifying;
    };
    return SingleValueInput;
}(components_1.Component));
exports.SingleValueInput = SingleValueInput;
var AtomicValueInput = (function (_super) {
    tslib_1.__extends(AtomicValueInput, _super);
    function AtomicValueInput(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.assertAtomicOrEmpty(props.value);
        return _this;
    }
    AtomicValueInput.prototype.componentWillReceiveProps = function (props) {
        this.assertAtomicOrEmpty(props.value);
    };
    AtomicValueInput.prototype.setAndValidate = function (value) {
        var _this = this;
        this.props.updateValue(function () { return _this.validate(value); });
    };
    AtomicValueInput.prototype.validate = function (selected) {
        var atomic = this.assertAtomicOrEmpty(selected);
        if (FieldValues_1.FieldValue.isEmpty(atomic)) {
            return atomic;
        }
        var newValue = validateType(atomic, this.props.definition.xsdDatatype);
        return FieldValues_1.AtomicValue.set(newValue, {
            errors: atomic.errors
                .filter(function (error) { return error.kind !== FieldValues_1.ErrorKind.Input &&
                error.kind !== FieldValues_1.ErrorKind.Validation; })
                .toList().concat(FieldValues_1.FieldValue.getErrors(newValue)),
        });
    };
    AtomicValueInput.prototype.assertAtomicOrEmpty = function (value) {
        if (FieldValues_1.FieldValue.isEmpty(value) || FieldValues_1.FieldValue.isAtomic(value)) {
            return value;
        }
        else {
            throw new Error('Expected atomic or empty value');
        }
    };
    return AtomicValueInput;
}(SingleValueInput));
exports.AtomicValueInput = AtomicValueInput;
function validateType(selected, datatype) {
    if (!selected.value) {
        return FieldValues_1.FieldValue.empty;
    }
    if (!datatype) {
        return FieldValues_1.FieldValue.fromLabeled(selected);
    }
    if (rdf_1.XsdDataTypeValidation.sameXsdDatatype(datatype, rdf_1.vocabularies.xsd.anyURI)) {
        if (selected.value.isLiteral()) {
            var literal = selected.value;
            return withInputError(selected, "Selected value is " + rdf_1.XsdDataTypeValidation.datatypeToString(literal.dataType) + " " +
                "where IRI expected");
        }
        else {
            var validation = rdf_1.XsdDataTypeValidation.validate(rdf_1.Rdf.literal(selected.value.value, rdf_1.vocabularies.xsd.anyURI));
            if (validation.success) {
                return FieldValues_1.FieldValue.fromLabeled(selected);
            }
            else {
                return withInputError(selected, validation.message);
            }
        }
    }
    else {
        if (selected.value.isLiteral()) {
            var literal = selected.value;
            var coerced = coerceTo(datatype, literal);
            if (coerced) {
                var validation = rdf_1.XsdDataTypeValidation.validate(coerced);
                if (validation.success) {
                    return FieldValues_1.FieldValue.fromLabeled({ value: coerced, label: selected.label });
                }
                else {
                    return withInputError({ value: coerced, label: selected.label }, validation.message);
                }
            }
            else {
                return withInputError(selected, "XSD datatype of selected value is " +
                    (rdf_1.XsdDataTypeValidation.datatypeToString(literal.dataType) + " where ") +
                    (rdf_1.XsdDataTypeValidation.datatypeToString(datatype) + " expected"));
            }
        }
        else {
            return withInputError(selected, "Selected value is IRI where " + rdf_1.XsdDataTypeValidation.datatypeToString(datatype) + " expected");
        }
    }
}
exports.validateType = validateType;
function coerceTo(datatype, value) {
    if (rdf_1.XsdDataTypeValidation.sameXsdDatatype(datatype, value.dataType)) {
        return value;
    }
    else if (rdf_1.XsdDataTypeValidation.sameXsdDatatype(datatype, rdf_1.vocabularies.xsd._string)
        && rdf_1.XsdDataTypeValidation.sameXsdDatatype(value.dataType, rdf_1.vocabularies.rdf.langString)) {
        return rdf_1.Rdf.literal(value.value, datatype);
    }
    else if (rdf_1.XsdDataTypeValidation.sameXsdDatatype(datatype, rdf_1.vocabularies.rdf.langString)
        && rdf_1.XsdDataTypeValidation.sameXsdDatatype(value.dataType, rdf_1.vocabularies.xsd._string)) {
        return value;
    }
    else {
        return undefined;
    }
}
function withInputError(value, error) {
    return FieldValues_1.FieldValue.fromLabeled(value, FieldValues_1.FieldError.noErrors.push({
        kind: FieldValues_1.ErrorKind.Input,
        message: error,
    }));
}
