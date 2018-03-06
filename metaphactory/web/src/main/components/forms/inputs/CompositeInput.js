Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var Immutable = require("immutable");
var Kefir = require("kefir");
var async_1 = require("platform/api/async");
var rdf_1 = require("platform/api/rdf");
var spinner_1 = require("platform/components/ui/spinner");
var FieldDefinition_1 = require("../FieldDefinition");
var FieldValues_1 = require("../FieldValues");
var FieldMapping_1 = require("../FieldMapping");
var FormModel_1 = require("../FormModel");
var SingleValueInput_1 = require("./SingleValueInput");
var READY_INPUT_STATE = {
    dataState: FieldValues_1.DataState.Ready,
    validation: async_1.Cancellation.cancelled,
};
var VALIDATION_DEBOUNCE_DELAY = 500;
var CompositeInput = (function (_super) {
    tslib_1.__extends(CompositeInput, _super);
    function CompositeInput(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.cancellation = new async_1.Cancellation();
        _this.compositeOperations = _this.cancellation.derive();
        _this.shouldReload = true;
        _this.compositeState = FieldValues_1.DataState.Ready;
        _this.inputs = {};
        _this.inputStates = new Map();
        _this.onFieldValuesChanged = function (def, reducer) {
            _this.props.updateValue(function (previous) { return _this.setFieldValue(def, previous, reducer); });
        };
        _this.dataStateForField = function (fieldId) {
            if (_this.compositeState !== FieldValues_1.DataState.Ready) {
                return _this.compositeState;
            }
            var state = _this.inputStates.get(fieldId) || READY_INPUT_STATE;
            return state.dataState;
        };
        return _this;
    }
    CompositeInput.prototype.componentDidMount = function () {
        this.tryLoadComposite(this.props);
    };
    CompositeInput.prototype.componentWillReceiveProps = function (props) {
        if (props.value !== this.props.value) {
            this.shouldReload = true;
        }
        this.tryLoadComposite(props);
    };
    CompositeInput.prototype.componentWillUnmount = function () {
        this.cancellation.cancelAll();
    };
    CompositeInput.prototype.tryLoadComposite = function (props) {
        if (!(this.shouldReload && props.dataState === FieldValues_1.DataState.Ready)) {
            return;
        }
        var shouldLoad = !FieldValues_1.FieldValue.isComposite(props.value) || (props.value.fields.size > 0 &&
            props.value.definitions.size === 0);
        if (shouldLoad) {
            this.shouldReload = false;
            this.loadComposite(props);
        }
    };
    CompositeInput.prototype.loadComposite = function (props) {
        var _this = this;
        this.compositeOperations = this.cancellation.deriveAndCancel(this.compositeOperations);
        var allDefinitions = normalizeDefinitons(props.fields);
        var _a = FieldMapping_1.validateFieldConfiguration(allDefinitions, props.children), inputs = _a.inputs, errors = _a.errors;
        var filterUnusedFields = function (items) {
            return items.filter(function (item, fieldId) { return inputs.has(fieldId); }).toMap();
        };
        var definitions = filterUnusedFields(allDefinitions);
        var rawComposite = createRawComposite(props.value, definitions, errors);
        this.compositeState = FieldValues_1.DataState.Loading;
        this.inputStates.clear();
        props.updateValue(function () { return rawComposite; });
        this.compositeOperations.map(FormModel_1.loadDefaultsAndValueSets(rawComposite, inputs)
            .flatMap(function (v) { return Kefir.later(0, v); })).observe({
            value: function (change) {
                var loaded = change(rawComposite);
                if (FieldValues_1.FieldValue.isComposite(props.value)) {
                    loaded = mergeInitialValues(loaded, props.value);
                }
                _this.compositeState = FieldValues_1.DataState.Ready;
                _this.props.updateValue(function () { return loaded; });
            },
        });
    };
    CompositeInput.prototype.setFieldValue = function (def, oldValue, reducer) {
        if (!FieldValues_1.FieldValue.isComposite(oldValue)) {
            return;
        }
        var newValue = reduceFieldValue(def.id, oldValue, reducer);
        var input = this.inputs[def.id];
        var isInputLoading = !input || input.dataState() === FieldValues_1.DataState.Loading;
        if (isInputLoading) {
            this.inputStates.set(def.id, READY_INPUT_STATE);
        }
        else {
            this.startValidatingField(def, oldValue, newValue);
        }
        return newValue;
    };
    CompositeInput.prototype.startValidatingField = function (def, oldValue, newValue) {
        var _this = this;
        var _a = this.inputStates.get(def.id) || READY_INPUT_STATE, dataState = _a.dataState, validation = _a.validation;
        var modelChange = FormModel_1.tryBeginValidation(def, oldValue, newValue);
        dataState = modelChange ? FieldValues_1.DataState.Verifying : FieldValues_1.DataState.Ready;
        validation = this.compositeOperations.deriveAndCancel(validation);
        this.inputStates.set(def.id, { dataState: dataState, validation: validation });
        if (modelChange) {
            validation.map(Kefir.later(VALIDATION_DEBOUNCE_DELAY, {})
                .flatMap(function () { return modelChange; })).observe({
                value: function (change) {
                    var current = _this.props.value;
                    if (!FieldValues_1.FieldValue.isComposite(current)) {
                        return;
                    }
                    var validated = change(current);
                    _this.inputStates.set(def.id, READY_INPUT_STATE);
                    _this.props.updateValue(function () { return validated; });
                },
            });
        }
    };
    CompositeInput.prototype.dataState = function () {
        var _this = this;
        if (!FieldValues_1.FieldValue.isComposite(this.props.value)) {
            return FieldValues_1.DataState.Loading;
        }
        else if (this.compositeState !== FieldValues_1.DataState.Ready) {
            return this.compositeState;
        }
        var states = this.props.value.definitions.map(function (def) { return def.id; })
            .map(function (fieldId) {
            var input = _this.inputs[fieldId];
            if (!input) {
                return FieldValues_1.DataState.Loading;
            }
            var state = _this.inputStates.get(fieldId) || READY_INPUT_STATE;
            return state.dataState === FieldValues_1.DataState.Ready
                ? _this.inputs[fieldId].dataState()
                : state.dataState;
        });
        return (states.some(function (s) { return s === FieldValues_1.DataState.Loading; }) ? FieldValues_1.DataState.Loading :
            states.some(function (s) { return s === FieldValues_1.DataState.Verifying; }) ? FieldValues_1.DataState.Verifying :
                FieldValues_1.DataState.Ready);
    };
    CompositeInput.prototype.validate = function (selected) {
        var _this = this;
        if (!FieldValues_1.FieldValue.isComposite(selected)) {
            return selected;
        }
        return FieldValues_1.CompositeValue.set(selected, {
            fields: selected.fields.map(function (state, fieldId) {
                var input = _this.inputs[fieldId];
                if (!input) {
                    return state;
                }
                return FieldValues_1.FieldState.set(state, input.validate(state));
            }).toMap(),
        });
    };
    CompositeInput.prototype.finalizeSubject = function (owner, value) {
        var sourceValue = FieldValues_1.FieldValue.isComposite(value)
            ? value : createRawComposite(value);
        var ownerSubject = FieldValues_1.FieldValue.isComposite(owner) ? owner.subject : undefined;
        return FieldValues_1.CompositeValue.set(sourceValue, {
            subject: FormModel_1.generateSubjectByTemplate(this.props.newSubjectTemplate, ownerSubject, sourceValue),
        });
    };
    CompositeInput.prototype.finalize = function (owner, value) {
        var _this = this;
        var finalizedComposite = this.finalizeSubject(owner, value);
        var fields = finalizedComposite.fields.map(function (state, fieldId) {
            var input = _this.inputs[fieldId];
            var values = input
                ? input.finalize(finalizedComposite, state.values)
                : Immutable.List();
            return FieldValues_1.FieldState.set(state, { values: values, errors: FieldValues_1.FieldError.noErrors });
        }).toMap();
        return FieldValues_1.CompositeValue.set(finalizedComposite, { fields: fields });
    };
    CompositeInput.prototype.render = function () {
        var _this = this;
        var composite = this.props.value;
        if (!FieldValues_1.FieldValue.isComposite(composite)) {
            return react_1.createElement(spinner_1.Spinner);
        }
        var children = FieldMapping_1.renderFields(this.props.children, composite, this.dataStateForField, this.onFieldValuesChanged, function (inputId, input) { return _this.inputs[inputId] = input; });
        return react_1.DOM.div({ className: 'composite-input' }, children);
    };
    return CompositeInput;
}(SingleValueInput_1.SingleValueInput));
exports.CompositeInput = CompositeInput;
function normalizeDefinitons(rawFields) {
    return Immutable.Map().withMutations(function (result) {
        for (var _i = 0, rawFields_1 = rawFields; _i < rawFields_1.length; _i++) {
            var raw = rawFields_1[_i];
            if (result.has(raw.id)) {
                continue;
            }
            var parsed = FieldDefinition_1.normalizeFieldDefinition(raw);
            result.set(parsed.id, parsed);
        }
    });
}
function createRawComposite(sourceValue, definitions, errors) {
    if (definitions === void 0) { definitions = Immutable.Map(); }
    if (errors === void 0) { errors = FieldValues_1.FieldError.noErrors; }
    return {
        type: FieldValues_1.CompositeValue.type,
        subject: getSubject(sourceValue),
        definitions: definitions,
        fields: definitions.map(FormModel_1.fieldInitialState).toMap(),
        errors: errors,
    };
}
function getSubject(value) {
    if (FieldValues_1.FieldValue.isComposite(value)) {
        return value.subject;
    }
    else if (FieldValues_1.FieldValue.isAtomic(value)) {
        var node = FieldValues_1.FieldValue.asRdfNode(value);
        if (node.isIri()) {
            return node;
        }
    }
    return rdf_1.Rdf.iri('');
}
function mergeInitialValues(base, patch) {
    if (patch.fields.size === 0) {
        return base;
    }
    return FieldValues_1.CompositeValue.set(base, {
        fields: base.fields.map(function (state, fieldId) {
            return patch.fields.get(fieldId, state);
        }).toMap(),
    });
}
function reduceFieldValue(fieldId, previous, reducer) {
    var fieldState = previous.fields.get(fieldId, FieldValues_1.FieldState.empty);
    var updatedState = FieldValues_1.FieldState.set(fieldState, reducer({
        values: fieldState.values,
        errors: fieldState.errors,
    }));
    var fields = previous.fields.set(fieldId, updatedState);
    return FieldValues_1.CompositeValue.set(previous, { fields: fields });
}
exports.default = CompositeInput;
