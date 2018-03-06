Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var lodash_1 = require("lodash");
var react_1 = require("react");
var classnames = require("classnames");
var react_bootstrap_1 = require("react-bootstrap");
var utils_1 = require("platform/components/utils");
var FieldValues_1 = require("../FieldValues");
var SingleValueInput_1 = require("./SingleValueInput");
var MultipleValuesInput_1 = require("./MultipleValuesInput");
var CompositeInput_1 = require("./CompositeInput");
var COMPONENT_NAME = 'cardinality-support';
var SYNTHETIC_INPUT_KEY = 'synthetic';
var CardinalitySupport = (function (_super) {
    tslib_1.__extends(CardinalitySupport, _super);
    function CardinalitySupport() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.inputs = new Map();
        _this.addNewValue = function () {
            _this.onValuesChanged(function () { return _this.props.values.push(FieldValues_1.FieldValue.empty); });
        };
        _this.removeValue = function (valueIndex) {
            _this.valueKeys.splice(valueIndex, 1);
            _this.onValuesChanged(function () { return _this.props.values.remove(valueIndex); });
        };
        _this.validateThoughChildInputs = function (value) {
            if (FieldValues_1.FieldValue.isEmpty(value)) {
                return value;
            }
            var cleanValue = FieldValues_1.FieldValue.setErrors(value, FieldValues_1.FieldError.noErrors);
            return _this.getAnyInput().validate(cleanValue);
        };
        return _this;
    }
    CardinalitySupport.prototype.shouldComponentUpdate = function (nextProps, nextState) {
        if (this.state !== nextState) {
            return true;
        }
        var previous = this.props;
        return !(this.dataState() === this.lastRenderedDataState &&
            previous.renderHeader === nextProps.renderHeader &&
            previous.definition === nextProps.definition &&
            previous.dataState === nextProps.dataState &&
            previous.errors === nextProps.errors &&
            previous.valueSet === nextProps.valueSet && (previous.values === nextProps.values ||
            previous.values.size === nextProps.values.size &&
                previous.values.every(function (item, index) { return item === nextProps.values.get(index); })));
    };
    CardinalitySupport.prototype.mapChildren = function (children, value, index, synthetic) {
        var _this = this;
        var key = synthetic ? SYNTHETIC_INPUT_KEY : this.valueKeys[index];
        return react_1.Children.map(children, function (child) {
            if (utils_1.isValidChild(child)) {
                var element = child;
                if (utils_1.hasBaseDerivedRelationship(SingleValueInput_1.SingleValueInput, element.type)) {
                    var props = {
                        for: _this.props.for,
                        definition: _this.props.definition,
                        dataState: synthetic ? FieldValues_1.DataState.Loading : _this.props.dataState,
                        value: value,
                        valueSet: _this.props.valueSet,
                        updateValue: function (reducer) {
                            if (synthetic) {
                                return;
                            }
                            _this.onValuesChanged(function (values) { return values.update(index, reducer); });
                        },
                        ref: function (input) {
                            if (input) {
                                _this.inputs.set(key, input);
                            }
                            else {
                                _this.inputs.delete(key);
                            }
                        },
                    };
                    return react_1.cloneElement(element, props);
                }
                else if ('children' in element.props) {
                    return react_1.cloneElement(element, {}, utils_1.universalChildren(_this.mapChildren(element.props.children, value, index, synthetic)));
                }
            }
            return child;
        });
    };
    CardinalitySupport.prototype.render = function () {
        var definition = this.props.definition;
        if (definition.maxOccurs === 0) {
            return react_1.DOM.div({});
        }
        var dataState = this.props.dataState;
        this.lastRenderedDataState = this.dataState();
        var size = this.props.values.size;
        var canEdit = dataState === FieldValues_1.DataState.Ready || dataState === FieldValues_1.DataState.Verifying;
        var canAddValue = canEdit && size < definition.maxOccurs;
        var canRemoveValue = canEdit && size > definition.minOccurs && size > 0;
        var fieldLabel = definition.label ? definition.label.toLowerCase() : 'value';
        return react_1.DOM.div({ className: COMPONENT_NAME }, this.renderChildren(canRemoveValue), canAddValue ? (react_1.DOM.a({
            className: classnames((_a = {},
                _a[COMPONENT_NAME + "__add-value"] = true,
                _a[COMPONENT_NAME + "__add-value--first"] = size === 0,
                _a[COMPONENT_NAME + "__add-value--another"] = size > 0,
                _a)),
            onClick: this.addNewValue,
        }, "+ Add " + fieldLabel)) : null);
        var _a;
    };
    CardinalitySupport.prototype.renderChildren = function (canRemoveValue) {
        var _this = this;
        this.ensureValueKeys(this.props.values.size);
        var childIsInputGroup = isInputGroup(this.props.children);
        var className = childIsInputGroup
            ? COMPONENT_NAME + "__group-instance"
            : COMPONENT_NAME + "__single-instance";
        var usingSyntheticInput = this.props.values.size === 0;
        if (usingSyntheticInput) {
            var syntheticInput = react_1.DOM.div({
                key: SYNTHETIC_INPUT_KEY,
                className: className + " " + COMPONENT_NAME + "__synthetic-instance",
                style: { display: 'none' }
            }, utils_1.universalChildren(this.mapChildren(this.props.children, FieldValues_1.FieldValue.empty, 0, true)));
            return [syntheticInput];
        }
        return this.props.values.map(function (value, index) { return react_1.DOM.div({ key: _this.valueKeys[index], className: className }, utils_1.universalChildren(_this.mapChildren(_this.props.children, value, index, false)), canRemoveValue
            ? react_1.createElement(react_bootstrap_1.Button, {
                className: COMPONENT_NAME + '__remove-value',
                onClick: function () { return _this.removeValue(index); },
            }, react_1.DOM.span({ className: 'fa fa-times' }))
            : undefined); });
    };
    CardinalitySupport.prototype.ensureValueKeys = function (valueCount) {
        if (!this.valueKeys) {
            this.valueKeys = [];
        }
        while (this.valueKeys.length < valueCount) {
            this.valueKeys.push(lodash_1.uniqueId());
        }
    };
    CardinalitySupport.prototype.getAnyInput = function () {
        if (this.inputs.size === 0) {
            return undefined;
        }
        var anyInputKey = getFirst(this.inputs.keys());
        return this.inputs.get(anyInputKey);
    };
    CardinalitySupport.prototype.onValuesChanged = function (reducer) {
        var _this = this;
        this.props.updateValues(function (previous) {
            var newValues = reducer(previous.values);
            var validated = _this.validate({ values: newValues, errors: previous.errors }, false);
            return validated;
        });
    };
    CardinalitySupport.prototype.dataState = function () {
        var _this = this;
        var states = Array.from(this.inputs.keys(), function (key) {
            if (key === SYNTHETIC_INPUT_KEY) {
                return FieldValues_1.DataState.Ready;
            }
            return _this.inputs.get(key).dataState();
        });
        return (states.some(function (s) { return s === FieldValues_1.DataState.Loading; }) ? FieldValues_1.DataState.Loading :
            states.some(function (s) { return s === FieldValues_1.DataState.Verifying; }) ? FieldValues_1.DataState.Verifying :
                FieldValues_1.DataState.Ready);
    };
    CardinalitySupport.prototype.validate = function (_a, validateByChildInput) {
        var values = _a.values, errors = _a.errors;
        if (validateByChildInput === void 0) { validateByChildInput = true; }
        var otherErrors = errors.filter(function (e) { return e.kind !== FieldValues_1.ErrorKind.Input; }).toList();
        var cardinalityErrors = this.validateCardinality(values);
        return {
            values: validateByChildInput
                ? values.map(this.validateThoughChildInputs)
                : values,
            errors: otherErrors.concat(cardinalityErrors),
        };
    };
    CardinalitySupport.prototype.validateCardinality = function (values) {
        var anyInput = this.getAnyInput();
        var compositeInput = anyInput instanceof CompositeInput_1.CompositeInput ? anyInput : undefined;
        var preparedValues = compositeInput ? values.map(function (v) {
            return FieldValues_1.FieldValue.isComposite(v) ? compositeInput.finalizeSubject(FieldValues_1.FieldValue.empty, v) : v;
        }) : values;
        return MultipleValuesInput_1.checkCardinalityAndDuplicates(preparedValues, this.props.definition);
    };
    CardinalitySupport.prototype.finalize = function (owner, values) {
        var anyInput = this.getAnyInput();
        var finalized = values.map(function (value) { return anyInput.finalize(owner, value); });
        return finalized;
    };
    return CardinalitySupport;
}(MultipleValuesInput_1.MultipleValuesInput));
exports.CardinalitySupport = CardinalitySupport;
function isInputGroup(children) {
    var childCount = react_1.Children.count(children);
    if (childCount !== 1) {
        return childCount > 1;
    }
    var child = react_1.Children.toArray(children)[0];
    if (typeof child !== 'object' || typeof child.type === 'string') {
        return true;
    }
    return !utils_1.hasBaseDerivedRelationship(SingleValueInput_1.SingleValueInput, child.type)
        || child.type === CompositeInput_1.CompositeInput;
}
function getFirst(items) {
    var entry = items.next();
    if (entry.done) {
        throw new Error('Cannot get a first entry of an empty IterableIterator');
    }
    return entry.value;
}
exports.default = CardinalitySupport;
