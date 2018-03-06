Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
exports.RELATION_PROFILE_VARIABLES = {
    CATEGORY_PROJECTION_VAR: 'category',
    RELATION_PROJECTION_VAR: 'relation',
    LABEL_PROJECTION_VAR: 'label',
    THUMBNAIL_PROJECTION_VAR: 'thumbnail',
    DESCRIPTION_PROJECTION_VAR: 'description',
    PROFILE_PROJECTION_VAR: 'profile',
    RELATION_RANGE_PROJECTION_VAR: 'hasRange',
    RELATION_DOMAIN_PROJECTION_VAR: 'hasDomain',
};
exports.SEMANTIC_SEARCH_VARIABLES = {
    PROJECTION_ALIAS_VAR: 'subject',
    DOMAIN_VAR: '__domain__',
    RANGE_VAR: '__range__',
    RESOURCE_VAR: '__value__',
    SET_VAR: '__set__',
    RELATION_VAR: '__relation__',
    RELATION_PATTERN_VAR: '__relationPattern__',
    DATE_BEGING_VAR: '__dateBeginValue__',
    DATE_END_VAR: '__dateEndValue__',
    GEO_CENTER_VAR: '__geoCenter__',
    GEO_DISTANCE_VAR: '__geoDistance__',
    GEO_SOUTH_WEST: '__geoSouthWest__',
    GEO_NORTH_EAST: '__geoNorthEast__',
    LITERAL_VAR: '__literal__',
    NUMERIC_RANGE_BEGIN_VAR: '__numericRangeBeginValue__',
    NUMERIC_RANGE_END_VAR: '__numericRangeEndValue__',
};
exports.RESOURCE_SEGGESTIONS_VARIABLES = {
    SUGGESTION_IRI: 'suggestion',
    SUGGESTION_LABEL: 'label',
    SEARCH_TERM_VAR: '__token__',
};
exports.RESULT_VARIABLES = {
    CONTEXT_RELATION_VAR: '__contextRelation__',
    CONTEXT_RELATION_PATTERN_VAR: '__contextRelationPattern__',
};
exports.FACET_VARIABLES = {
    RELATION_VAR: '__relation__',
    RELATION_PATTERN_VAR: '__facetRelationPattern__',
    RANGE_VAR: '__range__',
    DOMAIN_VAR: '__domain__',
    VALUE_RESOURCE_VAR: 'value',
    VALUE_RESOURCE_LABEL_VAR: 'label',
    VALUE_DATE_RANGE_BEGIN_VAR: 'dateBeginValue',
    VALUE_DATE_RANGE_END_VAR: 'dateEndValue',
    VALUE_LITERAL: 'literal',
};
function getConfigPatternForCategory(config, category) {
    var patternConfigs = config.categories[category.toString()];
    if (patternConfigs && patternConfigs.length > 0) {
        return patternConfigs[0];
    }
    else {
        return undefined;
    }
}
exports.getConfigPatternForCategory = getConfigPatternForCategory;
function isQuerySearchProfileConfig(config) {
    return _.has(config, 'relationsQuery');
}
exports.isQuerySearchProfileConfig = isQuerySearchProfileConfig;
