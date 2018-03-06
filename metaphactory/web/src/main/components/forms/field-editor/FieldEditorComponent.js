Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var bem = require("bem-cn");
var ReactBootstrap = require("react-bootstrap");
var ReactSelectComponent = require("react-select");
var react_textarea_autosize_1 = require("react-textarea-autosize");
var data_maybe_1 = require("data.maybe");
var classnames = require("classnames");
var components_1 = require("platform/api/components");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var navigation_1 = require("platform/api/navigation");
var ldp_1 = require("platform/api/services/ldp");
var sparql_editor_1 = require("platform/components/sparql-editor");
var lazy_tree_1 = require("platform/components/semantic/lazy-tree");
var spinner_1 = require("platform/components/ui/spinner");
var FieldEditorRow_1 = require("./FieldEditorRow");
var FieldEditorState_1 = require("./FieldEditorState");
var TreePatternsEditor_1 = require("./TreePatternsEditor");
var Validation = require("./Validation");
require("./field-editor.scss");
var btn = react_1.createFactory(ReactBootstrap.Button);
var bsrow = react_1.createFactory(ReactBootstrap.Row);
var bscol = react_1.createFactory(ReactBootstrap.Col);
var input = react_1.createFactory(ReactBootstrap.FormControl);
var textarea = react_1.createFactory(react_textarea_autosize_1.default);
var select = react_1.createFactory(ReactSelectComponent);
var FIELD_DEF_INSTANCE_BASE = 'http://www.metaphacts.com/fieldDefinition/';
var CLASS_NAME = 'field-editor';
var block = bem(CLASS_NAME);
var DEFAULT_INSERT = 'INSERT { $subject ?predicate $value} WHERE {}';
var DEFAULT_SELECT = "SELECT ?value ?label WHERE {\n  $subject ?predicate ?value; rdfs:label ?label\n}";
var DEFAULT_DELETE = 'DELETE { $subject ?predicate $value} WHERE {}';
var DEFAULT_ASK = 'ASK {}';
var DEFAULT_VALUE_SET = "SELECT ?value ?label WHERE {\n  ?value a ?anyType ;\n    rdfs:label ?label .\n}";
var DEFAULT_AUTOSUGGESTION = "SELECT ?value ?label WHERE {\n  ?value a ?anyType ;\n    rdfs:label ?label .\n  FILTER REGEX(STR(?label), \"?token\")\n} LIMIT 10";
var FieldEditorComponent = (function (_super) {
    tslib_1.__extends(FieldEditorComponent, _super);
    function FieldEditorComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.renderEditor = function () {
            var empty = data_maybe_1.Just({ value: '' });
            var nothing = data_maybe_1.Nothing();
            return react_1.DOM.div({}, FieldEditorRow_1.default({
                label: 'Label*',
                expanded: _this.state.label.isJust,
                expandOnMount: true,
                onExpand: function () { return _this.updateValues({ label: empty }, Validation.validateLabel); },
                error: _this.state.label.map(function (v) { return v.error; }).getOrElse(undefined),
                element: input({
                    className: block('label-input').toString(),
                    type: 'text',
                    placeholder: 'Label',
                    onChange: function (e) {
                        var oldGeneratedId = _this.generateIriFromLabel(_this.state.label.map(function (v) { return v.value; }).getOrElse(''));
                        var label = getFormValue(e);
                        _this.updateValues({ label: label }, Validation.validateLabel);
                        if (_this.state.id.map(function (v) { return !v.value || v.value === oldGeneratedId; }).getOrElse(true)) {
                            var generatedId = _this.generateIriFromLabel(label.get().value);
                            _this.updateValues({ id: data_maybe_1.Just({ value: generatedId }) }, Validation.validateIri);
                        }
                    },
                    value: _this.state.label.map(function (v) { return v.value; }).getOrElse(undefined),
                }),
            }), FieldEditorRow_1.default({
                label: 'Identifier*',
                expanded: _this.state.id.isJust,
                expandOnMount: true,
                onExpand: function () { return _this.updateValues({ id: empty }, Validation.validateIri); },
                error: _this.state.id.map(function (v) { return v.error; }).getOrElse(undefined),
                element: [
                    input({
                        className: block('iri-input').toString(),
                        type: 'text',
                        placeholder: 'Any IRI to be used as unique identifier for the field definition.',
                        onChange: function (e) { return _this.updateValues({ id: getFormValue(e) }, Validation.validateIri); },
                        value: _this.state.id.isJust ? _this.state.id.get().value : undefined,
                        style: { float: 'left', width: '95%' },
                        disabled: _this.isEditMode(),
                    }),
                    _this.isEditMode() ? null : react_1.DOM.i({
                        className: block('generate-iri').toString(),
                        title: 'Generate IRI',
                        onClick: function (e) { return _this.generateIRI(); },
                    }),
                ],
            }), FieldEditorRow_1.default({
                label: 'Description',
                expanded: _this.state.description.isJust,
                onExpand: function () { return _this.updateValues({ description: empty }); },
                onCollapse: function () { return _this.updateValues({ description: nothing }); },
                element: textarea({
                    className: classnames('form-control', block('description-input').toString()),
                    rows: 4,
                    placeholder: 'Description',
                    onChange: function (e) { return _this.updateValues({ description: getFormValue(e) }); },
                    value: _this.state.description.isJust ? _this.state.description.get().value : undefined,
                }),
            }), FieldEditorRow_1.default({
                label: 'Categories',
                expanded: true,
                element: react_1.createElement(lazy_tree_1.SemanticTreeInput, tslib_1.__assign({}, _this.state.categoryQueries, { initialSelection: _this.state.categories, multipleSelection: true, onSelectionChanged: function (selection) {
                        var categories = lazy_tree_1.TreeSelection.leafs(selection).map(function (node) { return node.iri; }).toArray();
                        _this.updateState({ categories: categories });
                    } })),
            }), FieldEditorRow_1.default({
                label: 'Domain',
                expanded: _this.state.domain.isJust,
                onExpand: function () { return _this.updateValues({ domain: empty }, Validation.validateIri); },
                onCollapse: function () { return _this.updateValues({ domain: nothing }); },
                error: _this.state.domain.map(function (v) { return v.error; }).getOrElse(undefined),
                element: input({
                    className: block('domain-input').toString(),
                    type: 'text',
                    placeholder: 'Any IRI to be used as domain for the field definition.',
                    onChange: function (e) { return _this.updateValues({ domain: getFormValue(e) }, Validation.validateIri); },
                    value: _this.state.domain.map(function (v) { return v.value; }).getOrElse(''),
                }),
            }), FieldEditorRow_1.default({
                label: 'XSD Datatype',
                expanded: _this.state.xsdDatatype.isJust,
                onExpand: function () { return _this.updateValues({ xsdDatatype: empty }); },
                onCollapse: function () { return _this.updateValues({ xsdDatatype: nothing }); },
                error: _this.state.xsdDatatype.map(function (v) { return v.error; }).getOrElse(undefined),
                element: select({
                    value: _this.state.xsdDatatype.map(function (v) { return v.value; }).getOrElse(undefined),
                    className: block('xsd-input').toString(),
                    multi: false,
                    clearable: false,
                    placeholder: 'Please select any XSD datatype',
                    options: rdf_1.vocabularies.xsd.LIST_TYPES,
                    onChange: function (e) { return _this.updateValues({ xsdDatatype: data_maybe_1.Just({ value: e.value }) }); },
                    labelKey: 'label',
                    valueKey: 'value',
                }),
            }), FieldEditorRow_1.default({
                label: 'Range',
                expanded: _this.state.range.isJust,
                onExpand: function () { return _this.updateValues({ range: empty }, Validation.validateIri); },
                onCollapse: function () { return _this.updateValues({ range: nothing }); },
                error: _this.state.range.map(function (v) { return v.error; }).getOrElse(undefined),
                element: input({
                    className: block('range-input').toString(),
                    type: 'text',
                    placeholder: 'Any IRI to be used as range for the field definition.',
                    onChange: function (e) { return _this.updateValues({ range: getFormValue(e) }, Validation.validateIri); },
                    value: _this.state.range.map(function (v) { return v.value; }).getOrElse(''),
                }),
            }), FieldEditorRow_1.default({
                label: 'Min. Cardinality',
                expanded: _this.state.min.isJust,
                onExpand: function () { return _this.updateValues({ min: data_maybe_1.Just({ value: '0' }) }, Validation.validateMin); },
                onCollapse: function () { return _this.updateValues({ min: nothing }); },
                error: _this.state.min.map(function (v) { return v.error; }).getOrElse(undefined),
                element: input({
                    className: block('min-input').toString(),
                    type: 'number',
                    min: 0,
                    step: 1,
                    placeholder: 'Any positive number from 0 to n. \"0\" for not required.',
                    onChange: function (e) { return _this.updateValues({ min: getFormValue(e) }, Validation.validateMin); },
                    value: _this.state.min.map(function (v) { return v.value; }).getOrElse(undefined),
                }),
            }), FieldEditorRow_1.default({
                label: 'Max. Cardinality',
                expanded: _this.state.max.isJust,
                onExpand: function () { return _this.updateValues({ max: data_maybe_1.Just({ value: '1' }) }, Validation.validateMax); },
                onCollapse: function () { return _this.updateValues({ max: nothing }); },
                error: _this.state.max.map(function (v) { return v.error; }).getOrElse(undefined),
                element: input({
                    className: block('max-input').toString(),
                    type: 'text',
                    placeholder: 'Any positive number from 1 to n. \"unbound\" for unlimited.',
                    onChange: function (e) { return _this.updateValues({ max: getFormValue(e) }, Validation.validateMax); },
                    value: _this.state.max.map(function (v) { return v.value; }).getOrElse(undefined),
                }),
            }), FieldEditorRow_1.default({
                label: 'Default values',
                expanded: true,
                element: _this.defaultsUpToMax().map(function (defaultValue, index) { return react_1.DOM.div({ className: block('default-input-holder').toString() }, input({
                    className: block('default-input').toString(),
                    type: 'text',
                    onChange: function (e) {
                        var defaults = _this.defaultsUpToMax().slice();
                        defaults[index] = { value: e.target.value };
                        _this.updateState({ defaults: defaults });
                    },
                    value: _this.state.defaults[index].value,
                }), btn({
                    className: block('delete-default').toString(),
                    onClick: function () {
                        var defaults = _this.defaultsUpToMax().slice();
                        defaults.splice(index, 1);
                        _this.updateState({ defaults: defaults });
                    }
                }, react_1.DOM.span({ className: 'fa fa-times' }))); }).concat([
                    !(_this.isMaxSet() && _this.state.defaults.length >= parseInt(_this.state.max.get().value)) ? react_1.DOM.a({
                        onClick: function () {
                            var defaults = _this.defaultsUpToMax().concat([{ value: '' }]);
                            _this.updateState({ defaults: defaults });
                        }
                    }, '+ Add default value') : null,
                ]),
            }), FieldEditorRow_1.default({
                label: 'Test Subject',
                expanded: _this.state.testSubject.isJust,
                onExpand: function () { return _this.updateValues({ testSubject: empty }, Validation.validateIri); },
                onCollapse: function () { return _this.updateValues({ testSubject: nothing }); },
                error: _this.state.testSubject.map(function (v) { return v.error; }).getOrElse(undefined),
                element: input({
                    className: block('label-input').toString(),
                    type: 'text',
                    placeholder: "IRI of any entity to be used for testing the patterns of the field.",
                    onChange: function (e) { return _this.updateValues({ testSubject: getFormValue(e) }, Validation.validateIri); },
                    value: _this.state.testSubject.isJust ? _this.state.testSubject.get().value : undefined,
                }),
            }), FieldEditorRow_1.default({
                label: 'Insert Pattern*',
                expanded: _this.state.insertPattern.isJust,
                expandOnMount: true,
                onExpand: function () { return _this.updateValues({ insertPattern: data_maybe_1.Just({ value: DEFAULT_INSERT }) }, Validation.validateInsert); },
                error: _this.state.insertPattern.map(function (v) { return v.error; }).getOrElse(undefined),
                element: react_1.createElement(sparql_editor_1.SparqlEditor, {
                    onChange: function (e) { return _this.updateValues({ insertPattern: data_maybe_1.Just({ value: e.value }) }, Validation.validateInsert); },
                    syntaxErrorCheck: false,
                    query: _this.state.insertPattern.map(function (v) { return v.value; }).getOrElse(''),
                }),
            }), FieldEditorRow_1.default({
                label: 'Select Pattern',
                expanded: _this.state.selectPattern.isJust,
                onExpand: function () { return _this.updateValues({ selectPattern: data_maybe_1.Just({ value: DEFAULT_SELECT }) }, Validation.validateSelect); },
                onCollapse: function () { return _this.updateValues({ selectPattern: nothing }); },
                error: _this.state.selectPattern.map(function (v) { return v.error; }).getOrElse(undefined),
                element: react_1.createElement(sparql_editor_1.SparqlEditor, {
                    onChange: function (e) { return _this.updateValues({ selectPattern: data_maybe_1.Just({ value: e.value }) }, Validation.validateSelect); },
                    syntaxErrorCheck: false,
                    query: _this.state.selectPattern.map(function (v) { return v.value; }).getOrElse(''),
                }),
            }), FieldEditorRow_1.default({
                label: 'Delete Pattern',
                expanded: _this.state.deletePattern.isJust,
                onExpand: function () { return _this.updateValues({ deletePattern: data_maybe_1.Just({ value: DEFAULT_DELETE }) }, Validation.validateDelete); },
                onCollapse: function () { return _this.updateValues({ deletePattern: nothing }); },
                error: _this.state.deletePattern.map(function (v) { return v.error; }).getOrElse(undefined),
                element: react_1.createElement(sparql_editor_1.SparqlEditor, {
                    onChange: function (e) { return _this.updateValues({ deletePattern: data_maybe_1.Just({ value: e.value }) }, Validation.validateDelete); },
                    syntaxErrorCheck: false,
                    query: _this.state.deletePattern.map(function (v) { return v.value; }).getOrElse(''),
                }),
            }), FieldEditorRow_1.default({
                label: 'ASK Validation Pattern',
                expanded: _this.state.askPattern.isJust,
                onExpand: function () { return _this.updateValues({ askPattern: data_maybe_1.Just({ value: DEFAULT_ASK }) }, Validation.validateAsk); },
                onCollapse: function () { return _this.updateValues({ askPattern: nothing }); },
                error: _this.state.askPattern.map(function (v) { return v.error; }).getOrElse(undefined),
                element: react_1.createElement(sparql_editor_1.SparqlEditor, {
                    onChange: function (e) { return _this.updateValues({ askPattern: data_maybe_1.Just({ value: e.value }) }, Validation.validateAsk); },
                    syntaxErrorCheck: false,
                    query: _this.state.askPattern.map(function (v) { return v.value; }).getOrElse(''),
                }),
            }), FieldEditorRow_1.default({
                label: 'Value Set Pattern',
                expanded: _this.state.valueSetPattern.isJust,
                onExpand: function () { return _this.updateValues({ valueSetPattern: data_maybe_1.Just({ value: DEFAULT_VALUE_SET }) }, Validation.validateValueSet); },
                onCollapse: function () { return _this.updateValues({ valueSetPattern: nothing }); },
                error: _this.state.valueSetPattern.map(function (v) { return v.error; }).getOrElse(undefined),
                element: react_1.createElement(sparql_editor_1.SparqlEditor, {
                    onChange: function (e) { return _this.updateValues({ valueSetPattern: data_maybe_1.Just({ value: e.value }) }, Validation.validateValueSet); },
                    syntaxErrorCheck: false,
                    query: _this.state.valueSetPattern.map(function (v) { return v.value; }).getOrElse(''),
                }),
            }), FieldEditorRow_1.default({
                label: 'Autosuggestion Pattern',
                expanded: _this.state.autosuggestionPattern.isJust,
                onExpand: function () { return _this.updateValues({ autosuggestionPattern: data_maybe_1.Just({ value: DEFAULT_AUTOSUGGESTION }) }, Validation.validateAutosuggestion); },
                onCollapse: function () { return _this.updateValues({ autosuggestionPattern: nothing }); },
                error: _this.state.autosuggestionPattern.map(function (v) { return v.error; }).getOrElse(undefined),
                element: react_1.createElement(sparql_editor_1.SparqlEditor, {
                    onChange: function (e) { return _this.updateValues({ autosuggestionPattern: data_maybe_1.Just({ value: e.value }) }, Validation.validateAutosuggestion); },
                    syntaxErrorCheck: false,
                    query: _this.state.autosuggestionPattern.map(function (v) { return v.value; }).getOrElse(''),
                }),
            }), FieldEditorRow_1.default({
                label: 'Tree Patterns',
                expanded: _this.state.treePatterns.isJust,
                onExpand: function () { return _this.updateState({
                    treePatterns: data_maybe_1.Just({ type: 'simple' }),
                }); },
                onCollapse: function () { return _this.updateState({
                    treePatterns: data_maybe_1.Nothing(),
                }); },
                element: react_1.createElement(TreePatternsEditor_1.TreePatternsEditor, {
                    config: _this.state.treePatterns.getOrElse({ type: 'simple' }),
                    onChange: function (config) {
                        var validated = Validation.validateTreeConfig(config);
                        _this.updateState({ treePatterns: data_maybe_1.Just(validated) });
                    },
                }),
            }), bsrow({}, bscol({ md: 3 }), bscol({ md: 9 }, btn({
                type: 'submit',
                disabled: !_this.state.isValid,
                bsSize: 'small',
                onClick: _this.onSaveOrUpdate,
                style: { marginLeft: '-15px' },
            }, _this.isEditMode() ? 'Update Field' : 'Create Field'))));
        };
        _this.isEditMode = function () {
            return Boolean(_this.props.fieldIri);
        };
        _this.generateIRI = function () {
            var local = _this.state.label.isJust
                ? encodeURIComponent(_this.state.label.get().value)
                : Date.now();
            var id = _this.getFieldInstanceIriBase() + local;
            _this.updateValues({ id: data_maybe_1.Just({ value: id }) }, Validation.validateIri);
        };
        _this.getFieldInstanceIriBase = function () {
            return _this.props.fieldInstanceBaseIri
                ? _this.props.fieldInstanceBaseIri
                : FIELD_DEF_INSTANCE_BASE;
        };
        _this.onSaveOrUpdate = function (e) {
            e.stopPropagation();
            e.preventDefault();
            var finalGraph = tryCreateFinalGraph(_this.state);
            if (finalGraph.isNothing) {
                return;
            }
            var graph = finalGraph.get();
            var ldp = new ldp_1.LdpService(rdf_1.vocabularies.VocabPlatform.FieldDefinitionContainer.value);
            if (_this.isEditMode()) {
                ldp.update(rdf_1.Rdf.iri(_this.state.id.get().value), graph)
                    .onValue(function () { return window.location.reload(); });
            }
            else {
                return ldp.addResource(graph, data_maybe_1.Just(_this.state.id.get().value))
                    .flatMap(function (newResourceIri) { return navigation_1.navigateToResource(newResourceIri, {}, 'assets'); })
                    .onValue(function (v) { return v; });
            }
        };
        var categoryScheme = sparql_1.SparqlUtil.resolveIris([_this.props.categoryScheme])[0];
        var categoryQueries = lazy_tree_1.createDefaultTreeQueries({ scheme: categoryScheme });
        _this.state = {
            id: data_maybe_1.Nothing(),
            label: data_maybe_1.Nothing(),
            description: data_maybe_1.Nothing(),
            categories: [],
            domain: data_maybe_1.Nothing(),
            xsdDatatype: data_maybe_1.Nothing(),
            range: data_maybe_1.Nothing(),
            min: data_maybe_1.Nothing(),
            max: data_maybe_1.Nothing(),
            defaults: [],
            testSubject: data_maybe_1.Nothing(),
            insertPattern: data_maybe_1.Nothing(),
            selectPattern: data_maybe_1.Nothing(),
            deletePattern: data_maybe_1.Nothing(),
            askPattern: data_maybe_1.Nothing(),
            valueSetPattern: data_maybe_1.Nothing(),
            autosuggestionPattern: data_maybe_1.Nothing(),
            treePatterns: data_maybe_1.Nothing(),
            isLoading: _this.isEditMode(),
            isValid: false,
            categoryQueries: categoryQueries,
        };
        return _this;
    }
    FieldEditorComponent.prototype.componentDidMount = function () {
        var _this = this;
        if (this.isEditMode()) {
            var fieldIri = rdf_1.Rdf.iri(this.props.fieldIri);
            FieldEditorState_1.getFieldDefitionState(fieldIri).observe({
                value: function (state) { return _this.setState(state); },
            });
        }
    };
    FieldEditorComponent.prototype.render = function () {
        return react_1.DOM.div({ className: block('').toString() }, this.state.isLoading ? react_1.createElement(spinner_1.Spinner) : this.renderEditor());
    };
    FieldEditorComponent.prototype.isMaxSet = function () {
        var max = this.state.max;
        return max.isJust && parseInt(max.get().value) >= 1;
    };
    FieldEditorComponent.prototype.defaultsUpToMax = function () {
        var _a = this.state, defaults = _a.defaults, max = _a.max;
        if (!this.isMaxSet()) {
            return defaults;
        }
        var maxInt = parseInt(max.get().value);
        return defaults.slice(0, maxInt);
    };
    FieldEditorComponent.prototype.updateValues = function (values, validate) {
        var validatedValues = Object.keys(values).reduce(function (acc, key) {
            var original = values[key];
            var validated = original.map(function (v) { return validate ? validate(v.value) : { value: v.value }; });
            acc[key] = validated;
            return acc;
        }, {});
        this.updateState(validatedValues);
    };
    FieldEditorComponent.prototype.updateState = function (update) {
        var newState = tslib_1.__assign({}, this.state, { update: update });
        var errors = Validation.collectStateErrors(newState);
        this.setState(tslib_1.__assign({}, update, { isValid: errors.length === 0 }));
    };
    FieldEditorComponent.prototype.generateIriFromLabel = function (v) {
        return this.getFieldInstanceIriBase() + encodeURIComponent(v);
    };
    return FieldEditorComponent;
}(components_1.Component));
FieldEditorComponent.defaultProps = {
    categoryScheme: '<http://www.metaphacts.com/ontologies/platform/FieldCategories>',
};
function getFormValue(e) {
    var text = e.target.value;
    return data_maybe_1.Just({ value: text });
}
function tryCreateFinalGraph(state) {
    var fields = FieldEditorState_1.unwrapState(state);
    if (!fields.id || !fields.label || !fields.insertPattern) {
        return data_maybe_1.Nothing();
    }
    var graph = FieldEditorState_1.createFieldDefinitionGraph(fields);
    return data_maybe_1.Just(graph);
}
exports.component = FieldEditorComponent;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
