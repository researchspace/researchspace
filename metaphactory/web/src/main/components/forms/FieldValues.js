Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Immutable = require("immutable");
var LabeledValue;
(function (LabeledValue) {
    function set(source, props) {
        return tslib_1.__assign({}, source, props);
    }
    LabeledValue.set = set;
})(LabeledValue = exports.LabeledValue || (exports.LabeledValue = {}));
var SparqlBindingValue;
(function (SparqlBindingValue) {
    function set(source, props) {
        return tslib_1.__assign({}, source, props);
    }
    SparqlBindingValue.set = set;
})(SparqlBindingValue = exports.SparqlBindingValue || (exports.SparqlBindingValue = {}));
var ErrorKind;
(function (ErrorKind) {
    ErrorKind[ErrorKind["Configuration"] = 0] = "Configuration";
    ErrorKind[ErrorKind["Loading"] = 1] = "Loading";
    ErrorKind[ErrorKind["Input"] = 2] = "Input";
    ErrorKind[ErrorKind["Validation"] = 3] = "Validation";
})(ErrorKind = exports.ErrorKind || (exports.ErrorKind = {}));
var FieldError;
(function (FieldError) {
    FieldError.noErrors = Immutable.List();
    function isPreventSubmit(error) {
        return error.kind === ErrorKind.Configuration ||
            error.kind === ErrorKind.Input ||
            error.kind === ErrorKind.Validation;
    }
    FieldError.isPreventSubmit = isPreventSubmit;
    function kindToString(kind) {
        switch (kind) {
            case ErrorKind.Configuration: return 'configuration';
            case ErrorKind.Loading: return 'loading';
            case ErrorKind.Input: return 'input';
            case ErrorKind.Validation: return 'validation';
            default: return 'unknown';
        }
    }
    FieldError.kindToString = kindToString;
})(FieldError = exports.FieldError || (exports.FieldError = {}));
var EmptyValue;
(function (EmptyValue) {
    EmptyValue.type = 'empty';
})(EmptyValue = exports.EmptyValue || (exports.EmptyValue = {}));
var AtomicValue;
(function (AtomicValue) {
    AtomicValue.type = 'atomic';
    function set(source, props) {
        if (source.type === EmptyValue.type && !('value' in props)) {
            throw new Error('AtomicValue.value is required to create AtomicValue from EmptyValue');
        }
        else if ('value' in props && !props.value) {
            throw new Error('AtomicValue.value cannot be null or undefined');
        }
        else if ('errors' in props && !props.errors) {
            throw new Error('AtomicValue.errors cannot be null or undefined');
        }
        return source.type === EmptyValue.type
            ? tslib_1.__assign({ type: AtomicValue.type, errors: FieldError.noErrors }, props) : tslib_1.__assign({}, source, props);
    }
    AtomicValue.set = set;
})(AtomicValue = exports.AtomicValue || (exports.AtomicValue = {}));
var DataState;
(function (DataState) {
    DataState[DataState["Loading"] = 1] = "Loading";
    DataState[DataState["Ready"] = 2] = "Ready";
    DataState[DataState["Verifying"] = 3] = "Verifying";
})(DataState = exports.DataState || (exports.DataState = {}));
var FieldState;
(function (FieldState) {
    FieldState.empty = {
        values: Immutable.List(),
        errors: Immutable.List(),
    };
    function set(source, props) {
        if ('values' in props && props.values === undefined) {
            throw new Error('FieldState.values cannot be undefined');
        }
        else if ('errors' in props && props.errors === undefined) {
            throw new Error('FieldState.errors cannot be undefined');
        }
        return tslib_1.__assign({}, source, props);
    }
    FieldState.set = set;
})(FieldState = exports.FieldState || (exports.FieldState = {}));
var CompositeValue;
(function (CompositeValue) {
    CompositeValue.type = 'composite';
    function set(source, props) {
        return tslib_1.__assign({}, source, props);
    }
    CompositeValue.set = set;
    function isPlaceholder(subject) {
        return subject.value.length === 0;
    }
    CompositeValue.isPlaceholder = isPlaceholder;
})(CompositeValue = exports.CompositeValue || (exports.CompositeValue = {}));
var FieldValue;
(function (FieldValue) {
    FieldValue.empty = { type: EmptyValue.type };
    function isEmpty(value) {
        return value.type === EmptyValue.type;
    }
    FieldValue.isEmpty = isEmpty;
    function isAtomic(value) {
        return value.type === AtomicValue.type;
    }
    FieldValue.isAtomic = isAtomic;
    function isComposite(value) {
        return value.type === CompositeValue.type;
    }
    FieldValue.isComposite = isComposite;
    function fromLabeled(_a, errors) {
        var value = _a.value, label = _a.label;
        if (errors === void 0) { errors = FieldError.noErrors; }
        if (!value) {
            throw new Error('LabeledValue.value cannot be null or undefined');
        }
        return { type: AtomicValue.type, value: value, label: label, errors: errors };
    }
    FieldValue.fromLabeled = fromLabeled;
    function asRdfNode(value) {
        switch (value.type) {
            case EmptyValue.type: return undefined;
            case AtomicValue.type: return value.value;
            case CompositeValue.type:
                return value.subject.value.length > 0 ? value.subject : undefined;
        }
        unknownFieldType(value);
    }
    FieldValue.asRdfNode = asRdfNode;
    function getErrors(value) {
        switch (value.type) {
            case EmptyValue.type: return FieldError.noErrors;
            case AtomicValue.type: return value.errors;
            case CompositeValue.type: return value.errors;
        }
        unknownFieldType(value);
    }
    FieldValue.getErrors = getErrors;
    function setErrors(value, errors) {
        if (!errors) {
            throw new Error('Cannot set field value errors to null or undefined');
        }
        switch (value.type) {
            case AtomicValue.type: return tslib_1.__assign({}, value, { errors: errors });
            case CompositeValue.type: return tslib_1.__assign({}, value, { errors: errors });
        }
        unknownFieldType(value);
    }
    FieldValue.setErrors = setErrors;
    function unknownFieldType(value) {
        throw new Error("Unknown field value type: " + value.type);
    }
    FieldValue.unknownFieldType = unknownFieldType;
})(FieldValue = exports.FieldValue || (exports.FieldValue = {}));
