Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Kefir = require("kefir");
var jsonld = require("jsonld");
var _ = require("lodash");
var sparql_1 = require("platform/api/sparql");
var JsonLDUtils_1 = require("./JsonLDUtils");
var manifestFrame = require('./ld-resources/manifest-frame.json');
var iiifContext = require('./ld-resources/iiif-context.json');
var ManifestBuildingError = (function (_super) {
    tslib_1.__extends(ManifestBuildingError, _super);
    function ManifestBuildingError(message, inner) {
        var _this = _super.call(this, message) || this;
        _this.inner = inner;
        return _this;
    }
    return ManifestBuildingError;
}(Error));
exports.ManifestBuildingError = ManifestBuildingError;
function createManifest(params, repositories) {
    return findManifesInRepositories(params, repositories)
        .mapErrors(function (err) { return new ManifestBuildingError('Failed fetching manifest data', err); })
        .flatMap(processJsonResponse).toProperty();
}
exports.createManifest = createManifest;
function findManifesInRepositories(params, repositories) {
    var sparql = constructSparql(params);
    JsonLDUtils_1.JsonLDUtils.registerLocalLoader();
    var requests = repositories.map(function (repository) {
        return sparql_1.SparqlClient.stringStreamAsJson(sparql_1.SparqlClient.sendStreamSparqlQuery(sparql, 'application/ld+json', { context: { repository: repository } }));
    });
    return Kefir.combine(requests).flatMap(function (responses) {
        var manifests = _.filter(responses, function (response) { return !_.isEmpty(response); });
        if (_.isEmpty(manifests)) {
            return Kefir.constantError("No manifests for the image/region " + params.imageIri);
        }
        else if (manifests.length > 1) {
            return Kefir.constantError("Multiple manifests for image/regions " + params.imageIri);
        }
        else {
            return Kefir.constant(manifests[0]);
        }
    });
}
function processJsonResponse(response) {
    return Kefir.fromNodeCallback(function (cb) {
        jsonld.frame(response, manifestFrame, function (frameError, framed) {
            if (frameError) {
                cb(new ManifestBuildingError('Failed to frame JSON-LD', frameError));
                return;
            }
            jsonld.compact(framed, iiifContext, function (compactError, compacted) {
                if (compactError) {
                    cb(new ManifestBuildingError('Failed to compact JSON-LD', compactError));
                    return;
                }
                cb(null, compacted);
            });
        });
    });
}
function constructSparql(params) {
    var sparql = "PREFIX as: <http://www.w3.org/ns/activitystreams#>\nPREFIX cnt: <http://www.w3.org/2011/content#>\nPREFIX dc: <http://purl.org/dc/elements/1.1/>\nPREFIX dcmit: <http://purl.org/dc/dcmitype/>\nPREFIX dcterms: <http://purl.org/dc/terms/>\nPREFIX dctypes: <http://purl.org/dc/dcmitype/>\nPREFIX foaf: <http://xmlns.com/foaf/0.1/>\nPREFIX iiif: <http://iiif.io/api/image/2#>\nPREFIX exif: <http://www.w3.org/2003/12/exif/ns#>\nPREFIX oa: <http://www.w3.org/ns/oa#>\nPREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\nPREFIX sc: <http://iiif.io/api/presentation/2#>\nPREFIX siocserv: <http://rdfs.org/sioc/services#>\nPREFIX svcs: <http://rdfs.org/sioc/services#>\nPREFIX xml: <http://www.w3.org/XML/1998/namespace>\nPREFIX xsd: <http://www.w3.org/2001/XMLSchema#>\nPREFIX rso: <http://www.researchspace.org/ontology/>\n\nCONSTRUCT {\n?manifestURI a sc:Manifest ;\nrdfs:label ?displayLabel;\nsc:attributionLabel \"Provided by the The British Museum\" ;\nsc:hasSequences ( ?sequenceURI ) ;\ndc:description ?displayLabel;\ndcterms:within ?object.\n\n?service dcterms:conformsTo <http://iiif.io/api/image/2/level1.json> .\n\n?imageResourceURI a dctypes:Image ;\ndc:format \"image/jpeg\" ;\nsvcs:has_service ?service .\n\n?imageannoURI a oa:Annotation ;\noa:hasBody ?imageResourceURI ;\noa:hasTarget ?canvasURI ;\noa:motivatedBy sc:painting .\n\n?sequenceURI a sc:Sequence ;\nsc:hasCanvases ( ?canvasURI ) .\n\n?canvasURI a sc:Canvas ;\nrdfs:label \"Illustrated book. 2 vols.\" ;\nsc:hasImageAnnotations ( ?imageannoURI ).\n\n" + (params.canvasSize ? ("?canvasURI " +
        ("exif:width \"" + params.canvasSize.width + "\"^^xsd:integer ; ") +
        ("exif:height \"" + params.canvasSize.height + "\"^^xsd:integer")) : '') + "\n\n} WHERE {\n {\n   # workaround for the situation when we have multiple rso:displayLabel\n   SELECT * {\n     BIND(" + params.imageIri + " as ?img)\n     BIND(STR(" + params.baseIri + ") as ?baseStr)\n     #find object and it's label\n     ?img rso:displayLabel ?displayLabel.\n     BIND(<" + params.imageServiceUri + "> as ?service)\n     BIND(URI(CONCAT(?baseStr, \"/manifest.json\")) as ?manifestURI)\n     BIND(URI(CONCAT(?baseStr, \"/sequence\")) as ?sequenceURI)\n     BIND(URI(CONCAT(?baseStr, \"\")) as ?canvasURI)\n     BIND(URI(CONCAT(?baseStr, \"/imageanno/anno-1\")) as ?imageannoURI)\n     BIND(URI(CONCAT(?baseStr, \"/imgresource\")) as ?imageResourceURI)\n  } LIMIT 1\n }\n}";
    return sparql;
}
