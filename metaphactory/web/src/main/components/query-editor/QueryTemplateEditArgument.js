Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var react_bootstrap_1 = require("react-bootstrap");
var data_maybe_1 = require("data.maybe");
var Kefir = require("kefir");
var lodash_1 = require("lodash");
var rdf_1 = require("platform/api/rdf");
var forms_1 = require("platform/components/forms");
var QueryTemplateTypes_1 = require("./QueryTemplateTypes");
var QueryTemplateEditArgument = (function (_super) {
    tslib_1.__extends(QueryTemplateEditArgument, _super);
    function QueryTemplateEditArgument(props) {
        var _this = _super.call(this, props) || this;
        _this.label = Kefir.pool();
        _this.variable = Kefir.pool();
        _this.comment = Kefir.pool();
        _this.valueType = Kefir.pool();
        _this.defaultValue = Kefir.pool();
        _this.optional = Kefir.pool();
        _this.onChange = function () {
            var _a = _this.state, label = _a.label, variable = _a.variable, comment = _a.comment, valueType = _a.valueType, defaultValue = _a.defaultValue, isValid = _a.isValid, optional = _a.optional;
            var argument = {
                label: label.get().value,
                variable: variable.get().value,
                comment: comment.get().value,
                valueType: valueType.get().value,
                defaultValue: forms_1.FieldValue.asRdfNode(defaultValue) || undefined,
                optional: optional,
            };
            _this.props.onChange(argument, isValid);
        };
        _this.validateInputField = function (v) {
            if (v.length < 1) {
                return Kefir.constantError({
                    value: v,
                    error: new Error('Please fill out this field.'),
                });
            }
            return Kefir.constant({ value: v });
        };
        _this.validateLabel = function (v) {
            if (v.length < 1) {
                return Kefir.constantError({
                    value: v,
                    error: new Error('Please fill out this field.'),
                });
            }
            if (_this.props.notAvailableLabels.indexOf(v) !== -1) {
                return Kefir.constantError({
                    value: v,
                    error: new Error("Label duplicated."),
                });
            }
            return Kefir.constant({ value: v });
        };
        _this.validateVariable = function (v) {
            if (v.length < 1) {
                return Kefir.constantError({
                    value: v,
                    error: new Error('Please fill out this field.'),
                });
            }
            if (_this.props.variables.indexOf(v) === -1) {
                return Kefir.constantError({
                    value: v,
                    error: new Error("Variable '" + v + "' is not in the query."),
                });
            }
            if (_this.props.notAvailableVariables.indexOf(v) !== -1) {
                return Kefir.constantError({
                    value: v,
                    error: new Error("Variable duplicated."),
                });
            }
            return Kefir.constant({ value: v });
        };
        _this.getFormValue = function (e) {
            return Kefir.constant(e.target.value);
        };
        _this.state = {
            label: data_maybe_1.Nothing(),
            variable: data_maybe_1.Nothing(),
            comment: data_maybe_1.Nothing(),
            valueType: data_maybe_1.Nothing(),
            defaultValue: forms_1.FieldValue.empty,
            optional: false,
            isValid: false,
        };
        return _this;
    }
    QueryTemplateEditArgument.prototype.componentWillMount = function () {
        var _this = this;
        var labelMapped = this.label.flatMap(this.validateLabel);
        labelMapped.onValue(function (v) { return _this.setState({ label: data_maybe_1.Just(v) }, _this.onChange); }).onError(function (v) { return _this.setState({ label: data_maybe_1.Just(v), isValid: false }, _this.onChange); });
        var variableMapped = this.variable.flatMap(this.validateVariable);
        variableMapped.onValue(function (v) { return _this.setState({ variable: data_maybe_1.Just(v) }, _this.onChange); }).onError(function (v) { return _this.setState({ variable: data_maybe_1.Just(v), isValid: false }, _this.onChange); });
        var commentMapped = this.comment.flatMap(function (v) { return Kefir.constant({ value: v }); });
        commentMapped.onValue(function (v) { return _this.setState({ comment: data_maybe_1.Just(v) }, _this.onChange); }).onError(function (v) { return _this.setState({ comment: data_maybe_1.Just(v), isValid: false }, _this.onChange); });
        var valueTypeMapped = this.valueType.flatMap(this.validateInputField);
        valueTypeMapped.onValue(function (v) { return _this.setState({ valueType: data_maybe_1.Just(v) }, _this.onChange); }).onError(function (v) { return _this.setState({ valueType: data_maybe_1.Just(v), isValid: false }, _this.onChange); });
        var defaultValueMapped = Kefir.combine([valueTypeMapped.flatMapErrors(function (v) { return Kefir.constant(v); }), this.defaultValue], function (valueType, defaultValue) {
            if (!defaultValue) {
                return forms_1.FieldValue.empty;
            }
            else if (valueType.error) {
                return {
                    type: forms_1.AtomicValue.type,
                    value: rdf_1.Rdf.literal(defaultValue),
                    errors: forms_1.FieldError.noErrors.push({
                        kind: forms_1.ErrorKind.Input,
                        message: 'Specify value type first',
                    }),
                };
            }
            var type = rdf_1.Rdf.iri(valueType.value);
            var value = rdf_1.XsdDataTypeValidation.sameXsdDatatype(type, rdf_1.vocabularies.xsd.anyURI)
                ? rdf_1.Rdf.iri(defaultValue) : rdf_1.Rdf.literal(defaultValue, type);
            return forms_1.validateType({ value: value }, type);
        }).flatMap(function (v) { return forms_1.FieldValue.getErrors(v).size > 0 ? Kefir.constantError(v) : Kefir.constant(v); });
        defaultValueMapped.observe({
            value: function (defaultValue) { return _this.setState({ defaultValue: defaultValue }, _this.onChange); },
            error: function (defaultValue) { return _this.setState({ defaultValue: defaultValue, isValid: false }, _this.onChange); },
        });
        var optionalMapped = this.optional.flatMap(function (v) { return Kefir.constant(v); });
        optionalMapped.onValue(function (v) {
            _this.setState({ optional: v }, _this.onChange);
        }).onError(function (v) { return _this.setState({ optional: v, isValid: false }, _this.onChange); });
        Kefir.combine([
            labelMapped.map(function (v) { return v.value; }),
            variableMapped.map(function (v) { return v.value; }),
            commentMapped.map(function (v) { return v.value; }),
            valueTypeMapped.map(function (v) { return v.value; }),
            optionalMapped.map(function (v) { return v; }),
            defaultValueMapped,
        ], function (label, variable, comment, valueType, optional) {
            if (!label || !variable || !valueType) {
                return;
            }
            _this.setState({ isValid: true }, _this.onChange);
            return {};
        }).onValue(function () { });
    };
    QueryTemplateEditArgument.prototype.componentDidMount = function () {
        var argument = this.props.argument;
        this.label.plug(Kefir.constant(argument.label));
        this.variable.plug(Kefir.constant(argument.variable));
        this.comment.plug(Kefir.constant(argument.comment));
        this.valueType.plug(Kefir.constant(argument.valueType));
        this.defaultValue.plug(Kefir.constant(argument.defaultValue ? argument.defaultValue.value : ''));
        this.optional.plug(Kefir.constant(argument.optional));
    };
    QueryTemplateEditArgument.prototype.componentDidUpdate = function (prevProps) {
        if (!lodash_1.isEqual(prevProps.variables, this.props.variables)
            || !lodash_1.isEqual(prevProps.notAvailableVariables, this.props.notAvailableVariables)) {
            this.variable.plug(Kefir.constant(this.state.variable.get().value));
        }
        if (!lodash_1.isEqual(prevProps.notAvailableLabels, this.props.notAvailableLabels)) {
            this.label.plug(Kefir.constant(this.state.label.get().value));
        }
    };
    QueryTemplateEditArgument.prototype.render = function () {
        var _this = this;
        var _a = this.props, variables = _a.variables, onDelete = _a.onDelete;
        var _b = this.state, label = _b.label, variable = _b.variable, comment = _b.comment, valueType = _b.valueType, defaultValue = _b.defaultValue, optional = _b.optional;
        return React.createElement("div", { className: 'form-horizontal' },
            React.createElement(react_bootstrap_1.FormGroup, { validationState: label.isJust && label.get().error ? 'error' : undefined },
                React.createElement(react_bootstrap_1.Col, { sm: 2 },
                    React.createElement(react_bootstrap_1.ControlLabel, null, "Label")),
                React.createElement(react_bootstrap_1.Col, { sm: 10 },
                    React.createElement(react_bootstrap_1.FormControl, { type: 'text', value: label.isJust ? label.get().value : '', onChange: function (e) { return _this.label.plug(_this.getFormValue(e)); } }),
                    label.isJust && label.get().error
                        ? React.createElement(react_bootstrap_1.HelpBlock, null, label.get().error.message)
                        : null)),
            React.createElement(react_bootstrap_1.FormGroup, { validationState: variable.isJust && variable.get().error ? 'error' : undefined },
                React.createElement(react_bootstrap_1.Col, { sm: 2 },
                    React.createElement(react_bootstrap_1.ControlLabel, null, "Variable")),
                React.createElement(react_bootstrap_1.Col, { sm: 10 },
                    React.createElement(react_bootstrap_1.FormControl, { componentClass: 'select', value: variable.isJust ? variable.get().value : '', onChange: function (e) { return _this.variable.plug(_this.getFormValue(e)); } },
                        React.createElement("option", { value: '', disabled: true, style: { display: 'none' } }, "-- select variable --"),
                        variables.map(function (item, index) { return React.createElement("option", { key: index, value: item }, item); })),
                    variable.isJust && variable.get().error
                        ? React.createElement(react_bootstrap_1.HelpBlock, null, variable.get().error.message)
                        : null)),
            React.createElement(react_bootstrap_1.FormGroup, { validationState: valueType.isJust && valueType.get().error ? 'error' : undefined },
                React.createElement(react_bootstrap_1.Col, { sm: 2 },
                    React.createElement(react_bootstrap_1.ControlLabel, null, "Value Type")),
                React.createElement(react_bootstrap_1.Col, { sm: 10 },
                    React.createElement(react_bootstrap_1.FormControl, { componentClass: 'select', value: valueType.isJust ? valueType.get().value : '', onChange: function (e) { return _this.valueType.plug(_this.getFormValue(e)); } },
                        React.createElement("option", { value: '', disabled: true, style: { display: 'none' } }, "-- select value type --"),
                        QueryTemplateTypes_1.VALUE_TYPES.map(function (item) {
                            return React.createElement("option", { key: item.value, value: item.value }, item.label);
                        })),
                    valueType.isJust && valueType.get().error
                        ? React.createElement(react_bootstrap_1.HelpBlock, null, valueType.get().error.message)
                        : null)),
            React.createElement(react_bootstrap_1.FormGroup, { validationState: forms_1.FieldValue.getErrors(defaultValue).size > 0 ? 'error' : undefined },
                React.createElement(react_bootstrap_1.Col, { sm: 2 },
                    React.createElement(react_bootstrap_1.ControlLabel, null, "Default Value")),
                React.createElement(react_bootstrap_1.Col, { sm: 10 },
                    React.createElement(react_bootstrap_1.FormControl, { type: 'text', value: forms_1.FieldValue.isAtomic(defaultValue) ? defaultValue.value.value : '', onChange: function (e) { return _this.defaultValue.plug(_this.getFormValue(e)); } }),
                    forms_1.FieldValue.getErrors(defaultValue).size > 0
                        ? React.createElement(react_bootstrap_1.HelpBlock, null, forms_1.FieldValue.getErrors(defaultValue).first().message)
                        : null)),
            React.createElement(react_bootstrap_1.FormGroup, { validationState: comment.isJust && comment.get().error ? 'error' : undefined },
                React.createElement(react_bootstrap_1.Col, { sm: 2 },
                    React.createElement(react_bootstrap_1.ControlLabel, null, "Comment")),
                React.createElement(react_bootstrap_1.Col, { sm: 10 },
                    React.createElement(react_bootstrap_1.FormControl, { type: 'text', value: comment.isJust ? comment.get().value : '', onChange: function (e) { return _this.comment.plug(_this.getFormValue(e)); } }),
                    comment.isJust && comment.get().error
                        ? React.createElement(react_bootstrap_1.HelpBlock, null, comment.get().error.message)
                        : null)),
            React.createElement(react_bootstrap_1.FormGroup, null,
                React.createElement(react_bootstrap_1.Col, { sm: 2 },
                    React.createElement(react_bootstrap_1.ControlLabel, null, "Optional")),
                React.createElement(react_bootstrap_1.Col, { sm: 10 },
                    React.createElement(react_bootstrap_1.FormControl, { type: 'checkbox', style: { width: '20px' }, checked: optional, onChange: function (e) {
                            _this.optional.plug(Kefir.constant(e.target.checked));
                        } }))),
            React.createElement("div", { className: 'text-right' },
                React.createElement(react_bootstrap_1.Button, { bsStyle: 'danger', bsSize: 'xsmall', onClick: onDelete },
                    React.createElement("span", { className: 'fa fa-times' }, " Delete"))));
    };
    return QueryTemplateEditArgument;
}(react_1.Component));
exports.QueryTemplateEditArgument = QueryTemplateEditArgument;
exports.default = QueryTemplateEditArgument;
