Object.defineProperty(exports, "__esModule", { value: true });
var maybe = require("data.maybe");
var _ = require("lodash");
var rdf_1 = require("platform/api/rdf");
var SearchProfileService_1 = require("./SearchProfileService");
var SearchConfig_1 = require("../../config/SearchConfig");
var ModelUtils_1 = require("../search/ModelUtils");
var SearchProfileStore = (function () {
    function SearchProfileStore(config, profiles) {
        var _this = this;
        this.rangesFor = function (domain) {
            var ranges = _this.categories.filter(function (category) {
                return _this.relations.some(function (relation) {
                    return relation.hasDomain.iri.equals(domain.iri) && relation.hasRange.iri.equals(category.iri);
                }) || _.includes(ModelUtils_1.getCategoryTypes(_this._config, category), 'text');
            });
            return ranges;
        };
        this._availableProfiles = profiles;
        this._profile = this.availableProfiles.first();
        if (SearchConfig_1.isQuerySearchProfileConfig(config.searchProfile)) {
            var profileConfig = config.searchProfile;
            if (profileConfig.defaultProfile) {
                this._profile = this._availableProfiles.get(rdf_1.Rdf.fullIri(profileConfig.defaultProfile));
            }
        }
        this._config = config;
    }
    Object.defineProperty(SearchProfileStore.prototype, "availableProfiles", {
        get: function () {
            return this._availableProfiles;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SearchProfileStore.prototype, "profile", {
        get: function () {
            return this._profile;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SearchProfileStore.prototype, "categories", {
        get: function () {
            return this._profile.categories;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SearchProfileStore.prototype, "domains", {
        get: function () {
            var _this = this;
            return this._profile.categories.filterNot(function (category) { return _.includes(ModelUtils_1.getCategoryTypes(_this._config, category), 'text'); });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SearchProfileStore.prototype, "relations", {
        get: function () {
            return this._profile.relations;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SearchProfileStore.prototype, "ranges", {
        get: function () {
            return this.relations.mapEntries(function (_a) {
                var _ = _a[0], relation = _a[1];
                return [relation.hasRange.iri, relation.hasRange];
            });
        },
        enumerable: true,
        configurable: true
    });
    SearchProfileStore.prototype.relationsFor = function (_a) {
        var _b = _a.domain, domain = _b === void 0 ? maybe.Nothing() : _b, _c = _a.range, range = _c === void 0 ? maybe.Nothing() : _c;
        return this.relations.filter(function (rel) {
            var domainMatch = domain.map(function (d) { return rel.hasDomain.iri.equals(d.iri); }).getOrElse(true);
            var rangeMatch = range.map(function (r) { return rel.hasRange.iri.equals(r.iri); }).getOrElse(true);
            return domainMatch && rangeMatch;
        });
    };
    return SearchProfileStore;
}());
exports.SearchProfileStore = SearchProfileStore;
function createSearchProfileStore(config, profileConfig) {
    if (SearchConfig_1.isQuerySearchProfileConfig(profileConfig)) {
        return SearchProfileService_1.fetchSearchProfilesQuery(profileConfig).map(function (ps) { return new SearchProfileStore(config, ps); });
    }
    else {
        return SearchProfileService_1.fetchSearchProfilesInline(profileConfig).map(function (ps) { return new SearchProfileStore(config, ps); });
    }
}
exports.createSearchProfileStore = createSearchProfileStore;
exports.default = SearchProfileStore;
