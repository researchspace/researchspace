Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var _ = require("lodash");
require("codemirror/lib/codemirror.css");
require("codemirror/mode/htmlmixed/htmlmixed");
require("codemirror/addon/mode/simple");
require("codemirror/addon/mode/multiplex");
require("codemirror/mode/handlebars/handlebars");
require("codemirror/mode/xml/xml");
require("./codemirror/mph-handlebars.js");
require("codemirror/addon/fold/foldgutter");
require("codemirror/addon/fold/foldgutter.css");
require("codemirror/addon/fold/foldcode");
require("codemirror/addon/fold/brace-fold");
require("codemirror/addon/fold/indent-fold");
require("codemirror/addon/fold/xml-fold");
require("codemirror/addon/edit/matchtags");
require("codemirror/addon/edit/matchbrackets");
var react_1 = require("react");
var react_radio_group_1 = require("react-radio-group");
var ReactBootstrap = require("react-bootstrap");
var ReactCodeMirror = require("react-codemirror");
var navigation_1 = require("platform/api/navigation");
var rdf_1 = require("platform/api/rdf");
var PageService = require("platform/api/services/page");
var utils_1 = require("platform/components/utils");
var components_1 = require("platform/api/navigation/components");
var overlay_1 = require("platform/components/ui/overlay");
require("../../scss/page-editor.scss");
var CodeMirror = react_1.createFactory(ReactCodeMirror);
var Button = react_1.createFactory(ReactBootstrap.Button);
var Grid = react_1.createFactory(ReactBootstrap.Grid);
var Row = react_1.createFactory(ReactBootstrap.Row);
var Col = react_1.createFactory(ReactBootstrap.Col);
var ButtonToolbar = react_1.createFactory(ReactBootstrap.ButtonToolbar);
var ButtonGroup = react_1.createFactory(ReactBootstrap.ButtonGroup);
var Syntax;
(function (Syntax) {
    Syntax[Syntax["HTMLMIXED"] = 0] = "HTMLMIXED";
    Syntax[Syntax["MPHHANDLEBARS"] = 1] = "MPHHANDLEBARS";
    Syntax[Syntax["HANDLEBARS"] = 2] = "HANDLEBARS";
    Syntax[Syntax["NONE"] = 3] = "NONE";
})(Syntax || (Syntax = {}));
var PLATFORM_TEMPLATE_EDITOR = 'mp-internal-page-editor';
var LocalStorageState = utils_1.BrowserPersistence.adapter();
var PageEditorComponent = (function (_super) {
    tslib_1.__extends(PageEditorComponent, _super);
    function PageEditorComponent() {
        var _this = _super.call(this) || this;
        _this.loadPageSource = function (uri) {
            _this.setState({ loading: true });
            PageService.PageService.loadTemplateSource(uri).onValue(function (rawContent) {
                return _this.setState({ pageSource: rawContent, saving: false, loading: false }, function () {
                    _this.refs['editor'].focus();
                });
            }).onError(function (errorCode) { return errorCode === 403 ? window.location.href = '/login' : null; });
        };
        _this.onPageContentChange = function (content) {
            if (!_this.navigationListenerUnsubscribe) {
                _this.navigationListenerUnsubscribe =
                    navigation_1.navigationConfirmation('Changes you made to the page will not be saved.');
            }
            _this.setState(function (state) {
                state.pageSource.source = content;
                state.saving = false;
                return state;
            });
        };
        _this.onSave = function () {
            if (_this.navigationListenerUnsubscribe) {
                _this.navigationListenerUnsubscribe();
            }
            _this.setState({ pageSource: _this.state.pageSource, saving: true });
            PageService.PageService.save(_this.props.iri.value, _this.state.pageSource.source, _this.state.pageSource.sourceHash).onValue(function (v) {
                _this.setState({ pageSource: _this.state.pageSource, saving: false });
                navigation_1.navigateToResource(_this.props.iri).onValue(function (x) { return x; });
            }).onError(function (error) {
                var dialogRef = "page-saving-error";
                overlay_1.getOverlaySystem().show(dialogRef, react_1.createElement(overlay_1.OverlayDialog, {
                    onHide: function () {
                        overlay_1.getOverlaySystem().hide(dialogRef);
                        _this.setState({ saving: false });
                    },
                    type: 'modal',
                    title: 'Error while saving the page',
                    show: true,
                }, react_1.DOM.div({}), [
                    react_1.DOM.div({}, error),
                    Button({
                        bsStyle: 'success',
                        className: 'pull-right',
                        onClick: function () {
                            overlay_1.getOverlaySystem().hide(dialogRef);
                            _this.setState({ saving: false });
                        }
                    }, 'Ok')
                ]));
            });
        };
        _this.onCancel = function () {
            navigation_1.navigateToResource(_this.props.iri).onValue(function (x) { return x; });
        };
        _this.getSyntaxChoices = function () {
            return react_1.createElement(react_radio_group_1.RadioGroup, {
                name: 'syntaxType',
                selectedValue: _this.state.activeSyntax,
                onChange: _this.onSyntaxChange,
            }, react_1.DOM.div({ className: 'template-types' }, 'Syntax highlight: ', _.reduce(_this.radioGroupEntries, function (result, e) {
                result.push(react_1.DOM.label({
                    key: e.label,
                    style: { marginRight: '10px' },
                }, react_1.createElement(react_radio_group_1.Radio, { value: e.type, title: e.label }), e.label));
                return result;
            }, new Array())));
        };
        _this.onSyntaxChange = function (value) {
            _this.refs['editor'].codeMirror.setOption('mode', _this.getSyntaxMode(value));
            LocalStorageState.update(PLATFORM_TEMPLATE_EDITOR, { activeSyntax: value });
            _this.setState({
                activeSyntax: value,
            });
        };
        _this.getSyntaxMode = function (syntax) {
            var mode;
            switch (syntax) {
                case Syntax.HTMLMIXED:
                    mode = { name: 'mph-handlebars', base: 'text/html' };
                    break;
                case Syntax.MPHHANDLEBARS:
                    mode = { name: 'mph-handlebars-tags' };
                    break;
                case Syntax.HANDLEBARS:
                    mode = { name: 'handlebars' };
                    break;
                case Syntax.NONE:
                    mode = { name: 'null' };
                    break;
            }
            return mode;
        };
        _this.applicableTemplateLinks = function (templates, appliedTemplate) {
            if (templates.length === 0) {
                return react_1.DOM.span({});
            }
            else {
                return ButtonToolbar.apply(void 0, [{},
                    ButtonGroup({}, 'Applicable Templates:')].concat(_.map(templates, function (res) {
                    var props = (appliedTemplate === res)
                        ? {
                            style: { backgroundColor: '#FFC857' },
                            title: 'This template will currently be applied.',
                        }
                        : {};
                    return ButtonGroup(props, react_1.createElement(components_1.ResourceLink, {
                        resource: rdf_1.Rdf.iri(res),
                        action: components_1.ResourceLinkAction.edit
                    }, res));
                })));
            }
        };
        var localStorageSyntax = LocalStorageState.get(PLATFORM_TEMPLATE_EDITOR).activeSyntax;
        _this.state = {
            pageSource: {
                sourceHash: 0,
                source: '',
                applicableTemplates: [],
                appliedTemplate: undefined,
                includes: [],
            },
            saving: false,
            loading: false,
            activeSyntax: localStorageSyntax !== undefined ? localStorageSyntax : Syntax.HTMLMIXED,
        };
        _this.radioGroupEntries = [
            {
                type: Syntax.HTMLMIXED,
                label: 'Mixed HTML',
            },
            {
                type: Syntax.MPHHANDLEBARS,
                label: 'Backend Templates',
            },
            {
                type: Syntax.HANDLEBARS,
                label: 'Client Templates',
            },
            {
                type: Syntax.NONE,
                label: 'None',
            },
        ];
        return _this;
    }
    PageEditorComponent.prototype.componentWillUnmount = function () {
        if (this.navigationListenerUnsubscribe) {
            this.navigationListenerUnsubscribe();
        }
    };
    PageEditorComponent.prototype.componentDidMount = function () {
        this.loadPageSource(this.props.iri.value);
    };
    PageEditorComponent.prototype.componentWillReceiveProps = function (props) {
        this.loadPageSource(props.iri.value);
    };
    PageEditorComponent.prototype.shouldComponentUpdate = function (nextProps, nextState) {
        if (!_.isEqual(this.props, nextProps)) {
            return true;
        }
        else {
            return nextState.saving !== this.state.saving ||
                nextState.activeSyntax !== this.state.activeSyntax ||
                nextState.loading !== this.state.loading;
        }
    };
    PageEditorComponent.prototype.render = function () {
        var _this = this;
        return react_1.DOM.div({}, react_1.DOM.div({ className: 'page-breadcrumb' }), react_1.DOM.div({ className: 'page' }, react_1.DOM.div({ className: 'page__body' }, this.includeLinks(this.state.pageSource.includes), (!this.state.pageSource.source && this.state.pageSource.source.length === 0)
            ? this.applicableTemplateLinks(this.state.pageSource.applicableTemplates, this.state.pageSource.appliedTemplate)
            : ButtonToolbar({}, ButtonGroup({}, 'Applicable Templates: This resource does already have a direct ' +
                'corresponding page and as such no templates will be applied.')), (this.isTemplateApplied(this.props.iri, this.state.pageSource)
            ? ButtonToolbar({}, ButtonGroup({}, [
                'None of the computed templates is used. The system\'s default template ',
                react_1.createElement(components_1.ResourceLink, {
                    key: 'def',
                    resource: rdf_1.Rdf.iri('Template:' + rdf_1.vocabularies.rdfs.Resource.value),
                    style: { backgroundColor: '#FFC857' },
                }, 'Template:rdfs:Resource'),
                ' has been applied.',
            ]))
            : null), CodeMirror({
            ref: 'editor',
            className: 'template-editor',
            value: this.state.pageSource.source,
            onChange: this.onPageContentChange,
            options: {
                mode: this.getSyntaxMode(this.state.activeSyntax),
                indentWithTabs: false, indentUnit: 2, tabSize: 2,
                viewportMargin: Infinity,
                lineNumbers: true,
                lineWrapping: true,
                foldGutter: this.state.activeSyntax !== Syntax.NONE,
                gutters: this.state.activeSyntax !== Syntax.NONE ?
                    ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'] :
                    ['CodeMirror-linenumbers'],
                extraKeys: {
                    'Ctrl-S': function () { return _this.onSave(); },
                    'Cmd-S': function () { return _this.onSave(); },
                },
                textAreaClassName: ['form-control'],
                matchTags: { bothTags: true },
                matchBrackets: true,
            },
        }), this.getSyntaxChoices(), ButtonToolbar({ className: 'pull-right template-cancel-save' }, Button({
            bsStyle: 'danger',
            disabled: this.state.saving,
            onClick: this.onCancel,
        }, 'Cancel'), Button({
            bsStyle: 'primary',
            onClick: this.onSave,
            disabled: this.state.saving,
        }, this.state.saving ? react_1.DOM.span({}, 'Saving', react_1.DOM.i({ className: 'fa fa-cog fa-spin', style: { marginLeft: '5px' } })) : 'Save')))));
    };
    ;
    PageEditorComponent.prototype.isTemplateApplied = function (iri, pageSource) {
        return ((!iri.value.startsWith('Template:'))
            &&
                pageSource.applicableTemplates.indexOf(pageSource.appliedTemplate) === -1
            &&
                pageSource.appliedTemplate === 'Template:' + rdf_1.vocabularies.rdfs.Resource.value);
    };
    PageEditorComponent.prototype.includeLinks = function (includes) {
        if (includes.length === 0) {
            return null;
        }
        else {
            return ButtonToolbar.apply(void 0, [{},
                ButtonGroup({}, 'Includes:')].concat(_.map(includes, function (r) {
                return ButtonGroup({}, react_1.createElement(components_1.ResourceLink, {
                    resource: rdf_1.Rdf.iri(r['@id']),
                    action: components_1.ResourceLinkAction.edit
                }, r['@id']));
            })));
        }
    };
    return PageEditorComponent;
}(react_1.Component));
exports.PageEditor = react_1.createFactory(PageEditorComponent);
exports.default = PageEditorComponent;
