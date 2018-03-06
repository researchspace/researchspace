Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var components_1 = require("platform/api/components");
var Provider_1 = require("ory-editor-ui/lib/Provider");
var ToggleEdit_1 = require("ory-editor-ui/lib/DisplayModeToggle/ToggleEdit");
var ToggleLayout_1 = require("ory-editor-ui/lib/DisplayModeToggle/ToggleLayout");
var TogglePreview_1 = require("ory-editor-ui/lib/DisplayModeToggle/TogglePreview");
var ToggleResize_1 = require("ory-editor-ui/lib/DisplayModeToggle/ToggleResize");
var ModeToggle = (function (_super) {
    tslib_1.__extends(ModeToggle, _super);
    function ModeToggle() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ModeToggle.prototype.render = function () {
        return (React.createElement(Provider_1.default, { editor: this.props.editor },
            React.createElement("div", { className: 'semantic-narrative-editor__mode-toggle', style: { display: 'flex' } },
                React.createElement("div", { className: 'semantic-narrative-editor__toolbar-section' },
                    React.createElement(TogglePreview_1.default, null),
                    React.createElement("span", { className: 'semantic-narrative-editor__mode-toggle-description' }, "Preview"),
                    React.createElement("div", { className: 'semantic-narrative-editor__toolbar-divider' })),
                React.createElement("div", { className: 'semantic-narrative-editor__toolbar-section' },
                    React.createElement(ToggleEdit_1.default, null),
                    React.createElement("span", { className: 'semantic-narrative-editor__mode-toggle-description' }, "Edit"),
                    React.createElement("div", { className: 'semantic-narrative-editor__toolbar-divider' })),
                React.createElement("div", { className: 'semantic-narrative-editor__toolbar-section' },
                    React.createElement(ToggleLayout_1.default, null),
                    React.createElement("span", { className: 'semantic-narrative-editor__mode-toggle-description' }, "Move/Delete"),
                    React.createElement("div", { className: 'semantic-narrative-editor__toolbar-divider' })),
                React.createElement("div", { className: 'semantic-narrative-editor__toolbar-section' },
                    React.createElement(ToggleResize_1.default, null),
                    React.createElement("span", { className: 'semantic-narrative-editor__mode-toggle-description' }, "Resize"),
                    React.createElement("div", { className: 'semantic-narrative-editor__toolbar-divider' })))));
    };
    return ModeToggle;
}(components_1.Component));
exports.ModeToggle = ModeToggle;
