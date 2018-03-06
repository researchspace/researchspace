Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var core_lambda_1 = require("core.lambda");
var Api_1 = require("../api/Api");
var LayoutHelpers_1 = require("../api/LayoutHelpers");
exports.ConcentricLayout = Api_1.registerCytoscapeLayout('concentric', core_lambda_1.identity, mapOptions);
exports.default = exports.ConcentricLayout;
function mapOptions(api, options) {
    if (lodash_1.has(options, 'concentric')) {
        options['concentric'] = concentricBy(options['concentric']);
    }
    return options;
}
function concentricBy(levelPropertyName) {
    var levelFn = LayoutHelpers_1.getNumberValueForProperty(levelPropertyName);
    return function (element) {
        return levelFn(element).getOrElse(0);
    };
}
