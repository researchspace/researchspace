Object.defineProperty(exports, "__esModule", { value: true });
var Kefir = require("kefir");
var immutable_1 = require("immutable");
var SearchConfig_1 = require("../../config/SearchConfig");
var sparql_1 = require("platform/api/sparql");
var rdf_1 = require("platform/api/rdf");
var SearchDefaults = require("../../config/Defaults");
function fetchSearchProfilesQuery(config) {
    return Kefir.combine([
        sparql_1.SparqlClient.select(config.categoriesQuery),
        sparql_1.SparqlClient.select(config.relationsQuery),
    ], function (categoriesBindings, relationsBindings) {
        var profilesCategories = constructCategories(categoriesBindings.results.bindings);
        var profilesRelations = constructRelations(relationsBindings.results.bindings, profilesCategories);
        var profiles = profilesCategories.mapEntries(function (_a) {
            var profile = _a[0], categories = _a[1];
            return [profile, {
                    iri: profile,
                    label: profile.value,
                    categories: categories,
                    relations: profilesRelations.get(profile),
                }];
        });
        return profiles;
    }).toProperty();
}
exports.fetchSearchProfilesQuery = fetchSearchProfilesQuery;
function fetchSearchProfilesInline(config) {
    var categories = constructCategoriesFromInline(config.categories);
    var relations = constructRelationsFromInline(config.relations, categories);
    var dummyProfile = rdf_1.Rdf.fullIri(SearchDefaults.DefaultInlineProfile);
    var theProfile = {
        iri: dummyProfile,
        label: dummyProfile.value,
        description: dummyProfile.value,
        tuple: { iri: dummyProfile },
        categories: categories,
        relations: relations,
    };
    var profiles = immutable_1.Map([[dummyProfile, theProfile]]);
    return Kefir.constant(profiles);
}
exports.fetchSearchProfilesInline = fetchSearchProfilesInline;
function constructCategories(bindings) {
    var categoriesByProfile = immutable_1.List(bindings).groupBy(function (binding) { return binding[SearchConfig_1.RELATION_PROFILE_VARIABLES.PROFILE_PROJECTION_VAR]; });
    return categoriesByProfile.map(constructCategoriesFromBindings).toMap();
}
function constructCategoriesFromInline(inlineConfigs) {
    return immutable_1.List(inlineConfigs).map(constructCategoryFromInline)
        .groupBy(function (category) { return category.iri; }).toOrderedMap().map(function (cs) { return cs.first(); });
}
function constructCategoryFromInline(inlineConfig) {
    return {
        iri: rdf_1.Rdf.fullIri(inlineConfig.iri),
        label: inlineConfig.label,
        thumbnail: inlineConfig.thumbnail,
        description: inlineConfig.label,
        tuple: {
            iri: rdf_1.Rdf.fullIri(inlineConfig.iri),
            label: rdf_1.Rdf.literal(inlineConfig.label),
            thumbnail: inlineConfig.thumbnail ? rdf_1.Rdf.literal(inlineConfig.thumbnail) : undefined,
        }
    };
}
function constructCategoriesFromBindings(bindings) {
    return bindings
        .map(constructCategoryBromBinding).groupBy(function (category) { return category.iri; }).toOrderedMap().map(function (cs) { return cs.first(); });
}
function constructCategoryBromBinding(binding) {
    var thumbnail = binding[SearchConfig_1.RELATION_PROFILE_VARIABLES.THUMBNAIL_PROJECTION_VAR];
    return {
        iri: binding[SearchConfig_1.RELATION_PROFILE_VARIABLES.CATEGORY_PROJECTION_VAR],
        label: binding[SearchConfig_1.RELATION_PROFILE_VARIABLES.LABEL_PROJECTION_VAR].value,
        description: binding[SearchConfig_1.RELATION_PROFILE_VARIABLES.DESCRIPTION_PROJECTION_VAR].value,
        thumbnail: thumbnail ? thumbnail.value : undefined,
        tuple: binding,
    };
}
function constructRelations(bindings, categories) {
    var relationsByProfile = immutable_1.List(bindings).groupBy(function (binding) { return binding[SearchConfig_1.RELATION_PROFILE_VARIABLES.PROFILE_PROJECTION_VAR]; });
    return relationsByProfile.map(function (profileBindings, profile) {
        return constructRelationsFromBindings(profileBindings, categories.get(profile));
    }).toMap();
}
function constructRelationsFromBindings(bindings, categories) {
    return bindings
        .map(function (binding) { return constructRelationBromBinding(binding, categories); }).groupBy(function (relation) { return relation.iri; }).toOrderedMap().map(function (rs) { return rs.first(); });
}
function constructRelationBromBinding(binding, categories) {
    var iri = binding[SearchConfig_1.RELATION_PROFILE_VARIABLES.RELATION_PROJECTION_VAR];
    return {
        iri: iri,
        label: binding[SearchConfig_1.RELATION_PROFILE_VARIABLES.LABEL_PROJECTION_VAR].value,
        description: binding[SearchConfig_1.RELATION_PROFILE_VARIABLES.DESCRIPTION_PROJECTION_VAR].value,
        hasRange: categories.get(binding[SearchConfig_1.RELATION_PROFILE_VARIABLES.RELATION_RANGE_PROJECTION_VAR]),
        hasDomain: categories.get(binding[SearchConfig_1.RELATION_PROFILE_VARIABLES.RELATION_DOMAIN_PROJECTION_VAR]),
        tuple: binding,
        hashCode: function () { return iri.hashCode(); },
        equals: function (other) { return iri.equals(other.iri); }
    };
}
function constructRelationsFromInline(inlineConfigs, categories) {
    return immutable_1.List(inlineConfigs)
        .map(function (inlineRelation) { return constructRelationFromInline(inlineRelation, categories); })
        .groupBy(function (relation) { return relation.iri; })
        .toOrderedMap()
        .map(function (rs) { return rs.first(); });
}
function constructRelationFromInline(inlineConfig, categories) {
    var iri = rdf_1.Rdf.fullIri(inlineConfig.iri);
    return {
        iri: iri,
        label: inlineConfig.label,
        description: inlineConfig.label,
        hasDomain: categories.get(rdf_1.Rdf.fullIri(inlineConfig.hasDomain)),
        hasRange: categories.get(rdf_1.Rdf.fullIri(inlineConfig.hasRange)),
        tuple: { iri: rdf_1.Rdf.fullIri(inlineConfig.iri), label: rdf_1.Rdf.literal(inlineConfig.label) },
        hashCode: function () { return iri.hashCode(); },
        equals: function (other) { return iri.equals(other.iri); }
    };
}
