Object.defineProperty(exports, "__esModule", { value: true });
var Rdf = require("../core/Rdf");
var dct;
(function (dct) {
    dct.NAMESPACE = 'http://purl.org/dc/terms/';
    dct.iri = function (s) { return Rdf.iri(dct.NAMESPACE + s); };
    dct.subject = dct.iri('subject');
})(dct || (dct = {}));
exports.default = dct;
