Object.defineProperty(exports, "__esModule", { value: true });
var rdf_1 = require("platform/api/rdf");
var ontodiaNs;
(function (ontodiaNs) {
    ontodiaNs._NAMESPACE = 'http://www.ontodia.org/schema/v1#';
    ontodiaNs.iri = function (s) { return rdf_1.Rdf.iri(ontodiaNs._NAMESPACE + s); };
    ontodiaNs.diagram = ontodiaNs.iri('diagram');
    ontodiaNs.diagramLayoutString = ontodiaNs.iri('diagramLayoutString');
})(ontodiaNs || (ontodiaNs = {}));
exports.default = ontodiaNs;
