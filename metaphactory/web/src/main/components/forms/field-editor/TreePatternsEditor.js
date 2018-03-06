Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var sparql_editor_1 = require("platform/components/sparql-editor");
var lazy_tree_1 = require("platform/components/semantic/lazy-tree");
var FieldEditorRow_1 = require("./FieldEditorRow");
var CLASS_NAME = 'tree-patterns-editor';
var TreePatternsEditor = (function (_super) {
    tslib_1.__extends(TreePatternsEditor, _super);
    function TreePatternsEditor() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.fullConfigDefaults = lazy_tree_1.createDefaultTreeQueries();
        _this.changeConfigType = function (event) {
            var type = event.currentTarget.value;
            var newConfig;
            if (type === 'simple') {
                newConfig = { type: type };
            }
            else {
                var _a = lazy_tree_1.createDefaultTreeQueries(), rootsQuery = _a.rootsQuery, childrenQuery = _a.childrenQuery, parentsQuery = _a.parentsQuery, searchQuery = _a.searchQuery;
                newConfig = {
                    type: 'full',
                    rootsQuery: { value: rootsQuery },
                    childrenQuery: { value: childrenQuery },
                    parentsQuery: { value: parentsQuery },
                    searchQuery: { value: searchQuery },
                };
            }
            _this.props.onChange(newConfig);
        };
        return _this;
    }
    TreePatternsEditor.prototype.render = function () {
        var config = this.props.config;
        var typeSwitchClass = CLASS_NAME + "__type-switch";
        return (React.createElement("div", { className: CLASS_NAME },
            React.createElement(FieldEditorRow_1.FieldEditorRow, { label: 'type', expanded: true },
                React.createElement("label", { className: typeSwitchClass },
                    React.createElement("input", { type: 'radio', value: 'simple', checked: config.type === 'simple', onChange: this.changeConfigType }),
                    " Simple"),
                React.createElement("label", { className: typeSwitchClass },
                    React.createElement("input", { type: 'radio', value: 'full', checked: config.type === 'full', onChange: this.changeConfigType }),
                    " Full")),
            config.type === 'simple'
                ? this.renderSimpleEditor(config)
                : this.renderFullEditor(config)));
    };
    TreePatternsEditor.prototype.renderSimpleEditor = function (config) {
        var _this = this;
        return (React.createElement("div", { key: 'simple', className: CLASS_NAME + "__simple-config" },
            React.createElement(FieldEditorRow_1.FieldEditorRow, { label: 'scheme pattern', expanded: Boolean(config.schemePattern), onExpand: function () { return _this.changeConfig(config, {
                    schemePattern: { value: lazy_tree_1.DefaultLightweightPatterns.schemePattern },
                }); }, onCollapse: function () { return _this.changeConfig(config, { schemePattern: undefined }); }, error: config.schemePattern ? config.schemePattern.error : undefined },
                React.createElement(sparql_editor_1.SparqlEditor, { syntaxErrorCheck: false, query: config.schemePattern ? config.schemePattern.value : '', onChange: function (e) { return _this.changeConfig(config, { schemePattern: { value: e.value } }); } })),
            React.createElement(FieldEditorRow_1.FieldEditorRow, { label: 'relation pattern', expanded: Boolean(config.relationPattern), onExpand: function () { return _this.changeConfig(config, {
                    relationPattern: { value: lazy_tree_1.DefaultLightweightPatterns.relationPattern }
                }); }, onCollapse: function () { return _this.changeConfig(config, { relationPattern: undefined }); }, error: config.relationPattern ? config.relationPattern.error : undefined },
                React.createElement(sparql_editor_1.SparqlEditor, { syntaxErrorCheck: false, query: config.relationPattern ? config.relationPattern.value : '', onChange: function (e) { return _this.changeConfig(config, { relationPattern: { value: e.value } }); } }))));
    };
    TreePatternsEditor.prototype.renderFullEditor = function (config) {
        return (React.createElement("div", { key: 'full', className: CLASS_NAME + "__full-config" },
            this.renderFullQuery(config, 'rootsQuery', 'roots query'),
            this.renderFullQuery(config, 'childrenQuery', 'children query'),
            this.renderFullQuery(config, 'parentsQuery', 'parents query'),
            this.renderFullQuery(config, 'searchQuery', 'search query')));
    };
    TreePatternsEditor.prototype.renderFullQuery = function (config, queryKey, label) {
        var _this = this;
        var query = config[queryKey];
        var defaultValue = this.fullConfigDefaults[queryKey];
        return (React.createElement(FieldEditorRow_1.FieldEditorRow, { label: label, expanded: Boolean(query), expandOnMount: true, onExpand: function () {
                return _this.changeConfig(config, (_a = {}, _a[queryKey] = { value: defaultValue }, _a));
                var _a;
            }, error: query ? query.error : undefined },
            React.createElement(sparql_editor_1.SparqlEditor, { syntaxErrorCheck: false, query: query ? query.value : undefined, onChange: function (e) {
                    return _this.changeConfig(config, (_a = {}, _a[queryKey] = { value: e.value }, _a));
                    var _a;
                } })));
    };
    TreePatternsEditor.prototype.changeConfig = function (previous, update) {
        this.props.onChange(tslib_1.__assign({}, previous, update));
    };
    return TreePatternsEditor;
}(react_1.Component));
exports.TreePatternsEditor = TreePatternsEditor;
