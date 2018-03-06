Object.defineProperty(exports, "__esModule", { value: true });
var data_maybe_1 = require("data.maybe");
var _ = require("lodash");
function propertyValue(point, property) {
    return (point && point[property]) ? data_maybe_1.of(point[property].value) : data_maybe_1.Nothing();
}
exports.propertyValue = propertyValue;
function labeled(node, labels) {
    if (!node) {
        return '';
    }
    if (node.isIri()) {
        var label = labels[node.value];
        if (label) {
            return label;
        }
    }
    return node.value;
}
exports.labeled = labeled;
function extractKey(set, point) {
    return point[set.mapping.category || set.mapping.x];
}
exports.extractKey = extractKey;
function extractValue(set, point) {
    return point[set.mapping.value || set.mapping.y];
}
exports.extractValue = extractValue;
function valueExists(set, point) {
    var value = extractValue(set, point);
    return !_.isUndefined(value) && !_.isNull(value);
}
exports.valueExists = valueExists;
function isSetContainsPoint(set, point) {
    return !set.id || point[set.mapping.dataSetVariable].value === set.id;
}
exports.isSetContainsPoint = isSetContainsPoint;
function parseNumeric(value) {
    var num = parseFloat(value);
    return Number.isNaN(num) ? data_maybe_1.Nothing() : data_maybe_1.Just(num);
}
exports.parseNumeric = parseNumeric;
