Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var maybe = require("data.maybe");
var rdf_1 = require("platform/api/rdf");
var ldp_1 = require("platform/api/services/ldp");
var navigation_1 = require("platform/api/navigation");
var overlay_1 = require("platform/components/ui/overlay");
var CreateResourceDialog_1 = require("./CreateResourceDialog");
require("./create-ldp-resource.scss");
var DuplicateResourceComponent = (function (_super) {
    tslib_1.__extends(DuplicateResourceComponent, _super);
    function DuplicateResourceComponent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.onSave = function (name) {
            var service = new ldp_1.LdpService(_this.props.container);
            return service.copyResource(rdf_1.Rdf.iri(_this.props.iri), maybe.fromNullable(_this.props.container).map(rdf_1.Rdf.iri), maybe.Just(name)).map(rdf_1.Rdf.iri).flatMap(function (newResourceIri) {
                return navigation_1.navigateToResource(newResourceIri).onValue(function () { });
            }).toProperty();
        };
        return _this;
    }
    DuplicateResourceComponent.prototype.render = function () {
        var _this = this;
        var child = react_1.Children.only(this.props.children);
        var props = {
            onClick: function () {
                var dialogRef = 'duplicate-resource';
                overlay_1.getOverlaySystem().show(dialogRef, react_1.createElement(CreateResourceDialog_1.CreateResourceDialog, {
                    onSave: _this.onSave,
                    onHide: function () { return overlay_1.getOverlaySystem().hide(dialogRef); },
                    show: true,
                    title: _this.props.title ? _this.props.title : 'Duplicate resource',
                    placeholder: _this.props.placeholder,
                }));
            },
        };
        return react_1.cloneElement(child, props);
    };
    return DuplicateResourceComponent;
}(react_1.Component));
exports.component = DuplicateResourceComponent;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
