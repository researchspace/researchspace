Object.defineProperty(exports, "__esModule", { value: true });
var rdf_1 = require("platform/api/rdf");
var crmdig;
(function (crmdig) {
    var NAMESPACE = 'http://www.ics.forth.gr/isl/CRMdig/';
    var iri = function (s) { return rdf_1.Rdf.iri(NAMESPACE + s); };
    crmdig.D9_Data_Object = iri('D9_Data_Object');
    crmdig.D1_Digital_Object = iri('D1_Digital_Object');
    crmdig.D3_Formal_Derivation = iri('D3_Formal_Derivation');
    crmdig.D29_Annotation_Object = iri('D29_Annotation_Object');
    crmdig.L21_used_as_derivation_source = iri('L21_used_as_derivation_source');
    crmdig.L22_created_derivative = iri('L22_created_derivative');
    crmdig.L13_used_parameters = iri('L13_used_parameters');
    crmdig.L43_annotates = iri('L43_annotates');
})(crmdig || (crmdig = {}));
exports.default = crmdig;
