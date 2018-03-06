Object.defineProperty(exports, "__esModule", { value: true });
var core_lambda_1 = require("core.lambda");
var Api_1 = require("../api/Api");
exports.BreadthFirstLayout = Api_1.registerCytoscapeLayout('breadthfirst', core_lambda_1.identity);
exports.default = exports.BreadthFirstLayout;
