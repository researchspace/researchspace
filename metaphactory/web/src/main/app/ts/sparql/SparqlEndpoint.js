Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var PageLoader = require("platform/components/ui/page-loader");
var SparqlEndpointComponent = (function (_super) {
    tslib_1.__extends(SparqlEndpointComponent, _super);
    function SparqlEndpointComponent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SparqlEndpointComponent.prototype.render = function () {
        return react_1.DOM.div({ className: 'page-holder' }, PageLoader.factory({ iri: 'http://system.metaphacts.com/resource/SparqlEndpoint' }));
    };
    return SparqlEndpointComponent;
}(react_1.Component));
exports.SparqlEndpointComponent = SparqlEndpointComponent;
exports.default = SparqlEndpointComponent;
