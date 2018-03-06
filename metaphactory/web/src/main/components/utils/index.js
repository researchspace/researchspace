function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var rdf_1 = require("platform/api/rdf");
function prepareResultData(data) {
    return _.each(data.results.bindings, function (binding) { return _.map(data.head.vars, function (bindingVar) { return binding[bindingVar] ? binding[bindingVar] : rdf_1.Rdf.literal(''); }); });
}
exports.prepareResultData = prepareResultData;
__export(require("./KefirComponent"));
__export(require("./LoadingBackdrop"));
__export(require("./BrowserPersistence"));
__export(require("./ComponentUtils"));
__export(require("./Action"));
__export(require("./HideableLink"));
__export(require("./ControlledProps"));
