Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var core_lambda_1 = require("core.lambda");
var Api_1 = require("../api/Api");
var LayoutHelpers_1 = require("../api/LayoutHelpers");
exports.PresetLayout = Api_1.registerCytoscapeLayout('preset', core_lambda_1.identity, mapOptions);
exports.default = exports.PresetLayout;
function mapOptions(api, options) {
    if (lodash_1.has(options, 'positionX') && lodash_1.has(options, 'positionY')) {
        options['positions'] = positionBy(options['positionX'], options['positionY']);
    }
    else {
        console.error('Graph Preset Layout: position-x and position-y attributes are required!');
    }
    return options;
}
function positionBy(xProp, yProp) {
    var xFn = LayoutHelpers_1.getNumberValueForProperty(xProp);
    var yFn = LayoutHelpers_1.getNumberValueForProperty(yProp);
    return function (element) {
        return xFn(element).chain(function (x) { return yFn(element).map(function (y) { return { x: x, y: y }; }); }).getOrElse({ x: undefined, y: undefined });
    };
}
