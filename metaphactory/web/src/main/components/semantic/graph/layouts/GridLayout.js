Object.defineProperty(exports, "__esModule", { value: true });
var maybe = require("data.maybe");
var lodash_1 = require("lodash");
var core_lambda_1 = require("core.lambda");
var react_1 = require("react");
var Api_1 = require("../api/Api");
var LayoutHelpers_1 = require("../api/LayoutHelpers");
exports.component = Api_1.registerCytoscapeLayout('grid', core_lambda_1.identity, mapOptions);
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
function mapOptions(api, options) {
    if (lodash_1.has(options, 'sortBy')) {
        var sortBy = options['sortBy'];
        options['sort'] = LayoutHelpers_1.sort(sortBy);
    }
    if (lodash_1.has(options, 'positionRow') || lodash_1.has(options, 'positionCol')) {
        options['position'] = positionBy(options['positionRow'], options['positionCol']);
    }
    return options;
}
function positionBy(x, y) {
    var xFn = maybe.fromNullable(x).map(LayoutHelpers_1.getNumberValueForProperty).getOrElse(maybe.Nothing);
    var yFn = maybe.fromNullable(y).map(LayoutHelpers_1.getNumberValueForProperty).getOrElse(maybe.Nothing);
    return function (element) {
        return {
            row: xFn(element).getOrElse(undefined),
            col: yFn(element).getOrElse(undefined),
        };
    };
}
