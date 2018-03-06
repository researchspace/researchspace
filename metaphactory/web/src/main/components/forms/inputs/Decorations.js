Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_bootstrap_1 = require("react-bootstrap");
var classnames = require("classnames");
var components_1 = require("platform/api/components");
var spinner_1 = require("platform/components/ui/spinner");
var FieldValues_1 = require("../FieldValues");
var VALIDATION_CLASS = 'semantic-form-validation-messages';
var ValidationMessages = (function (_super) {
    tslib_1.__extends(ValidationMessages, _super);
    function ValidationMessages() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ValidationMessages.prototype.render = function () {
        var errorClassName = VALIDATION_CLASS + "__error";
        return (React.createElement("ul", { className: VALIDATION_CLASS }, this.props.errors.map(function (err, index) { return (React.createElement("li", { key: index, className: classnames(errorClassName, errorClassName + "--" + FieldValues_1.FieldError.kindToString(err.kind)) }, err.message)); })));
    };
    return ValidationMessages;
}(components_1.Component));
exports.ValidationMessages = ValidationMessages;
var DECORATOR_CLASS = 'semantic-form-input-decorator';
var InputDecorator = (function (_super) {
    tslib_1.__extends(InputDecorator, _super);
    function InputDecorator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    InputDecorator.prototype.render = function () {
        var _a = this.props, renderHeader = _a.renderHeader, errors = _a.errors;
        var className = classnames(DECORATOR_CLASS, (_b = {},
            _b[DECORATOR_CLASS + "--with-header"] = renderHeader,
            _b));
        return (React.createElement("div", { className: className },
            renderHeader ? this.renderHeader() : null,
            this.props.children,
            React.createElement(ValidationMessages, { errors: errors })));
        var _b;
    };
    InputDecorator.prototype.renderHeader = function () {
        var _a = this.props, definition = _a.definition, dataState = _a.dataState;
        var isRequired = definition.minOccurs !== 0;
        var isReady = dataState === FieldValues_1.DataState.Ready;
        return (React.createElement("div", { className: DECORATOR_CLASS + "__header" },
            definition.label ? (React.createElement("span", { className: DECORATOR_CLASS + "__label" },
                definition.label,
                isRequired ? React.createElement("span", { className: DECORATOR_CLASS + "__label-required" }) : null)) : null,
            definition.description ? (React.createElement(react_bootstrap_1.OverlayTrigger, { trigger: ['hover', 'focus'], overlay: React.createElement(react_bootstrap_1.Popover, { id: 'tooltip' }, definition.description) },
                React.createElement("sup", { className: DECORATOR_CLASS + "__description-icon" }))) : null,
            isReady ? null : (React.createElement(spinner_1.Spinner, { className: DECORATOR_CLASS + "__spinner", spinnerDelay: 1000, messageDelay: 30000 }))));
    };
    return InputDecorator;
}(components_1.Component));
InputDecorator.defaultProps = {
    renderHeader: true,
};
exports.InputDecorator = InputDecorator;
