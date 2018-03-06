Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var rdf_1 = require("platform/api/rdf");
var navigation_1 = require("platform/api/navigation");
var utils_1 = require("platform/components/utils");
var FieldValues_1 = require("./FieldValues");
var FormModel_1 = require("./FormModel");
var SemanticForm_1 = require("./SemanticForm");
var Serialization_1 = require("./Serialization");
var RawSparqlPersistence_1 = require("./persistence/RawSparqlPersistence");
var LdpPersistence_1 = require("./persistence/LdpPersistence");
var SparqlPersistence_1 = require("./persistence/SparqlPersistence");
var RecoverNotification_1 = require("./static/RecoverNotification");
var BROWSER_PERSISTENCE = utils_1.BrowserPersistence.adapter();
var ResourceEditorForm = (function (_super) {
    tslib_1.__extends(ResourceEditorForm, _super);
    function ResourceEditorForm(props) {
        var _this = _super.call(this, props) || this;
        _this.mapChildren = function (children) {
            return react_1.Children.map(children, function (element) {
                if (!utils_1.isValidChild(element)) {
                    return element;
                }
                if (element.type === ResourceEditorForm) {
                    return element;
                }
                if (element.type === 'button') {
                    switch (element.props.name) {
                        case 'reset': return react_1.cloneElement(element, {
                            disabled: !_this.initialState || _this.state.submitting,
                            onClick: _this.onReset,
                        });
                        case 'submit': return react_1.cloneElement(element, {
                            disabled: !_this.canSubmit(),
                            onClick: _this.onSubmit,
                        });
                    }
                    return element;
                }
                if (element.type === RecoverNotification_1.RecoverNotification) {
                    return react_1.cloneElement(element, {
                        recoveredFromStorage: _this.state.recoveredFromStorage,
                        discardRecoveredData: function () { return _this.resetFormData(); },
                    });
                }
                if ('children' in element.props) {
                    return react_1.cloneElement(element, {}, utils_1.universalChildren(_this.mapChildren(element.props.children)));
                }
                return element;
            });
        };
        _this.onReset = function (e) {
            e.preventDefault();
            e.stopPropagation();
            _this.resetFormData();
        };
        _this.onSubmit = function (e) {
            e.preventDefault();
            e.stopPropagation();
            var validatedModel = _this.form.validate(_this.state.model);
            if (FormModel_1.readyToSubmit(validatedModel, FieldValues_1.FieldError.isPreventSubmit)) {
                _this.setState(function (state) { return ({ model: validatedModel, submitting: true }); });
                var initialModel = _this.initialState.model;
                var finalModel_1 = _this.form.finalize(_this.state.model);
                _this.persistence.persist(initialModel, finalModel_1).observe({
                    value: function () {
                        _this.resetStorage();
                        _this.performPostAction(finalModel_1.subject);
                    },
                    error: function (err) { return console.error(err); },
                });
            }
            else {
                _this.setState(function (state) { return ({ model: validatedModel, submitting: false }); });
            }
        };
        _this.saveToStorage = function (model) {
            if (_this.browserPersistenceEnabled() && _this.initialState) {
                var patch = Serialization_1.computeValuePatch(_this.initialState.model, model);
                BROWSER_PERSISTENCE.set(_this.computePersistentId(), patch);
            }
        };
        _this.loadFromStorage = function () {
            if (_this.browserPersistenceEnabled()) {
                try {
                    return BROWSER_PERSISTENCE.get(_this.computePersistentId());
                }
                catch (err) {
                    console.warn(err);
                }
            }
            return null;
        };
        _this.resetStorage = function () {
            if (_this.browserPersistenceEnabled()) {
                BROWSER_PERSISTENCE.remove(_this.computePersistentId());
            }
        };
        _this.browserPersistenceEnabled = function () {
            return Boolean(_this.props.browserPersistence);
        };
        _this.getFormId = function () {
            return _this.props.formId ? _this.props.formId : navigation_1.getCurrentResource().value;
        };
        _this.performPostAction = function (subject) {
            if (_this.props.postAction === 'none') {
                return;
            }
            if (!_this.props.postAction || _this.props.postAction === 'reload') {
                navigation_1.refresh();
            }
            else if (_this.props.postAction === 'redirect') {
                navigation_1.navigateToResource(subject, getPostActionUrlQueryParams(_this.props)).onValue(function (v) { return v; });
            }
            else if (typeof _this.props.postAction === 'function') {
                _this.props.postAction(subject);
            }
            else {
                navigation_1.navigateToResource(rdf_1.Rdf.iri(_this.props.postAction), getPostActionUrlQueryParams(_this.props)).onValue(function (v) { return v; });
            }
        };
        _this.persistence = normalizePersistenceMode(_this.props.persistence);
        _this.state = {
            model: undefined,
            submitting: false,
        };
        return _this;
    }
    ResourceEditorForm.prototype.render = function () {
        var _this = this;
        var formProps = {
            ref: function (form) { _this.form = form; },
            fields: this.props.fields,
            model: this.state.model || FieldValues_1.FieldValue.fromLabeled({ value: getSubject(this.props) }),
            newSubjectTemplate: this.props.newSubjectTemplate,
            onLoaded: function (loadedModel) {
                var initialized = _this.props.initializeModel
                    ? _this.props.initializeModel(loadedModel) : loadedModel;
                _this.initialState = {
                    model: initialized,
                    submitting: false,
                    recoveredFromStorage: false,
                };
                var _a = _this.applyCachedData(_this.initialState.model), model = _a.model, recoveredFromStorage = _a.recoveredFromStorage;
                _this.setState({ model: model, recoveredFromStorage: recoveredFromStorage, submitting: false });
            },
            onChanged: function (model) {
                _this.setState({ model: model });
            },
            onUpdated: function (modelState) {
                _this.setState({ modelState: modelState });
                if (_this.initialState && modelState === FieldValues_1.DataState.Ready) {
                    _this.saveToStorage(_this.state.model);
                }
            },
            debug: this.props.debug,
        };
        return react_1.createElement(SemanticForm_1.SemanticForm, formProps, this.mapChildren(this.props.children));
    };
    ResourceEditorForm.prototype.applyCachedData = function (model) {
        var patch = this.loadFromStorage();
        var patched = Serialization_1.applyValuePatch(model, patch);
        if (patched === model || !FieldValues_1.FieldValue.isComposite(patched)) {
            return { model: model, recoveredFromStorage: false };
        }
        else {
            return { model: patched, recoveredFromStorage: true };
        }
    };
    ResourceEditorForm.prototype.canSubmit = function () {
        return this.initialState &&
            !this.state.submitting &&
            this.state.modelState === FieldValues_1.DataState.Ready &&
            FormModel_1.readyToSubmit(this.state.model, FieldValues_1.FieldError.isPreventSubmit);
    };
    ResourceEditorForm.prototype.resetFormData = function () {
        var state = this.initialState;
        if (this.props.initializeModel) {
            state = {
                model: this.props.initializeModel(state.model),
                submitting: false,
                recoveredFromStorage: false,
            };
        }
        this.resetStorage();
        this.setState(state);
    };
    ResourceEditorForm.prototype.computePersistentId = function () {
        return this.getFormId() + ':' + navigation_1.getCurrentResource().value;
    };
    return ResourceEditorForm;
}(react_1.Component));
exports.ResourceEditorForm = ResourceEditorForm;
function normalizePersistenceMode(persistenceProp) {
    var persistence = persistenceProp;
    if (typeof persistence === 'string') {
        persistence = getPersistenceMode(persistence);
    }
    return persistence || LdpPersistence_1.default;
}
function getPersistenceMode(persistenceMode) {
    switch (persistenceMode) {
        case 'client-side-sparql': return RawSparqlPersistence_1.default;
        case 'ldp': return LdpPersistence_1.default;
        case 'sparql': return SparqlPersistence_1.default;
    }
    return undefined;
}
function getSubject(props) {
    var subjectIri = props.subject;
    if (typeof subjectIri === 'string') {
        subjectIri = rdf_1.Rdf.iri(subjectIri);
    }
    return subjectIri || rdf_1.Rdf.iri('');
}
var POST_ACTION_QUERY_PARAM_PREFIX = 'urlqueryparam';
function getPostActionUrlQueryParams(props) {
    var params = {};
    for (var key in props) {
        if (Object.hasOwnProperty.call(props, key)) {
            if (key.indexOf(POST_ACTION_QUERY_PARAM_PREFIX) === 0) {
                var queryKey = key.substring(POST_ACTION_QUERY_PARAM_PREFIX.length).toLowerCase();
                params[queryKey] = props[key];
            }
        }
    }
    return params;
}
exports.default = ResourceEditorForm;
