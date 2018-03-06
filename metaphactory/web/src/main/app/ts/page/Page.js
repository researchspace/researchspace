Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var navigation_1 = require("platform/api/navigation");
var components_1 = require("platform/api/components");
var module_loader_1 = require("platform/api/module-loader");
var PageToolbar_1 = require("./PageToolbar");
var PageViewer_1 = require("./PageViewer");
var PageComponent = (function (_super) {
    tslib_1.__extends(PageComponent, _super);
    function PageComponent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PageComponent.prototype.render = function () {
        var props = { iri: navigation_1.getCurrentResource(), params: navigation_1.getCurrentUrl().search(true) };
        var pageComponent = navigation_1.getCurrentUrl().hasQuery('action', 'edit') ?
            module_loader_1.ComponentsLoader.factory({
                componentTagName: 'mp-internal-page-editor', componentProps: props,
            }) : PageViewer_1.default(props);
        return react_1.createElement(components_1.SemanticContextProvider, { repository: navigation_1.getCurrentRepository() }, react_1.DOM.div({ className: 'page-holder' }, PageToolbar_1.default(props), pageComponent));
    };
    return PageComponent;
}(react_1.Component));
exports.PageComponent = PageComponent;
exports.default = PageComponent;
