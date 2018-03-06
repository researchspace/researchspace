var Immutable = require("immutable");
var _ = require("lodash");
var sparql_1 = require("platform/api/sparql");
var RdfService;
(function (RdfService) {
    function getRdfTypes(resource) {
        var bindingName = 'type';
        var query = 'SELECT ?type WHERE { <' + resource.value + '> a ?type}';
        return sparql_1.SparqlClient.select(query).map(function (r) {
            var list = _.reduce(r.results.bindings, function (total, b) {
                total.push(b[bindingName]);
                return total;
            }, []);
            return Immutable.List(list);
        });
    }
    RdfService.getRdfTypes = getRdfTypes;
})(RdfService || (RdfService = {}));
module.exports = RdfService;
