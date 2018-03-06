Object.defineProperty(exports, "__esModule", { value: true });
var maybe = require("data.maybe");
var panzoom = require("cytoscape-panzoom");
require("cytoscape-panzoom/cytoscape.js-panzoom.css");
var Api_1 = require("../api/Api");
function registerPanZoomExtension(api) {
    panzoom(api.cytoscape, api.jQuery);
}
function initializePanZoomExtension(_a) {
    var cytoscapeApi = _a.cytoscapeApi, options = _a.options;
    return maybe.Just(cytoscapeApi.instance.panzoom(options));
}
exports.CytoscapePanZoom = Api_1.registerCytoscapeExtension({
    name: 'panzoom',
    type: 'core',
    registrationFn: registerPanZoomExtension,
    initializationFn: initializePanZoomExtension,
});
exports.default = exports.CytoscapePanZoom;
