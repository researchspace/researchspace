Object.defineProperty(exports, "__esModule", { value: true });
var RDF = require("../core/Rdf");
var oa;
(function (oa) {
    oa._NAMESPACE = 'http://www.w3.org/ns/oa#';
    oa.Annotation = RDF.iri(oa._NAMESPACE + 'Annotation');
    oa.TextualBody = RDF.iri(oa._NAMESPACE + 'TextualBody');
    oa.hasBody = RDF.iri(oa._NAMESPACE + 'hasBody');
    oa.hasTarget = RDF.iri(oa._NAMESPACE + 'hasTarget');
    oa.text = RDF.iri(oa._NAMESPACE + 'text');
    oa.hasRole = RDF.iri(oa._NAMESPACE + 'hasRole');
})(oa || (oa = {}));
exports.default = oa;
