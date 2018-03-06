Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var core_lambda_1 = require("core.lambda");
var Api_1 = require("../api/Api");
exports.CoseLayout = Api_1.registerCytoscapeLayout('cose', core_lambda_1.identity, mapOptions);
exports.default = exports.CoseLayout;
function mapOptions(api, options) {
    if (lodash_1.has(options, 'idealEdgeLength')) {
        var idealEdgeLength_1 = options['idealEdgeLength'];
        options['idealEdgeLength'] = function () { return idealEdgeLength_1; };
    }
    if (lodash_1.has(options, 'nodeRepulsion')) {
        var nodeRepulsion_1 = options['nodeRepulsion'];
        options['nodeRepulsion'] = function () { return nodeRepulsion_1; };
    }
    if (lodash_1.has(options, 'edgeElasticity')) {
        var edgeElasticity_1 = options['edgeElasticity'];
        options['edgeElasticity'] = function () { return edgeElasticity_1; };
    }
    return options;
}
