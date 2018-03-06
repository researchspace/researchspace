Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var react_dom_1 = require("react-dom");
var data_maybe_1 = require("data.maybe");
var react_bootstrap_1 = require("react-bootstrap");
var YASR = require("yasgui-yasr");
var sparql_1 = require("platform/api/sparql");
var navigation_1 = require("platform/api/navigation");
var components_1 = require("platform/api/components");
var async_1 = require("platform/api/async");
var repository_1 = require("platform/api/services/repository");
var security_1 = require("platform/api/services/security");
var HasPermission_1 = require("platform/components/security/HasPermission");
var overlay_1 = require("platform/components/ui/overlay");
var alert_1 = require("platform/components/ui/alert");
var query_editor_1 = require("platform/components/query-editor");
var MetaphactsYASRTable_1 = require("./MetaphactsYASRTable");
var SparqlEditor_1 = require("./SparqlEditor");
var SparqlQueryEditorContext_1 = require("./SparqlQueryEditorContext");
require("./SparqlQueryEditor.scss");
require("yasgui-yasr/dist/yasr.css");
var CLASS_NAME = 'SparqlQueryEditor';
var SparqlQueryEditor = (function (_super) {
    tslib_1.__extends(SparqlQueryEditor, _super);
    function SparqlQueryEditor(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.cancellation = new async_1.Cancellation();
        _this.executeQuery = function (query) {
            _this.setState({ isExecuting: true });
            try {
                var parsedQuery = sparql_1.SparqlUtil.parseQuery(query);
                _this.addRecentQueries(query);
                switch (parsedQuery.type) {
                    case 'query':
                        _this.sendSparqlQuery(parsedQuery, parsedQuery.queryType);
                        break;
                    case 'update':
                        _this.executeSparqlUpdate(parsedQuery);
                        break;
                }
            }
            catch (e) {
                _this.setState({
                    isExecuting: false,
                    alertState: data_maybe_1.Just({
                        alert: alert_1.AlertType.DANGER,
                        message: e.message,
                    }),
                });
            }
        };
        _this.sendSparqlQuery = function (query, queryType) {
            sparql_1.SparqlClient.accumulateStringStream(sparql_1.SparqlClient.streamSparqlQuery(query, sparql_1.SparqlClient.stringToSparqlQueryForm[queryType], _this.getQueryContext())).onAny(function (event) {
                if (event.type === 'value') {
                    _this.yasr.setResponse(event.value);
                    _this.setState({
                        alertState: data_maybe_1.Nothing(),
                        isExecuting: false,
                    });
                }
                else if (event.type === 'error') {
                    var e = event;
                    _this.setState({
                        isExecuting: false,
                        alertState: data_maybe_1.Just({
                            alert: alert_1.AlertType.DANGER,
                            message: e.value['statusText'] ? e.value['statusText'] : e.value['message'],
                        }),
                    });
                }
            });
        };
        _this.executeSparqlUpdate = function (query) {
            sparql_1.SparqlClient.executeSparqlUpdate(query, _this.getQueryContext())
                .onValue(function (v) {
                _this.setState({
                    alertState: data_maybe_1.Nothing(),
                    isExecuting: false,
                });
                _this.yasr.setResponse('SPARQL Update Operation executed!');
            }).onError(function (e) {
                _this.setState({
                    isExecuting: false,
                    alertState: data_maybe_1.Just({
                        alert: alert_1.AlertType.DANGER,
                        message: e.message,
                    }),
                });
            });
        };
        _this.getQueryContext = function () {
            var contextOverride = _this.state.selectedRepository
                ? { repository: _this.state.selectedRepository } : undefined;
            return { context: tslib_1.__assign({}, _this.context.semanticContext, contextOverride) };
        };
        _this.addRecentQueries = function (query) {
            _this.context.queryEditorContext.setQuery(query);
        };
        _this.state = {
            isExecuting: false,
            alertState: data_maybe_1.Nothing(),
        };
        return _this;
    }
    SparqlQueryEditor.prototype.render = function () {
        var _this = this;
        return React.createElement(react_bootstrap_1.Row, { className: CLASS_NAME },
            React.createElement(react_bootstrap_1.Col, { componentClass: 'div', md: 12 },
                React.createElement(SparqlEditor_1.SparqlEditor, { ref: function (editor) { return _this.editor = editor; }, backdrop: this.state.isExecuting, query: this.state.query, onChange: function (query) {
                        _this.context.queryEditorContext.setQuery(query.value, { silent: true });
                        _this.setState({ query: query.value });
                    }, autocompleters: ['variables', 'prefixes'], persistent: function () { return 'sparqlEndpoint'; } }),
                this.state.alertState.map(function (config) { return react_1.createElement(alert_1.Alert, config); }).getOrElse(null),
                React.createElement("div", { className: "form-inline " + CLASS_NAME + "__controls" },
                    React.createElement(HasPermission_1.HasPermisssion, { permission: security_1.Permissions.queryEditorSelectEndpoint }, this.renderRepositorySelector()),
                    React.createElement(react_bootstrap_1.Button, { bsStyle: 'primary', disabled: this.state.isExecuting, onClick: function () { return _this.executeQuery(_this.state.query); } }, this.state.isExecuting ? 'Executing...' : 'Execute'),
                    React.createElement(HasPermission_1.HasPermisssion, { permission: security_1.Permissions.queryEditorSave },
                        React.createElement(react_bootstrap_1.Button, { onClick: function () { return overlay_1.getOverlaySystem().show(SaveQueryModal.KEY, React.createElement(SaveQueryModal, { query: _this.state.query, onHide: function () { return overlay_1.getOverlaySystem().hide(SaveQueryModal.KEY); } })); } }, "Save"))),
                React.createElement("div", { ref: function (resultHolder) { return _this.resultHolder = resultHolder; }, style: { visibility: this.state.isExecuting ? 'hidden' : 'visible' } })));
    };
    SparqlQueryEditor.prototype.renderRepositorySelector = function () {
        var _this = this;
        var options = [];
        if (this.state.repositoryStatus) {
            options.push(React.createElement("option", { key: '@empty', value: '' }, "(from context)"));
            this.state.repositoryStatus.forEach(function (running, repository) { return options.push(React.createElement("option", { key: repository, disabled: !running, value: repository }, repository)); });
        }
        else {
            options.push(React.createElement("option", { key: '@loading', value: '' }, "Loading..."));
        }
        return (React.createElement("span", { className: CLASS_NAME + "__repositorySelector" },
            React.createElement("label", null,
                "Repository:",
                React.createElement(react_bootstrap_1.FormControl, { componentClass: 'select', className: CLASS_NAME + "__repositorySelectorDropdown", value: this.state.selectedRepository, onChange: function (e) { return _this.setState({
                        selectedRepository: e.target.value,
                    }); } }, options))));
    };
    SparqlQueryEditor.prototype.componentDidMount = function () {
        var _this = this;
        var element = react_dom_1.findDOMNode(this.resultHolder);
        delete YASR.plugins['table'];
        delete YASR.plugins['pivot'];
        delete YASR.plugins['gChart'];
        YASR.registerOutput('metaphactsTable', function (yasr) {
            return MetaphactsYASRTable_1.MetaphactsYASRTable(yasr);
        });
        this.yasr = YASR(element, {
            outputPlugins: ['rawResponse', 'metaphactsTable', 'boolean', 'error'],
            useGoogleCharts: false,
            persistency: {
                results: false,
            },
        });
        var queryEditorContext = this.context.queryEditorContext;
        var contextQuery = queryEditorContext.getQuery();
        var initialQuery = contextQuery.getOrElse(this.editor.getQuery().value);
        if (contextQuery.isNothing) {
            queryEditorContext.setQuery(initialQuery, { silent: true });
        }
        this.setState({ query: initialQuery });
        if (navigation_1.getCurrentUrl().hasSearch('query')) {
            this.executeQuery(initialQuery);
        }
        this.cancellation.map(queryEditorContext.queryChanges).onValue(function (query) {
            _this.setState({
                alertState: data_maybe_1.Nothing(),
                query: query.getOrElse(undefined),
            });
        });
        this.cancellation.map(repository_1.getRepositoryStatus()).onValue(function (repositoryStatus) { return _this.setState({ repositoryStatus: repositoryStatus }); });
    };
    SparqlQueryEditor.prototype.componentWillUnmount = function () {
        this.cancellation.cancelAll();
    };
    return SparqlQueryEditor;
}(react_1.Component));
SparqlQueryEditor.contextTypes = tslib_1.__assign({}, components_1.ContextTypes, SparqlQueryEditorContext_1.ContextTypes);
exports.SparqlQueryEditor = SparqlQueryEditor;
var SaveQueryModal = (function (_super) {
    tslib_1.__extends(SaveQueryModal, _super);
    function SaveQueryModal() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SaveQueryModal.prototype.render = function () {
        var _a = this.props, onHide = _a.onHide, query = _a.query;
        return (React.createElement(react_bootstrap_1.Modal, { show: true, onHide: onHide, bsSize: 'large' },
            React.createElement(react_bootstrap_1.Modal.Header, { closeButton: true },
                React.createElement(react_bootstrap_1.Modal.Title, null, "Save Query")),
            React.createElement(react_bootstrap_1.Modal.Body, null,
                React.createElement(components_1.SemanticContextProvider, { repository: 'assets' },
                    React.createElement(query_editor_1.QueryTemplate, { defaultQuery: query })))));
    };
    return SaveQueryModal;
}(react_1.Component));
SaveQueryModal.KEY = 'SparqlQueryEditor-SaveQuery';
exports.default = SparqlQueryEditor;
