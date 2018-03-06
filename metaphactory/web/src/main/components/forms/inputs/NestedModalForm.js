Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var react_bootstrap_1 = require("react-bootstrap");
var async_1 = require("platform/api/async");
var rdf_1 = require("platform/api/rdf");
var resource_label_1 = require("platform/api/services/resource-label");
var FieldValues_1 = require("../FieldValues");
var ResourceEditorForm_1 = require("../ResourceEditorForm");
var NestedModalForm = (function (_super) {
    tslib_1.__extends(NestedModalForm, _super);
    function NestedModalForm() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.cancellation = new async_1.Cancellation();
        return _this;
    }
    NestedModalForm.prototype.componentWillUnmount = function () {
        this.cancellation.cancelAll();
    };
    NestedModalForm.prototype.render = function () {
        var _this = this;
        var _a = this.props, definition = _a.definition, onSubmit = _a.onSubmit, onCancel = _a.onCancel, children = _a.children;
        var propsOverride = {
            browserPersistence: false,
            subject: rdf_1.Rdf.iri(''),
            postAction: function (subject) {
                _this.cancellation.map(resource_label_1.getLabel(subject)).observe({
                    value: function (label) {
                        onSubmit(FieldValues_1.FieldValue.fromLabeled({ value: subject, label: label }));
                    }
                });
            },
        };
        return (React.createElement(react_bootstrap_1.Modal, { bsSize: 'large', show: true, onHide: onCancel },
            React.createElement(react_bootstrap_1.Modal.Header, { closeButton: true },
                React.createElement(react_bootstrap_1.Modal.Title, null, "Create New " + (definition.label || definition.id || 'Value'))),
            React.createElement(react_bootstrap_1.Modal.Body, null, react_1.cloneElement(children, propsOverride))));
    };
    return NestedModalForm;
}(react_1.Component));
exports.NestedModalForm = NestedModalForm;
function tryExtractNestedForm(children) {
    if (react_1.Children.count(children) !== 1) {
        return undefined;
    }
    var child = react_1.Children.only(children);
    var isForm = typeof child.type === 'function' && child.type === ResourceEditorForm_1.ResourceEditorForm;
    return isForm ? child : undefined;
}
exports.tryExtractNestedForm = tryExtractNestedForm;
