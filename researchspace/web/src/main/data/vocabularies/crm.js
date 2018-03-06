Object.defineProperty(exports, "__esModule", { value: true });
var rdf_1 = require("platform/api/rdf");
var crm;
(function (crm) {
    var NAMESPACE = 'http://www.cidoc-crm.org/cidoc-crm/';
    var iri = function (s) { return rdf_1.Rdf.iri(NAMESPACE + s); };
    crm.E31_Document = iri('E31_Document');
    crm.P3_has_note = iri('P3_has_note');
    crm.P45_consists_of = iri('P45_consists_of');
    crm.P14_carried_out_by = iri('P14_carried_out_by');
    crm.P4_has_time_span = iri('P4_has_time_span');
    crm.P70i_is_documented_in = iri('P70i_is_documented_in');
    crm.P82a_begin_of_the_begin = iri('P82a_begin_of_the_begin');
    crm.P82a_end_of_the_end = iri('P82a_end_of_the_end');
    crm.P138i_has_representation = iri('P138i_has_representation');
})(crm || (crm = {}));
exports.default = crm;
