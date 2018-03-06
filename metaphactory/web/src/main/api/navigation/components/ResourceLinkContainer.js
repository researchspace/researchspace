Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var rdf_1 = require("platform/api/rdf");
var navigation_1 = require("platform/api/navigation");
var dnd_1 = require("platform/components/dnd");
var components_1 = require("platform/api/components");
var ResourceLinkContainer = (function (_super) {
    tslib_1.__extends(ResourceLinkContainer, _super);
    function ResourceLinkContainer() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.onClick = function (event) {
            navigation_1.navigateToResource(rdf_1.Rdf.iri(_this.props.uri), navigation_1.NavigationUtils.extractParams(_this.props), _this.context.semanticContext ? _this.context.semanticContext.repository : undefined).onValue(function () { });
        };
        return _this;
    }
    ResourceLinkContainer.prototype.render = function () {
        var props = {
            onClick: this.onClick,
        };
        if (this.props.draggable === false) {
            return react_1.cloneElement(react_1.Children.only(this.props.children), props);
        }
        else {
            return react_1.createElement(dnd_1.Draggable, { iri: this.props.uri }, react_1.cloneElement(react_1.Children.only(this.props.children), props));
        }
    };
    return ResourceLinkContainer;
}(components_1.Component));
exports.ResourceLinkContainer = ResourceLinkContainer;
exports.default = ResourceLinkContainer;
