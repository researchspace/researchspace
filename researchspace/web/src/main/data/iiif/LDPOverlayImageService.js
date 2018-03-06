Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var rdf_1 = require("platform/api/rdf");
var ldp_1 = require("platform/api/services/ldp");
var vocabularies_1 = require("../vocabularies/vocabularies");
var LdpOverlayImageServiceClass = (function (_super) {
    tslib_1.__extends(LdpOverlayImageServiceClass, _super);
    function LdpOverlayImageServiceClass(container) {
        return _super.call(this, container) || this;
    }
    LdpOverlayImageServiceClass.prototype.createResourceGraph = function (name, topImage, topOpacity, bottomImage, bottomOpacity) {
        var overlayIri = rdf_1.Rdf.iri('');
        var eventIri = rdf_1.Rdf.iri('http://www.metaphacts.com/event');
        var param1 = rdf_1.Rdf.iri('http://www.metaphacts.com/param1');
        var param2 = rdf_1.Rdf.iri('http://www.metaphacts.com/param2');
        var resourceGraph = rdf_1.Rdf.graph(rdf_1.Rdf.triple(overlayIri, rdf_1.vocabularies.rdf.type, vocabularies_1.rso.Thing), rdf_1.Rdf.triple(overlayIri, rdf_1.vocabularies.rdf.type, vocabularies_1.rso.EX_Digital_Image), rdf_1.Rdf.triple(overlayIri, rdf_1.vocabularies.rdf.type, vocabularies_1.crmdig.D9_Data_Object), rdf_1.Rdf.triple(overlayIri, rdf_1.vocabularies.rdfs.label, rdf_1.Rdf.literal(name)), rdf_1.Rdf.triple(overlayIri, vocabularies_1.rso.displayLabel, rdf_1.Rdf.literal(name)), rdf_1.Rdf.triple(topImage, vocabularies_1.crmdig.L21_used_as_derivation_source, eventIri), rdf_1.Rdf.triple(bottomImage, vocabularies_1.crmdig.L21_used_as_derivation_source, eventIri), rdf_1.Rdf.triple(eventIri, rdf_1.vocabularies.rdf.type, vocabularies_1.crmdig.D3_Formal_Derivation), rdf_1.Rdf.triple(eventIri, vocabularies_1.crmdig.L22_created_derivative, overlayIri), rdf_1.Rdf.triple(eventIri, vocabularies_1.crmdig.L13_used_parameters, param1), rdf_1.Rdf.triple(param1, rdf_1.vocabularies.rdf.type, vocabularies_1.crmdig.D1_Digital_Object), rdf_1.Rdf.triple(param1, vocabularies_1.rso.OverlayImageSource, bottomImage), rdf_1.Rdf.triple(param1, vocabularies_1.rso.OverlayOrder, rdf_1.Rdf.literal('1')), rdf_1.Rdf.triple(param1, vocabularies_1.rso.OverlayOpacity, rdf_1.Rdf.literal('' + bottomOpacity)), rdf_1.Rdf.triple(eventIri, vocabularies_1.crmdig.L13_used_parameters, param2), rdf_1.Rdf.triple(param2, rdf_1.vocabularies.rdf.type, vocabularies_1.crmdig.D1_Digital_Object), rdf_1.Rdf.triple(param2, vocabularies_1.rso.OverlayImageSource, topImage), rdf_1.Rdf.triple(param2, vocabularies_1.rso.OverlayOrder, rdf_1.Rdf.literal('2')), rdf_1.Rdf.triple(param2, vocabularies_1.rso.OverlayOpacity, rdf_1.Rdf.literal('' + topOpacity)));
        return resourceGraph;
    };
    LdpOverlayImageServiceClass.prototype.createOverlayImage = function (name, topImage, topOpacity, bottomImage, bottomOpacity) {
        var resource = this.createResourceGraph(name, topImage, topOpacity, bottomImage, bottomOpacity);
        return this.addResource(resource);
    };
    return LdpOverlayImageServiceClass;
}(ldp_1.LdpService));
exports.LdpOverlayImageServiceClass = LdpOverlayImageServiceClass;
exports.LdpOverlayImageService = new LdpOverlayImageServiceClass(vocabularies_1.rso.OverlayImageContainer.value);
exports.default = exports.LdpOverlayImageService;
