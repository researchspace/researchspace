Object.defineProperty(exports, "__esModule", { value: true });
var Rdf = require("../core/Rdf");
var rdfs;
(function (rdfs) {
    rdfs._NAMESPACE = 'http://www.w3.org/2000/01/rdf-schema#';
    rdfs.iri = function (s) { return Rdf.iri(rdfs._NAMESPACE + s); };
    rdfs.label = rdfs.iri('label');
    rdfs.domain = rdfs.iri('domain');
    rdfs.range = rdfs.iri('range');
    rdfs.comment = rdfs.iri('comment');
    rdfs.Resource = rdfs.iri('Resource');
})(rdfs || (rdfs = {}));
exports.default = rdfs;
