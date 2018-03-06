Object.defineProperty(exports, "__esModule", { value: true });
var maybe = require("data.maybe");
var rdf_1 = require("platform/api/rdf");
function setSearchDomain(domain, context) {
    return context.searchProfileStore.chain(function (profileStore) {
        return maybe.fromNullable(domain).map(rdf_1.Rdf.fullIri).chain(function (iri) { return maybe.fromNullable(profileStore.categories.get(iri)); });
    }).map(context.setDomain);
}
exports.setSearchDomain = setSearchDomain;
