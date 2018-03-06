Object.defineProperty(exports, "__esModule", { value: true });
var rdf_1 = require("platform/api/rdf");
var searchProfile;
(function (searchProfile) {
    searchProfile._NAMESPACE = 'http://www.metaphacts.com/ontologies/platform/semantic-search-profile/';
    searchProfile.iri = function (s) { return rdf_1.Rdf.iri(searchProfile._NAMESPACE + s); };
    searchProfile.Profile = searchProfile.iri('Profile');
    searchProfile.ProfileContainer = searchProfile.iri('Profile.Container');
    searchProfile.hasDomain = searchProfile.iri('hasDomain');
    searchProfile.hasRange = searchProfile.iri('hasRange');
    searchProfile.hasRelation = searchProfile.iri('hasRelation');
    searchProfile.relation = searchProfile.iri('relation');
    searchProfile.hasCategory = searchProfile.iri('hasCategory');
    searchProfile.category = searchProfile.iri('category');
    searchProfile.order = searchProfile.iri('order');
})(searchProfile || (searchProfile = {}));
exports.default = searchProfile;
