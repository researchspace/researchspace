Object.defineProperty(exports, "__esModule", { value: true });
var maybe = require("data.maybe");
var assign = require("object-assign");
var expand_collapse = require("cytoscape-expand-collapse");
var Api_1 = require("../api/Api");
var EXPAND_COLLAPSE_DEFAULTS = {
    fisheye: true,
    animate: false,
    undoable: false,
    collapseByDefault: true,
};
function registerExpandCollapseExtension(api) {
    expand_collapse(api.cytoscape, api.jQuery);
}
function initializeExpandCollapseExtension(_a) {
    var options = _a.options, cytoscapeApi = _a.cytoscapeApi;
    var cy = cytoscapeApi.instance;
    var expandCollapseOptions = assign({
        layoutBy: function () { return cytoscapeApi.actions.runLayout(); },
    }, EXPAND_COLLAPSE_DEFAULTS, options);
    cy.expandCollapse(expandCollapseOptions);
    if (expandCollapseOptions.collapseByDefault) {
        cy.on(Api_1.DATA_LOADED_EVENT, function () { return cy.collapseAll(); });
    }
    return maybe.Nothing();
}
exports.CytoscapeExpandCollapse = Api_1.registerCytoscapeExtension({
    name: 'expandCollapse',
    type: 'core',
    registrationFn: registerExpandCollapseExtension,
    initializationFn: initializeExpandCollapseExtension,
});
exports.default = exports.CytoscapeExpandCollapse;
