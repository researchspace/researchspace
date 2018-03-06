Object.defineProperty(exports, "__esModule", { value: true });
var RDF = require("../core/Rdf");
var spl;
(function (spl) {
    spl._NAMESPACE = 'http://spinrdf.org/spl#';
    spl.optionalProp = RDF.iri(spl._NAMESPACE + 'optional');
    spl.predicateProp = RDF.iri(spl._NAMESPACE + 'predicate');
    spl.valueTypeProp = RDF.iri(spl._NAMESPACE + 'valueType');
    spl.defaultValue = RDF.iri(spl._NAMESPACE + 'defaultValue');
    spl.Argument = RDF.iri(spl._NAMESPACE + 'Argument');
})(spl || (spl = {}));
exports.default = spl;
