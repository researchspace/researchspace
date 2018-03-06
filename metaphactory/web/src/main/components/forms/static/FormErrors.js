Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var classnames = require("classnames");
var FieldValues_1 = require("../FieldValues");
var StaticComponent_1 = require("./StaticComponent");
var CLASSNAME = 'semantic-form-errors';
var ERROR_CLASSNAME = CLASSNAME + "__error";
var FormErrors = (function (_super) {
    tslib_1.__extends(FormErrors, _super);
    function FormErrors() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    FormErrors.prototype.render = function () {
        return react_1.DOM.ul({
            className: classnames(CLASSNAME, this.props.className),
            style: this.props.style,
        }, FieldValues_1.FieldValue.isComposite(this.props.model) ? this.renderErrors(this.props.model) : null);
    };
    FormErrors.prototype.renderErrors = function (model) {
        var errors = [];
        collectErrors([], model, errors);
        return errors.map(function (e, index) { return react_1.DOM.li({
            className: classnames(ERROR_CLASSNAME, ERROR_CLASSNAME + "--" + FieldValues_1.FieldError.kindToString(e.kind)),
            key: index,
        }, react_1.DOM.span({ className: CLASSNAME + "__error-source" }, e.path.join(' - ')), react_1.DOM.span({ className: CLASSNAME + "__error-message" }, e.message)); });
    };
    return FormErrors;
}(StaticComponent_1.StaticComponent));
exports.FormErrors = FormErrors;
function collectErrors(parentPath, composite, collectedErrors) {
    var formPath = parentPath.concat(['Form']);
    composite.errors.forEach(function (_a) {
        var kind = _a.kind, message = _a.message;
        collectedErrors.push({ path: formPath, kind: kind, message: message });
    });
    composite.fields.forEach(function (state, fieldId) {
        var definition = composite.definitions.get(fieldId);
        var source = definition && definition.label || fieldId;
        var path = parentPath.concat([source]);
        state.errors.forEach(function (_a) {
            var kind = _a.kind, message = _a.message;
            collectedErrors.push({ path: path, kind: kind, message: message });
        });
        state.values.forEach(function (value) {
            FieldValues_1.FieldValue.getErrors(value).forEach(function (_a) {
                var kind = _a.kind, message = _a.message;
                collectedErrors.push({ path: path, kind: kind, message: message });
            });
            if (FieldValues_1.FieldValue.isComposite(value)) {
                collectErrors(path, value, collectedErrors);
            }
        });
    });
}
exports.component = FormErrors;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
