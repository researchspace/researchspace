Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var maybe = require("data.maybe");
var CytoscapeExtension_1 = require("./CytoscapeExtension");
function registerCytoscapeLayout(name, registerFn, mapOptionsFunction) {
    var registerFnWrapper = function (api) { return registerFn(api.cytoscape, api.jQuery); };
    return CytoscapeExtension_1.registerCytoscapeExtension({
        name: name,
        type: 'layout',
        registrationFn: registerFnWrapper,
        initializationFn: initializeLayout(name, mapOptionsFunction),
    });
}
exports.registerCytoscapeLayout = registerCytoscapeLayout;
function initializeLayout(name, mapOptionsFunction) {
    return function (_a) {
        var cytoscapeApi = _a.cytoscapeApi, options = _a.options;
        var layoutOptions = lodash_1.assign({ name: name }, options);
        layoutOptions =
            mapOptionsFunction ? mapOptionsFunction(cytoscapeApi, layoutOptions) : layoutOptions;
        cytoscapeApi.actions.setLayout(layoutOptions);
        return maybe.Nothing();
    };
}
