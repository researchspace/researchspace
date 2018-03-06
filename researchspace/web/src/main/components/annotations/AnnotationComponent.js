Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var ReactBootstrap = require("react-bootstrap");
var maybe = require("data.maybe");
var rdf_1 = require("platform/api/rdf");
var components_1 = require("platform/api/components");
var navigation_1 = require("platform/api/navigation");
var AnnotationTextEditorComponent_1 = require("./AnnotationTextEditorComponent");
var LDPAnnotationService_1 = require("../../services/LDPAnnotationService");
var alert_1 = require("platform/components/ui/alert");
var template_1 = require("platform/components/ui/template");
require("../../scss/annotation-component.scss");
var Input = react_1.createFactory(ReactBootstrap.FormControl);
var Button = react_1.createFactory(ReactBootstrap.Button);
var ANNOTATION_EDITOR_REF = 'annotation-editor';
var AnnotationComponentClass = (function (_super) {
    tslib_1.__extends(AnnotationComponentClass, _super);
    function AnnotationComponentClass(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.onSubmit = function (e) {
            e.preventDefault();
            e.stopPropagation();
            var editor = _this.refs[ANNOTATION_EDITOR_REF];
            var conditions = [
                { condition: _this.state.label, message: 'Title should not be empty' },
                { condition: !editor.isEmpty(), message: 'Body should not be empty' },
                { condition: editor.allRdfaRelationsAreSet(), message: 'All semantic blocks should have RDFa rel attribute set' },
            ];
            var messages = [];
            for (var i = 0; i < conditions.length; ++i) {
                if (!conditions[i].condition) {
                    messages.push(conditions[i].message);
                }
            }
            if (messages.length) {
                _this.setState(function (state) {
                    state.alert = maybe.Just({ alert: alert_1.AlertType.DANGER, message: messages.join('. ') });
                    return state;
                });
                return;
            }
            var annotation = {
                target: _this.state.target.getOrElse(null),
                label: _this.state.label,
                html: editor.getValue(),
                rdfa: editor.getRdfaLinks(),
                metadata: _this.props.metadata,
            };
            if (_this.isEditMode()) {
                LDPAnnotationService_1.LdpAnnotationService.updateAnnotation(rdf_1.Rdf.iri(_this.props.annotationToEdit.replace(/<|>/g, '')), annotation).onValue(function (annotationUri) {
                    return navigation_1.refresh();
                }).onError(function (err) {
                    _this.setState(function (state) {
                        state.alert = maybe.Just({ alert: alert_1.AlertType.DANGER, message: err.response.text });
                        return state;
                    });
                });
            }
            else {
                LDPAnnotationService_1.LdpAnnotationService.addAnnotation(annotation).onValue(function (annotationUri) {
                    return _this.isNavigateToNew() ? navigation_1.navigateToResource(annotationUri).onValue(function (v) { return v; }) : navigation_1.refresh();
                }).onError(function (err) {
                    _this.setState(function (state) {
                        state.alert = maybe.Just({ alert: alert_1.AlertType.DANGER, message: err.response.text });
                        return state;
                    });
                });
            }
        };
        if (props.readOnly === true && props.annotationToEdit === undefined) {
            throw 'readOnly can be used only with annotationToEdit';
        }
        _this.state = {
            target: maybe.Nothing(),
            alert: maybe.Nothing(),
            initalizationError: maybe.Nothing(),
        };
        return _this;
    }
    AnnotationComponentClass.prototype.isEditMode = function () {
        return this.props.annotationToEdit ? true : false;
    };
    AnnotationComponentClass.prototype.isNavigateToNew = function () {
        return typeof this.props.navigateToNew === 'undefined' ? true : this.props.navigateToNew;
    };
    AnnotationComponentClass.prototype.componentDidMount = function () {
        if (!this.props.readOnly) {
            this.navigationListenerUnsubscribe =
                navigation_1.navigationConfirmation('Changes you made to Semantic Narrative will not be saved!');
        }
    };
    AnnotationComponentClass.prototype.componentWillUnmount = function () {
        if (this.navigationListenerUnsubscribe) {
            this.navigationListenerUnsubscribe();
        }
    };
    AnnotationComponentClass.prototype.componentWillMount = function () {
        var _this = this;
        if (this.props.annotationTarget && this.props.annotationToEdit) {
            this.setState(function (state) {
                state.initalizationError = maybe.Just("Wrong configuration: Only annotationTarget or\n            annotationToEdit can be set at the same time.");
                return state;
            });
        }
        else if (this.props.annotationTarget) {
            this.setState(function (state) {
                state.target = maybe.Just(rdf_1.Rdf.iri(_this.props.annotationTarget.replace(/<|>/g, '')));
                return state;
            });
        }
        else if (this.props.annotationToEdit) {
            LDPAnnotationService_1.LdpAnnotationService.getAnnotation(rdf_1.Rdf.iri(this.props.annotationToEdit.replace(/<|>/g, ''))).onValue(function (annotation) {
                _this.setState(function (state) {
                    state.target = maybe.fromNullable(annotation.target);
                    state.label = annotation.label;
                    state.initText = annotation.html;
                    return state;
                });
            });
        }
    };
    AnnotationComponentClass.prototype.render = function () {
        var _this = this;
        if (this.state.initalizationError.isJust) {
            return react_1.createElement(template_1.TemplateItem, { template: { source: this.state.initalizationError.get() } });
        }
        return react_1.DOM.div({ className: 'annotation-component' }, this.props.readOnly === true ?
            react_1.DOM.h1({}, this.state.label) :
            Input({
                className: 'annotation-component__label-field',
                type: 'text',
                ref: 'annotation-label',
                placeholder: 'Title',
                onChange: function (e) {
                    var newValue = e.target.value;
                    _this.setState(function (state) { state.label = newValue; return state; });
                },
                value: this.state.label ? this.state.label : '',
            }), AnnotationTextEditorComponent_1.factory({
            ref: ANNOTATION_EDITOR_REF,
            readOnly: this.props.readOnly === true,
            annotationIri: this.props.annotationToEdit ?
                rdf_1.Rdf.iri(this.props.annotationToEdit.replace(/<|>/g, '')) :
                null,
            initText: this.state.initText,
            rdfaRelationQueryConfig: this.props.rdfaRelationQueryConfig,
            dropTemplateConfig: this.props.dropTemplateConfig,
        }), this.props.readOnly === true ?
            null :
            react_1.DOM.div({}, react_1.createElement(alert_1.Alert, this.state.alert.map(function (config) { return config; }).getOrElse({ alert: alert_1.AlertType.NONE, message: '' })), Button({
                className: 'annotation-component__submit-button',
                bsSize: 'small',
                bsStyle: 'default',
                onClick: this.onSubmit,
            }, this.isEditMode() ? 'Update' : 'Submit')));
    };
    AnnotationComponentClass.prototype.getEditorValue = function () {
        var editor = this.refs[ANNOTATION_EDITOR_REF];
        return editor.getValue();
    };
    return AnnotationComponentClass;
}(components_1.Component));
exports.AnnotationComponentClass = AnnotationComponentClass;
exports.component = AnnotationComponentClass;
exports.factory = react_1.createFactory(AnnotationComponentClass);
exports.default = exports.component;
