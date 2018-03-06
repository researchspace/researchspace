Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var rdf_1 = require("platform/api/rdf");
var ldp_1 = require("platform/api/services/ldp");
var vocabularies_1 = require("./vocabularies/vocabularies");
var LdpLinkServiceClass = (function (_super) {
    tslib_1.__extends(LdpLinkServiceClass, _super);
    function LdpLinkServiceClass(container) {
        return _super.call(this, container) || this;
    }
    LdpLinkServiceClass.prototype.createResourceGraph = function (name, links) {
        var linkIri = rdf_1.Rdf.iri('');
        var linksGraph = links.map(function (link) { return rdf_1.Rdf.triple(linkIri, vocabularies_1.crmdig.L43_annotates, link); });
        var resourceGraph = rdf_1.Rdf.graph.apply(rdf_1.Rdf, [rdf_1.Rdf.triple(linkIri, rdf_1.vocabularies.rdf.type, vocabularies_1.crmdig.D29_Annotation_Object),
            rdf_1.Rdf.triple(linkIri, rdf_1.vocabularies.rdfs.label, rdf_1.Rdf.literal(name)),
            rdf_1.Rdf.triple(linkIri, vocabularies_1.rso.displayLabel, rdf_1.Rdf.literal(name))].concat(linksGraph.toArray()));
        return resourceGraph;
    };
    LdpLinkServiceClass.prototype.createLink = function (name, links) {
        var resource = this.createResourceGraph(name, links);
        return this.addResource(resource);
    };
    return LdpLinkServiceClass;
}(ldp_1.LdpService));
exports.LdpLinkServiceClass = LdpLinkServiceClass;
exports.LdpLinkService = new LdpLinkServiceClass(vocabularies_1.rso.LinkContainer.value);
exports.default = exports.LdpLinkService;
