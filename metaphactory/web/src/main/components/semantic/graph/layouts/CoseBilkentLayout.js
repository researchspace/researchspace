Object.defineProperty(exports, "__esModule", { value: true });
var regCose = require("cytoscape-cose-bilkent");
var Api_1 = require("../api/Api");
exports.CoseBilkentLayout = Api_1.registerCytoscapeLayout('cose-bilkent', function (cytoscape) { return regCose(cytoscape); });
exports.default = exports.CoseBilkentLayout;
