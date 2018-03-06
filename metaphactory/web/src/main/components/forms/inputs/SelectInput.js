Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var ReactSelect = require("react-select");
var template_1 = require("platform/components/ui/template");
var FieldValues_1 = require("../FieldValues");
var SingleValueInput_1 = require("./SingleValueInput");
var Decorations_1 = require("./Decorations");
var SELECT_TEXT_CLASS = 'select-text-field';
var OPTION_CLASS = SELECT_TEXT_CLASS + 'option';
var SelectInput = (function (_super) {
    tslib_1.__extends(SelectInput, _super);
    function SelectInput(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.onValueChanged = function (value) {
            _this.setAndValidate(_this.parseValue(value));
        };
        _this.optionRenderer = function (option) {
            if (_this.props.template !== undefined) {
                return react_1.createElement(template_1.TemplateItem, {
                    template: {
                        source: _this.props.template,
                        options: option.binding,
                    },
                });
            }
            else {
                return react_1.DOM.span({ id: option.label, className: OPTION_CLASS }, option.label || option.value.value);
            }
        };
        _this.valueRenderer = function (v) {
            if (!v) {
                return;
            }
            var valueSet = _this.props.valueSet;
            if (valueSet) {
                var bindingValue = valueSet.find(function (setValue) { return setValue.value.equals(v.value); });
                if (bindingValue) {
                    return _this.optionRenderer(bindingValue);
                }
            }
            return react_1.DOM.span({ id: v.label, className: OPTION_CLASS }, v.label || v.value.value);
        };
        _this.onValueChanged = _this.onValueChanged;
        return _this;
    }
    SelectInput.prototype.parseValue = function (value) {
        if (!value) {
            return FieldValues_1.FieldValue.empty;
        }
        var findCorresponding = this.props.valueSet
            .find(function (v) { return v.value.equals(value.value); });
        if (!findCorresponding) {
            return FieldValues_1.FieldValue.empty;
        }
        var corresponding = {
            value: findCorresponding.value,
            label: findCorresponding.label,
        };
        return FieldValues_1.AtomicValue.set(this.props.value, corresponding);
    };
    SelectInput.prototype.render = function () {
        var definition = this.props.definition;
        var options = this.props.valueSet
            ? this.props.valueSet.toArray()
            : new Array();
        var inputValue = this.props.value;
        var selectedValue = FieldValues_1.FieldValue.isAtomic(inputValue) ? inputValue : undefined;
        var placeholder = typeof this.props.placeholder === 'undefined'
            ? this.createDefaultPlaceholder(definition) : this.props.placeholder;
        return react_1.DOM.div({ className: SELECT_TEXT_CLASS }, react_1.createElement(ReactSelect, {
            name: definition.id,
            placeholder: placeholder,
            onChange: this.onValueChanged,
            disabled: !this.canEdit,
            options: options,
            value: selectedValue,
            optionRenderer: this.optionRenderer,
            valueRenderer: this.valueRenderer,
        }), react_1.createElement(Decorations_1.ValidationMessages, { errors: FieldValues_1.FieldValue.getErrors(this.props.value) }));
    };
    SelectInput.prototype.createDefaultPlaceholder = function (definition) {
        return "Select " + (definition.label || 'entity').toLocaleLowerCase() + " here...";
    };
    return SelectInput;
}(SingleValueInput_1.AtomicValueInput));
exports.SelectInput = SelectInput;
exports.default = SelectInput;
