Object.defineProperty(exports, "__esModule", { value: true });
var rdf_1 = require("platform/api/rdf");
var crminf;
(function (crminf) {
    var NAMESPACE = 'http://www.ics.forth.gr/isl/CRMinf/';
    var iri = function (s) { return rdf_1.Rdf.iri(NAMESPACE + s); };
    crminf.I1_Argumentation = iri('I1_Argumentation');
    crminf.I2_Belief = iri('I2_Belief');
    crminf.I4_Proposition_Set = iri('I4_Proposition_Set');
    crminf.I5_Inference_Making = iri('I5_Inference_Making');
    crminf.I7_Belief_Adoption = iri('I7_Belief_Adoption');
    crminf.J1_used_as_premise = iri('J1_used_as_premise');
    crminf.J2_concluded_that = iri('J2_concluded_that');
    crminf.J3_applies = iri('J3_applies');
    crminf.J4_that = iri('J4_that');
    crminf.J5_holds_to_be = iri('J5_holds_to_be');
    crminf.J6_adopted = iri('J6_adopted');
})(crminf || (crminf = {}));
exports.default = crminf;
