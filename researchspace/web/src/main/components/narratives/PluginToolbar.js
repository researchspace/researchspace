Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var reselect_1 = require("reselect");
var react_redux_1 = require("react-redux");
var components_1 = require("platform/api/components");
var display_1 = require("ory-editor-core/lib/selector/display");
var Provider_1 = require("ory-editor-ui/lib/Provider");
var OryToolbarItem_1 = require("./OryToolbarItem");
var RawPluginToolbar = (function (_super) {
    tslib_1.__extends(RawPluginToolbar, _super);
    function RawPluginToolbar() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    RawPluginToolbar.prototype.render = function () {
        var editor = this.props.editor;
        var plugins = editor.plugins.plugins;
        return (React.createElement("div", { className: 'semantic-narrative-editor__mode-toggle', style: { display: 'flex' } },
            plugins.content.map(function (plugin) { return (React.createElement("div", { className: 'semantic-narrative-editor__toolbar-section' },
                React.createElement(OryToolbarItem_1.Item, { key: plugin.name, plugin: plugin, insert: {
                        content: { plugin: plugin, state: plugin.createInitialState() }
                    } }),
                (plugin.IconComponent && plugin.text
                    && OryToolbarItem_1.VisualisePluginBlacklist.indexOf(plugin.name) === -1)
                    && React.createElement("div", { className: 'semantic-narrative-editor__toolbar-divider' }))); }),
            plugins.layout.map(function (plugin) { return (React.createElement("div", { className: 'semantic-narrative-editor__toolbar-section' },
                React.createElement(OryToolbarItem_1.Item, { key: plugin.name, plugin: plugin, insert: tslib_1.__assign({}, plugin.createInitialChildren(), { layout: { plugin: plugin, state: plugin.createInitialState() } }) }),
                (plugin.IconComponent && plugin.text
                    && OryToolbarItem_1.VisualisePluginBlacklist.indexOf(plugin.name) === -1)
                    && React.createElement("div", { className: 'semantic-narrative-editor__toolbar-divider' }))); })));
    };
    return RawPluginToolbar;
}(components_1.Component));
var mapStateToProps = reselect_1.createStructuredSelector({ isInsertMode: display_1.isInsertMode });
var ConnectedPluginToolbar = react_redux_1.connect(mapStateToProps)(RawPluginToolbar);
var PluginToolbar = (function (_super) {
    tslib_1.__extends(PluginToolbar, _super);
    function PluginToolbar() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PluginToolbar.prototype.render = function () {
        var editor = this.props.editor;
        return (React.createElement(Provider_1.default, { editor: editor },
            React.createElement(ConnectedPluginToolbar, { editor: editor })));
    };
    return PluginToolbar;
}(components_1.Component));
exports.PluginToolbar = PluginToolbar;
