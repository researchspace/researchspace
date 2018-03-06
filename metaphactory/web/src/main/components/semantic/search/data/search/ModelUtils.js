Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var Model = require("./Model");
var DATE_STRING_FORMAT = 'DD/MM/YYYY';
exports.textDisjunctToString = function (disjunct) {
    return "\"" + disjunct.value + "\"";
};
exports.entityToString = function (disjunct) { return disjunct.value.label; };
exports.setToString = function (disjunct) { return "entities from set: " + disjunct.value.label; };
exports.dateValueToString = function (dateValue) {
    return dateValue.format(DATE_STRING_FORMAT);
};
exports.yearValueToString = function (value) {
    return "Year " + value.year + " " + value.epoch;
};
exports.dateToString = function (disjunct) {
    return exports.dateValueToString(disjunct.value);
};
exports.dateRangeToString = function (disjunct) {
    return exports.dateValueToString(disjunct.value.begin) + " - " + exports.dateValueToString(disjunct.value.end);
};
exports.dateDeviationToString = function (disjunct) {
    return exports.dateValueToString(disjunct.value.date) + " \u00B1 " + disjunct.value.deviation + " days";
};
exports.yearToString = function (disjunct) {
    return exports.yearValueToString(disjunct.value);
};
exports.yearRangeToString = function (disjunct) {
    return exports.yearValueToString(disjunct.value.begin) + " - " + exports.yearValueToString(disjunct.value.end);
};
exports.yearDeviationToString = function (disjunct) {
    return exports.yearValueToString(disjunct.value.year) + " \u00B1 " + disjunct.value.deviation + " years";
};
var round = function (value) { return _.round(value, 2); };
exports.spatialDistanceToString = function (disjunct) {
    var value = disjunct.value;
    return "Circle of " + round(value.distance) + "km at (" + round(value.center.lat) + "," + round(value.center.long) + ")";
};
exports.spatialBoundingBoxToString = function (disjunct) {
    var value = disjunct.value;
    return "Rectangle from (" + round(value.southWest.lat) + "," + round(value.southWest.long) + ") " +
        ("to (" + round(value.northEast.lat) + "," + round(value.northEast.long) + ")");
};
exports.literalToString = function (disjunct) {
    var value = disjunct.value.literal;
    return "Literal \"" + value + "\"";
};
exports.numericRangeToString = function (disjunct) {
    var _a = disjunct.value, begin = _a.begin, end = _a.end;
    return "Numeric range [" + begin + ", " + end + "]";
};
exports.searchDisjunctToString = function (disjunct) {
    return '';
};
exports.savedSearchToString = function (disjunct) {
    return 'Search: ' + disjunct.value.label;
};
function disjunctToString(disjunct) {
    return Model.matchDisjunct({
        Resource: exports.entityToString,
        Date: exports.dateToString,
        DateRange: exports.dateRangeToString,
        DateDeviation: exports.dateDeviationToString,
        Year: exports.yearToString,
        YearRange: exports.yearRangeToString,
        YearDeviation: exports.yearDeviationToString,
        Text: exports.textDisjunctToString,
        Set: exports.setToString,
        Search: exports.searchDisjunctToString,
        SavedSearch: exports.savedSearchToString,
        Distance: exports.spatialDistanceToString,
        BoundingBox: exports.spatialBoundingBoxToString,
        Literal: exports.literalToString,
        NumericRange: exports.numericRangeToString,
    })(disjunct);
}
exports.disjunctToString = disjunctToString;
function getCategoryTypes(config, category) {
    var categories = config.categories;
    var categoryIri = category.iri.toString();
    if (_.has(categories, categoryIri)) {
        var kinds = _.cloneDeep(_.map(categories[categoryIri], function (c) { return c.kind; }));
        if (_.intersection(kinds, ['text', 'numeric-range', 'date-range', 'literal']).length === 0 &&
            !_.includes(kinds, 'hierarchy')) {
            kinds.push('resource', 'set');
        }
        return kinds;
    }
    else {
        return ['resource', 'set'];
    }
}
exports.getCategoryTypes = getCategoryTypes;
