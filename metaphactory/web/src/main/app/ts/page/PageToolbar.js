Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var ReactBootstrap = require("react-bootstrap");
var CopyToClipboard = require("react-copy-to-clipboard");
var components_1 = require("platform/api/components");
var components_2 = require("platform/api/navigation/components");
var SecurityService = require("platform/api/services/security");
var ResourceViewer_1 = require("./ResourceViewer");
require("../../scss/page-editor.scss");
var ButtonGroup = react_1.createFactory(ReactBootstrap.ButtonGroup);
var ButtonToolbar = react_1.createFactory(ReactBootstrap.ButtonToolbar);
var PageEditorToolbarComponent = (function (_super) {
    tslib_1.__extends(PageEditorToolbarComponent, _super);
    function PageEditorToolbarComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.state = {
            hasEditPermission: false,
        };
        return _this;
    }
    PageEditorToolbarComponent.prototype.componentWillMount = function () {
        var _this = this;
        SecurityService.Util.isPermitted(SecurityService.Permissions.templateSave).onValue(function (answer) { return _this.setState({ hasEditPermission: answer }); });
    };
    PageEditorToolbarComponent.prototype.render = function () {
        return ButtonToolbar({ className: 'component-page-toolbar hidden-print' }, ButtonGroup({}, this.showAssetsRepositoryIndicator(), this.state.hasEditPermission ?
            react_1.createElement(components_2.ResourceLink, {
                resource: this.props.iri,
                className: 'btn btn-default component-page-toolbar__btn_edit',
                activeClassName: 'active',
                title: 'Edit Page',
                action: components_2.ResourceLinkAction.edit,
            }, react_1.DOM.span({}, ' Edit Page')) : null, react_1.createElement(ResourceViewer_1.ResourceViewer, {
            pageIri: 'http://www.metaphacts.com/ontologies/platform#SourceStatements',
            title: 'Statements'
        }, react_1.DOM.a({
            className: 'btn btn-default component-page-toolbar__btn_show_source',
            title: 'Show Statements',
        })), react_1.createElement(ResourceViewer_1.ResourceViewer, {
            pageIri: 'http://www.metaphacts.com/ontologies/platform#SourceGraph',
            title: 'Graph'
        }, react_1.DOM.a({
            className: 'btn btn-default component-page-toolbar__btn_show_graph',
            title: 'Show Graph',
        })), react_1.createElement(ResourceViewer_1.ResourceViewer, {
            pageIri: 'http://www.metaphacts.com/ontologies/platform#SourceDiagram',
            title: 'Diagram'
        }, react_1.DOM.a({
            className: 'btn btn-default component-page-toolbar__btn_show_diagram',
            title: 'Show Diagram',
        })), react_1.createElement(CopyToClipboard, {
            text: this.props.iri.value,
        }, react_1.DOM.a({
            className: 'btn btn-default component-page-toolbar__btn_copy_iri',
            title: 'Copy IRI',
        }))));
    };
    PageEditorToolbarComponent.prototype.showAssetsRepositoryIndicator = function () {
        var repository = this.context.semanticContext.repository;
        if (repository === 'assets' && this.state.hasEditPermission) {
            return react_1.DOM.div({ className: 'badge alert-info component-page-toolbar__repository_indicator' }, 'assets repository');
        }
        else {
            return null;
        }
    };
    return PageEditorToolbarComponent;
}(components_1.Component));
exports.PageToolbar = react_1.createFactory(PageEditorToolbarComponent);
exports.default = exports.PageToolbar;
