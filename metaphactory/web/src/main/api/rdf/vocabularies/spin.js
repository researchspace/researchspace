Object.defineProperty(exports, "__esModule", { value: true });
var RDF = require("../core/Rdf");
var spin;
(function (spin) {
    spin._NAMESPACE = 'http://spinrdf.org/spin#';
    spin.Template = RDF.iri(spin._NAMESPACE + 'Template');
    spin.SelectTemplate = RDF.iri(spin._NAMESPACE + 'SelectTemplate');
    spin.ConstructTemplate = RDF.iri(spin._NAMESPACE + 'ConstructTemplate');
    spin.AskTemplate = RDF.iri(spin._NAMESPACE + 'AskTemplate');
    spin.UpdateTemplate = RDF.iri(spin._NAMESPACE + 'UpdateTemplate');
    spin.constraintProp = RDF.iri(spin._NAMESPACE + 'constraint');
    spin.bodyProp = RDF.iri(spin._NAMESPACE + 'body');
    spin.text = RDF.iri(spin._NAMESPACE + 'text');
})(spin || (spin = {}));
exports.default = spin;
