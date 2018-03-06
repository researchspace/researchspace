Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var Immutable = require("immutable");
var async_1 = require("platform/api/async");
var notification_1 = require("platform/components/ui/notification");
var spinner_1 = require("platform/components/ui/spinner");
var FieldValues_1 = require("./FieldValues");
var inputs_1 = require("./inputs");
var FormErrors_1 = require("./static/FormErrors");
require("./forms.scss");
var LoadingState;
(function (LoadingState) {
    LoadingState[LoadingState["None"] = 0] = "None";
    LoadingState[LoadingState["Loading"] = 1] = "Loading";
    LoadingState[LoadingState["Completed"] = 2] = "Completed";
})(LoadingState || (LoadingState = {}));
var SemanticForm = (function (_super) {
    tslib_1.__extends(SemanticForm, _super);
    function SemanticForm() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.cancellation = new async_1.Cancellation();
        _this.loadingState = LoadingState.None;
        _this.updateModel = function (reducer) {
            _this.pendingModel = reducer(_this.pendingModel);
            if (!FieldValues_1.FieldValue.isComposite(_this.pendingModel)) {
                throw new Error('CompositeValue.updateValue returned non-composite');
            }
            _this.props.onChanged(_this.pendingModel);
        };
        _this.onCompositeMounted = function (input) {
            _this.input = input;
        };
        return _this;
    }
    SemanticForm.prototype.componentDidMount = function () {
        this.pendingModel = this.props.model;
    };
    SemanticForm.prototype.componentWillReceiveProps = function (nextProps) {
        if (nextProps.model !== this.props.model) {
            this.pendingModel = nextProps.model;
        }
    };
    SemanticForm.prototype.componentWillUnmount = function () {
        this.cancellation.cancelAll();
    };
    SemanticForm.prototype.componentDidUpdate = function (prevProps) {
        var dataState = this.input ? this.input.dataState() : FieldValues_1.DataState.Loading;
        var modelOrDataStateChanged = !(this.props.model === prevProps.model &&
            this.lastDataState === dataState);
        this.lastDataState = dataState;
        if (modelOrDataStateChanged) {
            if (this.props.onUpdated) {
                this.props.onUpdated(dataState);
            }
            if (this.props.debug) {
                console.log("[" + LoadingState[this.loadingState] + "] " + FieldValues_1.DataState[dataState], asDebugJSObject(this.props.model));
            }
            if (this.loadingState === LoadingState.None && dataState === FieldValues_1.DataState.Loading) {
                this.loadingState = LoadingState.Loading;
                if (this.props.debug) {
                    console.log("[-> " + LoadingState[this.loadingState] + "]");
                }
            }
            else if (this.loadingState === LoadingState.Loading &&
                dataState === FieldValues_1.DataState.Ready &&
                FieldValues_1.FieldValue.isComposite(this.props.model)) {
                this.loadingState = LoadingState.Completed;
                if (this.props.debug) {
                    console.log("[-> " + LoadingState[this.loadingState] + "]");
                }
                this.props.onLoaded(this.props.model);
            }
        }
    };
    SemanticForm.prototype.validate = function (model) {
        var validated = this.input.validate(model);
        if (!FieldValues_1.FieldValue.isComposite(validated)) {
            throw new Error('Expected to return either composite or empty value from CompositeInput.validate');
        }
        return validated;
    };
    SemanticForm.prototype.finalize = function (model) {
        return this.input.finalize(FieldValues_1.FieldValue.empty, model);
    };
    SemanticForm.prototype.render = function () {
        if (FieldValues_1.FieldValue.isEmpty(this.props.model)) {
            return react_1.createElement(spinner_1.Spinner);
        }
        var hasConfigurationErrors = this.props.model.errors
            .some(function (e) { return e.kind === FieldValues_1.ErrorKind.Configuration; });
        return react_1.DOM.div({ className: 'semantic-form' }, react_1.createElement(inputs_1.CompositeInput, {
            ref: this.onCompositeMounted,
            fields: this.props.fields || [],
            newSubjectTemplate: this.props.newSubjectTemplate,
            dataState: FieldValues_1.DataState.Ready,
            value: this.props.model,
            updateValue: this.updateModel,
        }, hasConfigurationErrors
            ? react_1.createElement(notification_1.ErrorNotification, { title: 'Errors in form configuration' }, react_1.createElement(FormErrors_1.FormErrors, { model: this.props.model }))
            : this.props.children), (this.props.debug
            ? react_1.DOM.pre({}, JSON.stringify(asDebugJSObject(this.props.model), null, 2))
            : null));
    };
    return SemanticForm;
}(react_1.Component));
exports.SemanticForm = SemanticForm;
function asDebugJSObject(value) {
    switch (value.type) {
        case FieldValues_1.EmptyValue.type: return { type: FieldValues_1.EmptyValue.type };
        case FieldValues_1.AtomicValue.type: return {
            type: FieldValues_1.AtomicValue.type,
            value: value.value.toString(),
            label: value.label,
            errors: value.errors.toArray(),
        };
        case FieldValues_1.CompositeValue.type: return {
            type: FieldValues_1.CompositeValue.type,
            subject: value.subject.toString(),
            fields: value.fields.map(function (state) { return ({
                values: state.values.map(asDebugJSObject).toArray(),
                valueSet: state.valueSet ? state.valueSet.map(function (b) { return ({
                    value: b.value.toString(),
                    label: b.label,
                    binding: Immutable.Map(b.binding).map(function (v) { return v.toString(); }).toObject(),
                }); }).toArray() : undefined,
                errors: state.errors.toArray(),
            }); }).toObject(),
        };
    }
}
exports.default = react_1.createFactory(SemanticForm);
