Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_bootstrap_1 = require("react-bootstrap");
var rdf_1 = require("platform/api/rdf");
var inputs_1 = require("platform/components/ui/inputs");
var FieldValues_1 = require("../FieldValues");
var NestedModalForm_1 = require("./NestedModalForm");
var SingleValueInput_1 = require("./SingleValueInput");
var Decorations_1 = require("./Decorations");
var CLASS_NAME = 'autocomplete-text-field';
var MINIMUM_LIMIT = 3;
var DEFAULT_TEMPLATE = "<span title=\"{{label.value}}\">{{label.value}}</span>";
var AutocompleteInput = (function (_super) {
    tslib_1.__extends(AutocompleteInput, _super);
    function AutocompleteInput(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.tupleTemplate = null;
        _this.onNestedFormSubmit = function (value) {
            _this.setState({ nestedFormOpen: false });
            _this.setAndValidate(value);
        };
        _this.toggleNestedForm = function () {
            _this.setState(function (state) { return ({ nestedFormOpen: !state.nestedFormOpen }); });
        };
        _this.onChange = function (selected) {
            var value;
            if (selected) {
                value = FieldValues_1.FieldValue.fromLabeled({
                    value: selected.value,
                    label: selected.label.value,
                });
            }
            else {
                value = FieldValues_1.FieldValue.empty;
            }
            _this.setState({ nestedFormOpen: false });
            _this.setAndValidate(value);
        };
        _this.state = { nestedFormOpen: false };
        _this.tupleTemplate = _this.tupleTemplate || _this.compileTemplate();
        return _this;
    }
    AutocompleteInput.prototype.compileTemplate = function () {
        return this.props.template ? this.props.template.replace(/\\/g, '') : DEFAULT_TEMPLATE;
    };
    AutocompleteInput.prototype.render = function () {
        var _this = this;
        var nestedForm = NestedModalForm_1.tryExtractNestedForm(this.props.children);
        var showCreateNewButton = Boolean(nestedForm);
        return (React.createElement("div", { className: CLASS_NAME },
            this.renderSelect(showCreateNewButton),
            React.createElement(Decorations_1.ValidationMessages, { errors: FieldValues_1.FieldValue.getErrors(this.props.value) }),
            this.state.nestedFormOpen ? (React.createElement(NestedModalForm_1.NestedModalForm, { definition: this.props.definition, onSubmit: this.onNestedFormSubmit, onCancel: function () { return _this.setState({ nestedFormOpen: false }); } }, nestedForm)) : null));
    };
    AutocompleteInput.prototype.renderSelect = function (showCreateNewButton) {
        var definition = this.props.definition;
        var rdfNode = FieldValues_1.FieldValue.asRdfNode(this.props.value);
        var placeholder = typeof this.props.placeholder === 'undefined'
            ? this.createDefaultPlaceholder(definition) : this.props.placeholder;
        return (React.createElement("div", { className: CLASS_NAME + "__main-row" },
            React.createElement(inputs_1.AutoCompletionInput, { key: definition.id, className: CLASS_NAME + "__select", autofocus: false, query: this.props.definition.autosuggestionPattern, placeholder: placeholder, value: FieldValues_1.FieldValue.isAtomic(this.props.value) ? {
                    value: rdfNode,
                    label: rdf_1.Rdf.literal(this.props.value.label || rdfNode.value),
                } : undefined, templates: { suggestion: this.tupleTemplate }, actions: {
                    onSelected: this.onChange,
                }, minimumInput: MINIMUM_LIMIT }),
            showCreateNewButton ? (React.createElement(react_bootstrap_1.Button, { className: CLASS_NAME + "__create-button", bsStyle: 'default', onClick: this.toggleNestedForm },
                React.createElement("span", { className: 'fa fa-plus' }),
                ' Create new')) : null));
    };
    AutocompleteInput.prototype.createDefaultPlaceholder = function (definition) {
        return "Search and select " + (definition.label || 'entity').toLocaleLowerCase() + " here...";
    };
    return AutocompleteInput;
}(SingleValueInput_1.AtomicValueInput));
exports.AutocompleteInput = AutocompleteInput;
exports.default = AutocompleteInput;
