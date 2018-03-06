Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var react_bootstrap_1 = require("react-bootstrap");
var lodash_1 = require("lodash");
var react_textarea_autosize_1 = require("react-textarea-autosize");
var ReactSelectComponent = require("react-select");
var ReactSelect = react_1.createFactory(ReactSelectComponent);
var rdf_1 = require("platform/api/rdf");
var FieldValues_1 = require("../FieldValues");
var SingleValueInput_1 = require("./SingleValueInput");
var Decorations_1 = require("./Decorations");
var PlainTextInput = (function (_super) {
    tslib_1.__extends(PlainTextInput, _super);
    function PlainTextInput(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.hasFocus = false;
        _this.onTextChanged = function (event) {
            var text = event.target.value;
            var language = _this.state.language;
            _this.setState({ text: text, language: language });
            _this.setAndValidate(_this.createValue(text, language));
        };
        _this.state = _this.reformatText(props);
        _this.languages = _this.getAvailableLanguages();
        return _this;
    }
    PlainTextInput.prototype.componentWillReceiveProps = function (nextProps) {
        if (!this.hasFocus) {
            this.setState(this.reformatText(nextProps));
        }
    };
    PlainTextInput.prototype.render = function () {
        return react_1.DOM.div({ className: 'plain-text-field' }, react_1.DOM.div({ className: 'plain-text-field__inputs' }, this.renderElement(), this.renderLanguageSelect()), react_1.createElement(Decorations_1.ValidationMessages, { errors: FieldValues_1.FieldValue.getErrors(this.props.value) }));
    };
    PlainTextInput.prototype.isMultiline = function () {
        return this.props.multiline || false;
    };
    PlainTextInput.prototype.getAvailableLanguages = function () {
        var languages = [];
        if (this.props.languages) {
            languages = languages.concat(this.props.languages);
        }
        var rdfNode = FieldValues_1.FieldValue.asRdfNode(this.props.value);
        var nodeLanguage = getLanguageFromNode(rdfNode);
        if (nodeLanguage && languages.indexOf(nodeLanguage) < 0) {
            languages.push(nodeLanguage);
        }
        return languages;
    };
    PlainTextInput.prototype.reformatText = function (props) {
        var rdfNode = FieldValues_1.FieldValue.asRdfNode(props.value);
        var selectedLanguage = this.state ? this.state.language : undefined;
        return {
            text: rdfNode ? rdfNode.value : '',
            language: rdfNode ? getLanguageFromNode(rdfNode) : selectedLanguage,
        };
    };
    PlainTextInput.prototype.onLanguageChanged = function (language) {
        var text = this.state.text;
        this.setState({ text: text, language: language.key });
        if (!FieldValues_1.FieldValue.isEmpty(this.props.value)) {
            this.setAndValidate(this.createValue(text, language.key));
        }
    };
    PlainTextInput.prototype.createValue = function (text, language) {
        if (text.length === 0) {
            return FieldValues_1.FieldValue.empty;
        }
        var datatype = this.props.definition.xsdDatatype || rdf_1.vocabularies.xsd._string;
        if (!language && rdf_1.XsdDataTypeValidation.sameXsdDatatype(datatype, rdf_1.vocabularies.rdf.langString)) {
            datatype = rdf_1.vocabularies.xsd._string;
        }
        var value;
        if (language) {
            value = rdf_1.Rdf.langLiteral(text, language);
        }
        else if (rdf_1.XsdDataTypeValidation.sameXsdDatatype(datatype, rdf_1.vocabularies.xsd.anyURI)) {
            value = rdf_1.Rdf.iri(text);
        }
        else {
            value = rdf_1.Rdf.literal(text, datatype);
        }
        return FieldValues_1.AtomicValue.set(this.props.value, { value: value });
    };
    PlainTextInput.prototype.getStyle = function () {
        if (this.props.dataState === FieldValues_1.DataState.Verifying) {
            return undefined;
        }
        var value = this.props.value;
        var errors = FieldValues_1.FieldValue.getErrors(value);
        if (errors.size > 0) {
            return errors.some(FieldValues_1.FieldError.isPreventSubmit) ? 'error' : 'warning';
        }
        else if (!FieldValues_1.FieldValue.isEmpty(value)) {
            return 'success';
        }
        else {
            return undefined;
        }
    };
    PlainTextInput.prototype.renderElement = function () {
        var _this = this;
        var definition = this.props.definition;
        var rdfNode = FieldValues_1.FieldValue.asRdfNode(this.props.value);
        var placeholder = typeof this.props.placeholder === 'undefined'
            ? this.createDefaultPlaceholder(definition) : this.props.placeholder;
        if (this.isMultiline()) {
            return react_1.createElement(react_textarea_autosize_1.default, {
                className: 'plain-text-field__text',
                style: Object.assign({ width: '100%' }, this.getStyle()),
                value: this.state.text,
                placeholder: placeholder,
                onChange: this.onTextChanged,
            });
        }
        else {
            return react_1.createElement(react_bootstrap_1.FormGroup, { validationState: this.getStyle() }, react_1.createElement(react_bootstrap_1.FormControl, {
                className: 'plain-text-field__text',
                value: this.state.text,
                type: 'text',
                placeholder: placeholder,
                onChange: this.onTextChanged,
                onFocus: function () { _this.hasFocus = true; },
                onBlur: function () {
                    _this.hasFocus = false;
                    _this.setState(_this.reformatText(_this.props));
                },
                title: rdfNode ? rdfNode.toString() : undefined,
                readOnly: !this.canEdit,
            }), react_1.createElement(react_bootstrap_1.FormControl.Feedback, {}));
        }
    };
    PlainTextInput.prototype.getOptionsForLanguageSelect = function (languages) {
        var options = languages.map(function (lang) {
            return { key: lang, label: lang };
        });
        options.unshift({ key: undefined, label: 'No language' });
        return options;
    };
    PlainTextInput.prototype.renderLanguageSelect = function () {
        var _this = this;
        if (this.languages.length < 1) {
            return undefined;
        }
        var options = this.getOptionsForLanguageSelect(this.languages);
        var language = this.state.language;
        var selectedOption = lodash_1.find(options, function (option) { return option.key === language; });
        return ReactSelect({
            className: 'plain-text-field__language',
            onChange: function (lang) { return _this.onLanguageChanged(lang); },
            options: options,
            value: selectedOption,
            disabled: options.length < 1,
            clearable: false,
        });
    };
    PlainTextInput.prototype.createDefaultPlaceholder = function (definition) {
        return "Enter " + (definition.label || 'value').toLocaleLowerCase() + " here...";
    };
    return PlainTextInput;
}(SingleValueInput_1.AtomicValueInput));
exports.PlainTextInput = PlainTextInput;
function getLanguageFromNode(node) {
    if (!node || !(node instanceof rdf_1.Rdf.LangLiteral)) {
        return undefined;
    }
    var literal = node;
    return literal.lang;
}
function getTextAreaStyle(style) {
    switch (style) {
        case 'success': return { borderColor: '#43ac6a' };
        case 'warning': return { borderColor: '#e99002' };
        case 'error': return { borderColor: '#d32a0e' };
        default: return {};
    }
}
exports.default = PlainTextInput;
