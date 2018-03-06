Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var Kefir = require("kefir");
var maybe = require("data.maybe");
var sparql_1 = require("platform/api/sparql");
var async_1 = require("platform/api/async");
var IMAGE_REGION_INFO_QUERY = (_a = ["\n  prefix rso: <http://www.researchspace.org/ontology/>\n  prefix crmdig: <http://www.ics.forth.gr/isl/CRMdig/>\n\n  select ?type ?imageID ?area ?bbox ?viewport ?svg ?imageIRI {\n    OPTIONAL {\n      ?__iri__ a rso:EX_Digital_Image .\n      BIND(\"image\" AS ?type)\n      BIND(?__iri__ as ?imageIRI)\n    }\n    OPTIONAL {\n      ?__iri__ a rso:EX_Digital_Image_Region;\n            rdf:value ?svg.\n      ?__iri__ crmdig:L49_is_primary_area_of ?imageIRI .\n      BIND(\"region\" AS ?type)\n      OPTIONAL { ?__iri__ rso:boundingBox ?bbox }\n      OPTIONAL { ?__iri__ rso:viewport ?viewport }\n    }\n    FILTER(?__imageIdPattern__)\n  }\n"], _a.raw = ["\n  prefix rso: <http://www.researchspace.org/ontology/>\n  prefix crmdig: <http://www.ics.forth.gr/isl/CRMdig/>\n\n  select ?type ?imageID ?area ?bbox ?viewport ?svg ?imageIRI {\n    OPTIONAL {\n      ?__iri__ a rso:EX_Digital_Image .\n      BIND(\"image\" AS ?type)\n      BIND(?__iri__ as ?imageIRI)\n    }\n    OPTIONAL {\n      ?__iri__ a rso:EX_Digital_Image_Region;\n            rdf:value ?svg.\n      ?__iri__ crmdig:L49_is_primary_area_of ?imageIRI .\n      BIND(\"region\" AS ?type)\n      OPTIONAL { ?__iri__ rso:boundingBox ?bbox }\n      OPTIONAL { ?__iri__ rso:viewport ?viewport }\n    }\n    FILTER(?__imageIdPattern__)\n  }\n"], sparql_1.SparqlUtil.Sparql(_a));
function queryIIIFImageOrRegion(imageOrRegion, imageIdPattern, repositories) {
    return searchRepositoriesForImage(imageOrRegion, imageIdPattern, repositories)
        .flatMap(function (bindings) {
        var binding = bindings[0];
        var type = binding.type, imageIRI = binding.imageIRI, imageID = binding.imageID;
        if (!type || !imageIRI.isIri()) {
            return Kefir.constantError("Image or region " + imageOrRegion + " not found.");
        }
        else if (!imageID || imageID.value.indexOf('/') >= 0) {
            return Kefir.constantError("Invalid image ID '" + imageID.value + "' " +
                ("generated from " + imageIRI + " using pattern: " + imageIdPattern));
        }
        if (type.value === 'image') {
            return Kefir.constant({
                iri: imageOrRegion,
                imageId: imageID.value,
                isRegion: false,
                imageIRI: imageIRI,
            });
        }
        else if (type.value === 'region') {
            var viewport = maybe.fromNullable(binding['viewport']).chain(function (b) { return parseImageSubarea(b.value); });
            var bbox = maybe.fromNullable(binding['bbox']).chain(function (b) { return parseImageSubarea(b.value); });
            var svg = maybe.fromNullable(binding['svg']).map(function (b) { return ({ __html: b.value }); });
            return Kefir.constant({
                iri: imageOrRegion,
                imageId: imageID.value,
                isRegion: true,
                viewport: viewport.getOrElse(undefined),
                boundingBox: bbox.getOrElse(undefined),
                svgContent: svg.getOrElse(undefined),
                imageIRI: imageIRI,
            });
        }
    }).toProperty();
}
exports.queryIIIFImageOrRegion = queryIIIFImageOrRegion;
function searchRepositoriesForImage(imageOrRegion, imageIdPattern, repositories) {
    return Kefir.combine(repositories.map(function (repository) { return getImageBindings(imageOrRegion, imageIdPattern, repository); })).flatMap(function (images) {
        var imageBindings = _.filter(images, function (bindigs) { return !sparql_1.SparqlUtil.isSelectResultEmpty(bindigs); });
        if (_.isEmpty(imageBindings)) {
            return Kefir.constantError("Image or region " + imageOrRegion + " not found.");
        }
        else if (imageBindings.length > 1) {
            return Kefir.constantError("Multiple images and/or regions " + imageOrRegion + " found.");
        }
        else {
            return Kefir.constant(imageBindings[0].results.bindings);
        }
    });
}
function getImageBindings(imageOrRegion, imageIdPattern, repository) {
    var query = sparql_1.cloneQuery(IMAGE_REGION_INFO_QUERY);
    var imageIdPatterns;
    try {
        imageIdPatterns = sparql_1.SparqlUtil.parsePatterns(imageIdPattern, query.prefixes);
    }
    catch (err) {
        return Kefir.constantError(new async_1.WrappingError("Failed to parse image ID patterns '" + imageIdPattern + "':", err));
    }
    new sparql_1.PatternBinder('__imageIdPattern__', imageIdPatterns).sparqlQuery(query);
    var parametrizedQuery = sparql_1.SparqlClient.setBindings(query, { '__iri__': imageOrRegion });
    return sparql_1.SparqlClient.select(parametrizedQuery, { context: { repository: repository } });
}
function parseImageSubarea(value) {
    if (!value) {
        return maybe.Nothing();
    }
    var match = /^xywh=([^,]+),([^,]+),([^,]+),([^,]+)$/.exec(value);
    if (!match) {
        return maybe.Nothing();
    }
    return maybe.Just({
        x: parseFloat(match[1]),
        y: parseFloat(match[2]),
        width: parseFloat(match[3]),
        height: parseFloat(match[4]),
    });
}
var _a;
