Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Kefir = require("kefir");
var jsonld = require("jsonld");
var _ = require("lodash");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var ldp_1 = require("platform/api/services/ldp");
var vocabularies_1 = require("../vocabularies/vocabularies");
var JsonLDUtils_1 = require("./JsonLDUtils");
var annotationFrame = require('./ld-resources/annotation-frame.json');
var LdpRegionServiceClass = (function (_super) {
    tslib_1.__extends(LdpRegionServiceClass, _super);
    function LdpRegionServiceClass(container) {
        var _this = _super.call(this, container) || this;
        _this.processRegionJsonResponse = function (res) {
            return Kefir.fromNodeCallback(function (cb) {
                jsonld.frame(res, annotationFrame, function (err2, framed) {
                    if (err2) {
                        cb(err2, framed);
                        return;
                    }
                    jsonld.compact(framed, framed['@context'], function (err3, compacted) {
                        var context = compacted['@context'];
                        if (Array.isArray(context)) {
                            compacted['@context'] = context[0];
                        }
                        cb(err3, compacted);
                    });
                });
            });
        };
        _this.regionQuery = "\nprefix oa: <http://www.w3.org/ns/oa#>\nprefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\nprefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>\nprefix rso: <http://www.researchspace.org/ontology/>\nprefix dcmit: <http://purl.org/dc/dcmitype/>\nprefix cnt: <http://www.w3.org/2011/content#>\nprefix dc: <http://purl.org/dc/elements/1.1/>\nprefix crmdig: <http://www.ics.forth.gr/isl/CRMdig/>\n\nCONSTRUCT {\n?annotation a oa:Annotation ;\n    oa:motivatedBy oa:commenting ;\n    oa:hasTarget _:specificResource ;\n    oa:hasBody _:body.\n    _:body  a dcmit:Text;\n            dc:format \"text/html\";\n            cnt:chars ?label.\n\n    _:specificResource a oa:SpecificResource ;\n            oa:hasSource ?img ;\n            oa:hasSelector _:selector ;\n            rso:viewport ?viewport ;\n            rso:boundingBox ?boundingBox .\n\n    _:selector a oa:Choice ;\n               oa:default _:fragmentSelector ;\n               oa:item _:svgSelector .\n\n    _:svgSelector a oa:SvgSelector ;\n                  rdf:value ?svgValue .\n\n    _:fragmentSelector a oa:FragmentSelector ;\n                       rdf:value ?boundingBox .\n} WHERE {\n  ?annotation a crmdig:D35_Area ;\n              rso:displayLabel ?label ;\n              crmdig:L49_is_primary_area_of ?img ;\n              rdf:value ?svgValue .\n\n  OPTIONAL { ?annotation rso:viewport ?viewport }\n  OPTIONAL { ?annotation rso:boundingBox ?boundingBox }\n}";
        JsonLDUtils_1.default.registerLocalLoader();
        return _this;
    }
    LdpRegionServiceClass.prototype.addRegion = function (region) {
        return this.createResourceRequest(this.getContainerIRI(), { data: JSON.stringify(region.annotation), format: 'application/ld+json' }).map(function (iri) { return new rdf_1.Rdf.Iri(iri); });
    };
    LdpRegionServiceClass.prototype.updateRegion = function (annotationIri, region) {
        return this.sendUpdateResourceRequest(annotationIri, { data: JSON.stringify(region.annotation), format: 'application/ld+json' });
    };
    LdpRegionServiceClass.prototype.search = function (objectIri) {
        var _this = this;
        return sparql_1.SparqlClient.select(this.selectForRegions(objectIri), { context: { repository: 'assets' } }).flatMap(function (result) {
            if (result.results.bindings.length === 0) {
                return Kefir.constant([]);
            }
            return Kefir.combine(result.results.bindings.map(function (row) { return _this.getRegionFromSparql(row['region']); }));
        }).map(function (regions) { return regions.filter(function (region) { return Boolean(region['@id']); }); }).toProperty();
    };
    LdpRegionServiceClass.prototype.getRegionFromSparql = function (regionIri) {
        return sparql_1.SparqlClient.stringStreamAsJson(sparql_1.SparqlClient.sendStreamSparqlQuery(this.constructForRegion(regionIri), 'application/ld+json', { context: { repository: 'assets' } })).flatMap(this.processRegionJsonResponse).toProperty();
    };
    LdpRegionServiceClass.prototype.getRegion = function (regionIri) {
        return this.getResourceRequest(regionIri.value, 'application/ld+json').map(function (jsonText) { return ({ annotation: JSON.parse(jsonText) }); });
    };
    LdpRegionServiceClass.prototype.selectForRegions = function (objectIri) {
        return "prefix crmdig: <http://www.ics.forth.gr/isl/CRMdig/>\nselect ?region where {\n  ?region crmdig:L49_is_primary_area_of " + objectIri + ".\n}";
    };
    LdpRegionServiceClass.prototype.constructForRegion = function (regionIri) {
        return sparql_1.SparqlClient.setBindings(sparql_1.SparqlUtil.parseQuery(this.regionQuery), {
            annotation: regionIri
        });
    };
    return LdpRegionServiceClass;
}(ldp_1.LdpService));
exports.LdpRegionServiceClass = LdpRegionServiceClass;
function getAnnotationTextResource(annotation) {
    if (annotation && annotation.resource) {
        var resources = Array.isArray(annotation.resource)
            ? annotation.resource : [annotation.resource];
        return _.find(resources, function (resource) { return resource['@type'] === 'dctypes:Text'; });
    }
}
exports.getAnnotationTextResource = getAnnotationTextResource;
exports.LdpRegionService = new LdpRegionServiceClass(vocabularies_1.rso.ImageRegionContainer.value);
exports.default = exports.LdpRegionService;
