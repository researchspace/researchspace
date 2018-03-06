Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var react_bootstrap_1 = require("react-bootstrap");
var react_dnd_html5_backend_1 = require("react-dnd-html5-backend");
var _ = require("lodash");
var components_1 = require("platform/api/components");
var rdf_1 = require("platform/api/rdf");
var navigation_1 = require("platform/api/navigation");
var cache_1 = require("platform/api/services/cache");
var alert_1 = require("platform/components/ui/alert");
var Spinner_1 = require("platform/components/ui/spinner/Spinner");
var LDPAnnotationService_1 = require("../../services/LDPAnnotationService");
var ory_editor_core_1 = require("ory-editor-core");
var display_1 = require("ory-editor-core/lib/actions/display");
var ory_editor_renderer_1 = require("ory-editor-renderer");
var ory_editor_ui_1 = require("ory-editor-ui");
require('react-tap-event-plugin')();
var ory_editor_plugins_slate_1 = require("ory-editor-plugins-slate");
var ory_editor_plugins_image_1 = require("ory-editor-plugins-image");
var ory_editor_plugins_video_1 = require("ory-editor-plugins-video");
var ory_editor_plugins_divider_1 = require("ory-editor-plugins-divider");
var ory_editor_plugins_spacer_1 = require("ory-editor-plugins-spacer");
require("ory-editor-core/lib/index.css");
require("ory-editor-ui/lib/index.css");
require("ory-editor-plugins-slate/lib/index.css");
require("ory-editor-plugins-parallax-background/lib/index.css");
require("ory-editor-plugins-image/lib/index.css");
var ResourcePlugin_1 = require("./ResourcePlugin");
var ModeToggle_1 = require("./ModeToggle");
var PluginToolbar_1 = require("./PluginToolbar");
require("./SemanticNarrativeEditor.scss");
var ModifiedBackend = function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var backendConstructor = react_dnd_html5_backend_1.default;
    var instance = new (backendConstructor.bind.apply(backendConstructor, [void 0].concat(args)))();
    function shouldIgnoreTarget(e) {
        var target = e.target;
        while (target instanceof Element) {
            if (target.classList.contains(ResourcePlugin_1.ResourceComponent.className)) {
                return true;
            }
            var className = target.getAttribute('class');
            if (className && className.match(/\bory-/g)) {
                return false;
            }
            target = target.parentElement;
        }
        return true;
    }
    var listeners = [
        'handleTopDragStart',
        'handleTopDragStartCapture',
        'handleTopDragEndCapture',
        'handleTopDragEnter',
        'handleTopDragEnterCapture',
        'handleTopDragLeaveCapture',
        'handleTopDragOver',
        'handleTopDragOverCapture',
        'handleTopDrop',
        'handleTopDropCapture',
    ];
    listeners.forEach(function (name) {
        var original = instance[name];
        instance[name] = function (e) {
            var extraArgs = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                extraArgs[_i - 1] = arguments[_i];
            }
            if (!shouldIgnoreTarget(e)) {
                original.apply(void 0, [e].concat(extraArgs));
            }
        };
    });
    return instance;
};
var CLASS_NAME = 'semantic-narrative-editor';
var SemanticNarrativeEditor = (function (_super) {
    tslib_1.__extends(SemanticNarrativeEditor, _super);
    function SemanticNarrativeEditor(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.onSomewhereDragStart = function () {
            _this.state.editor.store.dispatch(display_1.layoutMode());
        };
        _this.loadData = function (props) {
            var editor = window.__singletonEditor;
            if (props.annotationTarget && _this.props.iri) {
                throw "Wrong configuration: Only annotationTarget or iri can be set at the same time.";
            }
            else if (props.iri) {
                LDPAnnotationService_1.LdpAnnotationService.getAnnotation(rdf_1.Rdf.iri(props.iri.replace(/<|>/g, ''))).onValue(function (annotation) {
                    var content = ory_editor_core_1.createEmptyState();
                    try {
                        content = JSON.parse(annotation.html);
                    }
                    catch (e) {
                        throw 'Error while parsing annotation.html';
                    }
                    editor.trigger.editable.add(content);
                    _this.setState({
                        target: annotation.target,
                        label: annotation.label,
                        editor: editor,
                        state: content,
                    });
                });
            }
            else {
                var content = ory_editor_core_1.createEmptyState();
                editor.trigger.editable.add(content);
                _this.setState({
                    target: props.annotationTarget ?
                        rdf_1.Rdf.iri(props.annotationTarget.replace(/<|>/g, '')) :
                        undefined,
                    editor: editor,
                    state: content,
                });
            }
        };
        if (props.readOnly === true && props.iri === undefined) {
            throw 'readOnly can be used only with iri';
        }
        _this.state = {
            isSaving: false
        };
        _this.onSubmit = _this.onSubmit.bind(_this);
        _this.plugins = {
            content: [ory_editor_plugins_slate_1.default(), ory_editor_plugins_divider_1.default, ory_editor_plugins_spacer_1.default, ory_editor_plugins_image_1.default, ory_editor_plugins_video_1.default, ResourcePlugin_1.ResourcePlugin],
            layout: [],
            native: ResourcePlugin_1.NativeResourcePlugin,
        };
        return _this;
    }
    SemanticNarrativeEditor.prototype.getChildContext = function () {
        return tslib_1.__assign({}, _super.prototype.getChildContext.call(this), { editorProps: this.props });
    };
    SemanticNarrativeEditor.prototype.isEditMode = function () { return this.props.iri ? true : false; };
    SemanticNarrativeEditor.prototype.performPostAction = function (createdResource) {
        this.resetIsSaving();
        if (this.props.postAction === 'reload') {
            navigation_1.refresh();
        }
        else if (!this.props.postAction || this.props.postAction === 'redirect') {
            navigation_1.navigateToResource(rdf_1.Rdf.iri(createdResource), {}, 'assets').onValue(function (v) { return v; });
        }
        else {
            navigation_1.navigateToResource(rdf_1.Rdf.iri(this.props.postAction)).onValue(function (v) { return v; });
        }
    };
    SemanticNarrativeEditor.prototype.componentDidMount = function () {
        if (window.__singletonEditor === undefined) {
            window.__singletonEditor = new ory_editor_core_1.default({
                plugins: this.plugins,
                editables: [],
                defaultPlugin: ory_editor_plugins_slate_1.default(),
                dragDropBackend: ModifiedBackend,
            });
        }
        this.loadData(this.props);
        window.addEventListener('mp-dragstart', this.onSomewhereDragStart);
    };
    SemanticNarrativeEditor.prototype.componentWillReceiveProps = function (props) {
        if (!_.isEqual(props, this.props)) {
            this.loadData(props);
        }
    };
    SemanticNarrativeEditor.prototype.componentWillUnmount = function () {
        window.removeEventListener('mp-dragstart', this.onSomewhereDragStart);
    };
    SemanticNarrativeEditor.prototype.traverseState = function (item, callback) {
        if (item['cells'] !== undefined) {
            for (var _i = 0, _a = item['cells']; _i < _a.length; _i++) {
                var cell = _a[_i];
                this.traverseState(cell, callback);
            }
        }
        if (item['rows'] !== undefined) {
            for (var _b = 0, _c = item['rows']; _b < _c.length; _b++) {
                var row = _c[_b];
                this.traverseState(row, callback);
            }
        }
        if (item['content'] !== undefined && item['content']['plugin']['name'] === 'metaphactory/content/resource') {
            var predicate = item['content']['state']['relBinding'] !== undefined ?
                rdf_1.Rdf.iri(item['content']['state']['relBinding']['iri']['value']) :
                rdf_1.Rdf.iri(this.props.rdfaRelationQueryConfig.defaultValue);
            var object = rdf_1.Rdf.iri(item['content']['state']['resourceIri']['value']);
            callback({ predicate: predicate, object: object });
        }
    };
    SemanticNarrativeEditor.prototype.collectRdfa = function (state) {
        var result = [];
        this.traverseState(state, function (link) {
            result.push(link);
        });
        return result;
    };
    SemanticNarrativeEditor.prototype.resetIsSaving = function () {
        this.setState({ isSaving: false });
    };
    SemanticNarrativeEditor.prototype.onSubmit = function () {
        var _this = this;
        this.setState({ isSaving: true });
        this.startSavingTime = new Date().getTime();
        var annotation = {
            target: this.state.target,
            label: this.state.label,
            html: JSON.stringify(this.state.state),
            rdfa: this.collectRdfa(this.state.state),
            metadata: this.props.metadata,
        };
        cache_1.invalidateAllCaches();
        if (this.isEditMode()) {
            LDPAnnotationService_1.LdpAnnotationService.updateAnnotation(rdf_1.Rdf.iri(this.props.iri.replace(/<|>/g, '')), annotation).onValue(function (annotationUri) {
                setTimeout(function () {
                    _this.performPostAction(annotationUri.value);
                }, Math.max(0, 1200 - (new Date().getTime() - _this.startSavingTime)));
            }).onError(function (err) {
                _this.setState({ alert: { alert: alert_1.AlertType.DANGER, message: err.response.text } });
                _this.resetIsSaving();
            });
        }
        else {
            LDPAnnotationService_1.LdpAnnotationService.addAnnotation(annotation).onValue(function (annotationUri) {
                setTimeout(function () {
                    _this.performPostAction(annotationUri.value);
                }, Math.max(0, 1200 - (new Date().getTime() - _this.startSavingTime)));
            }).onError(function (err) {
                _this.setState({ alert: { alert: alert_1.AlertType.DANGER, message: err.response.text } });
                _this.resetIsSaving();
            });
        }
    };
    SemanticNarrativeEditor.prototype.render = function () {
        var _this = this;
        if (this.state.state === undefined || this.state.editor === undefined) {
            return React.createElement(Spinner_1.Spinner, null);
        }
        if (this.props.readOnly === true) {
            return React.createElement("div", null,
                React.createElement("h1", null, this.state.label),
                React.createElement(ory_editor_renderer_1.HTMLRenderer, { plugins: this.plugins, state: this.state.state }));
        }
        var _a = this.state, editor = _a.editor, state = _a.state, isSaving = _a.isSaving;
        return (React.createElement("div", { className: CLASS_NAME },
            React.createElement(react_bootstrap_1.FormGroup, { className: 'form-inline' },
                React.createElement(react_bootstrap_1.ControlLabel, { style: { marginRight: 12, marginTop: 10, float: 'left' } }, "Title"),
                React.createElement(react_bootstrap_1.FormControl, { type: 'text', placeholder: 'Title', value: this.state.label ? this.state.label : '', style: { width: 350 }, onChange: function (e) {
                        var newValue = e.target.value;
                        _this.setState({ label: newValue });
                    } })),
            React.createElement("div", { className: 'semantic-narrative-editor__toolbars' },
                React.createElement("div", { className: 'semantic-narrative-editor__toolbar semantic-narrative-editor__toolbar--first', "data-flex-layout": 'row' },
                    React.createElement("div", { className: 'semantic-narrative-editor__toolbar-title-holder' },
                        React.createElement("div", { className: 'semantic-narrative-editor__toolbar-title' }, "Mode")),
                    React.createElement(ModeToggle_1.ModeToggle, { editor: editor })),
                React.createElement("div", { className: 'semantic-narrative-editor__toolbar', "data-flex-layout": 'row' },
                    React.createElement("div", { className: 'semantic-narrative-editor__toolbar-title-holder' },
                        React.createElement("div", { className: 'semantic-narrative-editor__toolbar-title' }, "Add")),
                    React.createElement(PluginToolbar_1.PluginToolbar, { editor: editor }))),
            React.createElement(ory_editor_core_1.Editable, { id: state.id, editor: editor, onChange: function (s) {
                    _this.setState({ state: s });
                } }),
            React.createElement(ory_editor_ui_1.Trash, { editor: editor }),
            react_1.createElement(alert_1.Alert, this.state.alert ? this.state.alert : {
                alert: alert_1.AlertType.NONE,
                message: '',
            }),
            React.createElement(react_bootstrap_1.Button, { bsSize: 'small', bsStyle: 'success', style: { marginTop: 12 }, className: 'pull-right', onClick: this.onSubmit },
                isSaving && React.createElement("span", null,
                    "Saving... ",
                    React.createElement("i", { className: "fa fa-refresh fa-spin fa-fw" })),
                !isSaving && (this.isEditMode() ? 'Update' : 'Submit'))));
    };
    return SemanticNarrativeEditor;
}(components_1.Component));
SemanticNarrativeEditor.childContextTypes = tslib_1.__assign({}, components_1.Component.childContextTypes, { editorProps: react_1.PropTypes.any });
exports.SemanticNarrativeEditor = SemanticNarrativeEditor;
exports.default = SemanticNarrativeEditor;
