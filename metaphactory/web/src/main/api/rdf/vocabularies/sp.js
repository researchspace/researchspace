Object.defineProperty(exports, "__esModule", { value: true });
var RDF = require("../core/Rdf");
var sp;
(function (sp) {
    sp._NAMESPACE = 'http://spinrdf.org/sp#';
    sp.Query = RDF.iri(sp._NAMESPACE + 'Query');
    sp.Ask = RDF.iri(sp._NAMESPACE + 'Ask');
    sp.Select = RDF.iri(sp._NAMESPACE + 'Select');
    sp.Describe = RDF.iri(sp._NAMESPACE + 'Describe');
    sp.Construct = RDF.iri(sp._NAMESPACE + 'Construct');
    sp.Update = RDF.iri(sp._NAMESPACE + 'Update');
    sp.text = RDF.iri(sp._NAMESPACE + 'text');
})(sp || (sp = {}));
exports.default = sp;
