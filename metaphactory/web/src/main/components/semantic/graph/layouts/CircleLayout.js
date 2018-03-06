Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var core_lambda_1 = require("core.lambda");
var Api_1 = require("../api/Api");
var LayoutHelpers_1 = require("../api/LayoutHelpers");
exports.CircleLayout = Api_1.registerCytoscapeLayout('circle', core_lambda_1.identity, mapOptions);
exports.default = exports.CircleLayout;
function mapOptions(api, options) {
    if (lodash_1.has(options, 'sortBy')) {
        var sortBy = options['sortBy'];
        options['sort'] = LayoutHelpers_1.sort(sortBy);
    }
    return options;
}
