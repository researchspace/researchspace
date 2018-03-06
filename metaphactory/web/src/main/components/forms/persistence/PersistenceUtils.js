Object.defineProperty(exports, "__esModule", { value: true });
var sparql_1 = require("platform/api/sparql");
function parseQueryStringAsUpdateOperation(queryString) {
    if (!queryString) {
        return undefined;
    }
    var query = sparql_1.SparqlUtil.parseQuery(queryString);
    if (query.type === 'update') {
        return query;
    }
    else {
        throw new Error('Specified deletePattern or insertPattern is not an update query.');
    }
}
exports.parseQueryStringAsUpdateOperation = parseQueryStringAsUpdateOperation;
