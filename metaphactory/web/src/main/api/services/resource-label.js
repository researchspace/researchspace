Object.defineProperty(exports, "__esModule", { value: true });
var BaseResourceService_1 = require("./BaseResourceService");
var LABELS_SERVICE_URL = '/rest/data/rdf/utils/getLabelsForRdfValue';
var service = new BaseResourceService_1.BaseResourceService(LABELS_SERVICE_URL);
function getLabel(iri, context) {
    return service.getResource(iri, context);
}
exports.getLabel = getLabel;
function getLabels(iris, context) {
    return service.getResources(iris, context);
}
exports.getLabels = getLabels;
