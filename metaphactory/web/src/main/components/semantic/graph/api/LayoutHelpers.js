Object.defineProperty(exports, "__esModule", { value: true });
var maybe = require("data.maybe");
function sort(sortBy) {
    var getValue = getNumberValueForProperty(sortBy);
    return function (a, b) {
        var cmp = getValue(a).chain(function (aValue) { return getValue(b).map(function (bValue) { return aValue - bValue; }); });
        if (cmp.isNothing) {
            console.warn('Graph Layout: trying to sort by non numerical property ' + sortBy);
        }
        return cmp.getOrElse(0);
    };
}
exports.sort = sort;
function getNumberValueForProperty(prop) {
    return function (element) {
        var propValue = element.data(prop);
        return propValue ? getLiteralNumberValue(propValue[0]) : maybe.Nothing();
    };
}
exports.getNumberValueForProperty = getNumberValueForProperty;
function getLiteralNumberValue(node) {
    if (node.isLiteral()) {
        if (!isNaN(+node.value)) {
            return maybe.Just(+node.value);
        }
        else {
            return maybe.Nothing();
        }
    }
    else {
        return maybe.Nothing();
    }
}
exports.getLiteralNumberValue = getLiteralNumberValue;
