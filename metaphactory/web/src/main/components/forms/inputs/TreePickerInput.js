Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_bootstrap_1 = require("react-bootstrap");
var Immutable = require("immutable");
var lazy_tree_1 = require("platform/components/semantic/lazy-tree");
var FieldValues_1 = require("../FieldValues");
var MultipleValuesInput_1 = require("./MultipleValuesInput");
var NestedModalForm_1 = require("./NestedModalForm");
var CLASS_NAME = 'semantic-form-tree-picker-input';
var TreePickerInput = (function (_super) {
    tslib_1.__extends(TreePickerInput, _super);
    function TreePickerInput(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.onNestedFormSubmit = function (value) {
            _this.setState({ nestedFormOpen: false });
            var values = _this.props.values.concat(value);
            _this.onValuesChanged(values);
        };
        _this.toggleNestedForm = function () {
            _this.setState(function (state) { return ({ nestedFormOpen: !state.nestedFormOpen }); });
        };
        var config = _this.props.definition.treePatterns || { type: 'simple' };
        var treeQueries = config.type === 'full'
            ? config : lazy_tree_1.createDefaultTreeQueries(config);
        _this.state = { treeVersionKey: 0, treeQueries: treeQueries };
        return _this;
    }
    TreePickerInput.prototype.componentWillReceiveProps = function (nextProps) {
        var previousValues = this.state.treeSelectionSet;
        var nextValues = toSetOfIris(nextProps.values);
        var isValuesSame = !previousValues && nextValues.size === 0
            || previousValues && previousValues.equals(nextValues);
        if (!isValuesSame) {
            this.setState(function (state) { return ({
                treeVersionKey: state.treeVersionKey + 1,
                treeSelection: nextValues.toArray(),
                treeSelectionSet: nextValues,
            }); });
        }
    };
    TreePickerInput.prototype.render = function () {
        var _this = this;
        var nestedForm = NestedModalForm_1.tryExtractNestedForm(this.props.children);
        return (React.createElement("div", { className: CLASS_NAME },
            this.renderTreePicker(),
            nestedForm ? this.renderCreateNewButton() : null,
            this.state.nestedFormOpen ? (React.createElement(NestedModalForm_1.NestedModalForm, { definition: this.props.definition, onSubmit: this.onNestedFormSubmit, onCancel: function () { return _this.setState({ nestedFormOpen: false }); } }, nestedForm)) : null));
    };
    TreePickerInput.prototype.renderTreePicker = function () {
        var _this = this;
        var _a = this.state, treeVersionKey = _a.treeVersionKey, treeQueries = _a.treeQueries, treeSelection = _a.treeSelection;
        var rootsQuery = treeQueries.rootsQuery, childrenQuery = treeQueries.childrenQuery, parentsQuery = treeQueries.parentsQuery, searchQuery = treeQueries.searchQuery;
        var placeholder = typeof this.props.placeholder === 'string'
            ? this.props.placeholder : createDefaultPlaceholder(this.props.definition);
        return (React.createElement(lazy_tree_1.SemanticTreeInput, { key: treeVersionKey, className: CLASS_NAME + "__picker", placeholder: placeholder, rootsQuery: rootsQuery, childrenQuery: childrenQuery, parentsQuery: parentsQuery, searchQuery: searchQuery, initialSelection: treeSelection, multipleSelection: true, onSelectionChanged: function (selection) {
                var selectionLeafs = lazy_tree_1.TreeSelection.leafs(selection);
                var selectionSet = selectionLeafs.map(function (leaf) { return leaf.iri; }).toSet();
                _this.setState({
                    treeSelection: selectionSet.toArray(),
                    treeSelectionSet: selectionSet,
                    nestedFormOpen: false,
                }, function () { return _this.onTreeSelectionChanged(selectionLeafs); });
            } }));
    };
    TreePickerInput.prototype.onTreeSelectionChanged = function (leafs) {
        var values = Immutable.List(leafs.map(function (_a) {
            var iri = _a.iri, label = _a.label;
            return FieldValues_1.FieldValue.fromLabeled({
                value: iri,
                label: label ? label.value : undefined,
            });
        }));
        this.onValuesChanged(values);
    };
    TreePickerInput.prototype.onValuesChanged = function (values) {
        var _a = this.props, definition = _a.definition, updateValues = _a.updateValues;
        updateValues(function (_a) {
            var errors = _a.errors;
            var otherErrors = errors.filter(function (e) { return e.kind !== FieldValues_1.ErrorKind.Input; }).toList();
            var cardinalityErrors = MultipleValuesInput_1.checkCardinalityAndDuplicates(values, definition);
            return { values: values, errors: otherErrors.concat(cardinalityErrors) };
        });
    };
    TreePickerInput.prototype.renderCreateNewButton = function () {
        return (React.createElement(react_bootstrap_1.Button, { className: CLASS_NAME + "__create-button", bsStyle: 'default', onClick: this.toggleNestedForm },
            React.createElement("span", { className: 'fa fa-plus' }),
            ' Create new'));
    };
    return TreePickerInput;
}(MultipleValuesInput_1.MultipleValuesInput));
exports.TreePickerInput = TreePickerInput;
function toSetOfIris(values) {
    return values
        .filter(function (v) { return FieldValues_1.FieldValue.isAtomic(v) && v.value.isIri(); })
        .map(function (v) { return v.value; })
        .toSet();
}
function createDefaultPlaceholder(definition) {
    var entityLabel = (definition.label || 'entity').toLocaleLowerCase();
    return "Search or browse for values of " + entityLabel + " here...";
}
exports.default = TreePickerInput;
