Object.defineProperty(exports, "__esModule", { value: true });
var BaseResourceService_1 = require("./BaseResourceService");
var THUMBNAIL_SERVICE_URL = "/rest/data/rdf/utils/thumbnails/default";
var service = new BaseResourceService_1.BaseResourceService(THUMBNAIL_SERVICE_URL);
function getThumbnail(iri, context) {
    return service.getResource(iri, context);
}
exports.getThumbnail = getThumbnail;
function getThumbnails(iris, context) {
    return service.getResources(iris, context);
}
exports.getThumbnails = getThumbnails;
