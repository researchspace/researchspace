Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var rdf_1 = require("platform/api/rdf");
var ldp_1 = require("platform/api/services/ldp");
var navigation_1 = require("platform/api/navigation");
var RemoveFromContainerComponent = (function (_super) {
    tslib_1.__extends(RemoveFromContainerComponent, _super);
    function RemoveFromContainerComponent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.deleteItem = function () {
            new ldp_1.LdpService(_this.props.container).deleteResource(rdf_1.Rdf.iri(_this.props.iri)).onValue(function () { return navigation_1.refresh(); });
        };
        return _this;
    }
    RemoveFromContainerComponent.prototype.render = function () {
        var child = react_1.Children.only(this.props.children);
        var props = {
            onClick: this.deleteItem,
        };
        return react_1.cloneElement(child, props);
    };
    return RemoveFromContainerComponent;
}(react_1.Component));
exports.component = RemoveFromContainerComponent;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
