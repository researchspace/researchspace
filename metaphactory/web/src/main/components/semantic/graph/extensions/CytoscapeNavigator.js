Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var maybe = require("data.maybe");
var cytoscapeNavigator = require("cytoscape-navigator");
require("cytoscape-navigator/cytoscape.js-navigator.css");
var module_loader_1 = require("platform/api/module-loader");
var Api_1 = require("../api/Api");
function registerNavigatorExtension(api) {
    cytoscapeNavigator(api.cytoscape, api.jQuery);
}
function initializeNavigatorExtension(_a) {
    var cytoscapeApi = _a.cytoscapeApi, options = _a.options;
    var container = createNavigatorContainer(options);
    var config = lodash_1.assign({}, options, { container: container });
    cytoscapeApi.instance.container().appendChild(container);
    return maybe.Just(cytoscapeApi.instance.navigator(config));
}
function createNavigatorContainer(config) {
    var container = document.createElement('div');
    container.className = 'cytoscape-navigator';
    container.setAttribute('style', config[module_loader_1.ModuleRegistry.RAW_STYLE_ATTRIBUTE]);
    container.style.position = 'absolute';
    return container;
}
exports.CytoscapeNavigator = Api_1.registerCytoscapeExtension({
    name: 'navigator',
    type: 'core',
    registrationFn: registerNavigatorExtension,
    initializationFn: initializeNavigatorExtension,
});
exports.default = exports.CytoscapeNavigator;
