Object.defineProperty(exports, "__esModule", { value: true });
var Rdf = require("../core/Rdf");
var rdf;
(function (rdf) {
    rdf._NAMESPACE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
    rdf.iri = function (s) { return Rdf.iri(rdf._NAMESPACE + s); };
    rdf.type = rdf.iri('type');
    rdf.langString = rdf.iri('langString');
    rdf.first = rdf.iri('first');
    rdf.rest = rdf.iri('rest');
    rdf.nil = rdf.iri('nil');
})(rdf || (rdf = {}));
exports.default = rdf;
