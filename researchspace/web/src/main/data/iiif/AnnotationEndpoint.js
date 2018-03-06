Object.defineProperty(exports, "__esModule", { value: true });
var rdf_1 = require("platform/api/rdf");
var LDPImageRegionService_1 = require("./LDPImageRegionService");
var LdpAnnotationEndpoint = (function () {
    function LdpAnnotationEndpoint(options) {
        this.displayedRegion = options.displayedRegion;
    }
    LdpAnnotationEndpoint.prototype.search = function (canvasIri) {
        var _this = this;
        var annotationList = LDPImageRegionService_1.LdpRegionService.search(canvasIri);
        if (this.displayedRegion) {
            annotationList = annotationList.map(function (list) { return list.filter(function (annotation) { return annotation['@id'] === _this.displayedRegion.value; }); });
        }
        return annotationList;
    };
    LdpAnnotationEndpoint.prototype.create = function (annotation) {
        return LDPImageRegionService_1.LdpRegionService.addRegion({ annotation: annotation });
    };
    LdpAnnotationEndpoint.prototype.update = function (annotation) {
        var id = rdf_1.Rdf.iri(annotation['@id']);
        return LDPImageRegionService_1.LdpRegionService.updateRegion(id, { annotation: annotation });
    };
    LdpAnnotationEndpoint.prototype.remove = function (annotationIri) {
        return LDPImageRegionService_1.LdpRegionService.deleteResource(annotationIri);
    };
    return LdpAnnotationEndpoint;
}());
exports.LdpAnnotationEndpoint = LdpAnnotationEndpoint;
