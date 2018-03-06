Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var maybe = require("data.maybe");
var rdf_1 = require("platform/api/rdf");
var navigation_1 = require("platform/api/navigation");
var ldp_1 = require("platform/api/services/ldp");
var overlay_1 = require("platform/components/ui/overlay");
var CreateResourceDialog_1 = require("./CreateResourceDialog");
var graph = rdf_1.Rdf.graph, iri = rdf_1.Rdf.iri, triple = rdf_1.Rdf.triple, literal = rdf_1.Rdf.literal, Iri = rdf_1.Rdf.Iri;
var VocabPlatform = rdf_1.vocabularies.VocabPlatform, rdfs = rdf_1.vocabularies.rdfs, rdf = rdf_1.vocabularies.rdf, ldp = rdf_1.vocabularies.ldp;
require("./create-ldp-resource.scss");
var CreateNewResourceComponent = (function (_super) {
    tslib_1.__extends(CreateNewResourceComponent, _super);
    function CreateNewResourceComponent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.createResource = function (name) {
            return new ldp_1.LdpService(_this.props.container).addResource(graph([
                triple(iri(''), rdf.type, iri(_this.props.type)),
                triple(iri(''), rdfs.label, literal(name)),
            ]), maybe.Just(name));
        };
        _this.createContainer = function () {
            return new ldp_1.LdpService(VocabPlatform.RootContainer.value).addResource(graph([
                triple(iri(''), rdf.type, ldp.Container),
                triple(iri(''), rdfs.label, literal('LDP Container for resources of type ' + _this.props.container)),
            ]), maybe.Just(_this.props.container));
        };
        _this.onSave = function (name) {
            return new ldp_1.LdpService(VocabPlatform.RootContainer.value).options(iri(_this.props.container)).flatMap(function (v) { return _this.createResource(name); }).flatMapErrors(function (e) { return _this.createContainer().flatMap(function (containerIri) { return _this.createResource(name); }); }).map(function (newResourceIri) { return navigation_1.navigateToResource(newResourceIri).onValue(function () { }); }).toProperty();
        };
        return _this;
    }
    CreateNewResourceComponent.prototype.render = function () {
        var _this = this;
        var child = react_1.Children.only(this.props.children);
        var props = {
            onClick: function () {
                var dialogRef = 'create-new-resource';
                overlay_1.getOverlaySystem().show(dialogRef, react_1.createElement(CreateResourceDialog_1.CreateResourceDialog, {
                    onSave: _this.onSave,
                    onHide: function () { return overlay_1.getOverlaySystem().hide(dialogRef); },
                    show: true,
                    title: _this.props.title,
                    placeholder: _this.props.placeholder,
                }));
            },
        };
        return react_1.DOM.div({}, react_1.cloneElement(child, props));
    };
    return CreateNewResourceComponent;
}(react_1.Component));
exports.component = CreateNewResourceComponent;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
