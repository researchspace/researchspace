Object.defineProperty(exports, "__esModule", { value: true });
var rdf_1 = require("platform/api/rdf");
var crmsci;
(function (crmsci) {
    var NAMESPACE = 'http://www.ics.forth.gr/isl/CRMsci/';
    var iri = function (s) { return rdf_1.Rdf.iri(NAMESPACE + s); };
    crmsci.S4_Observation = iri('S4_Observation');
    crmsci.S19_Encounter_Event = iri('S19_Encounter_Event');
    crmsci.O8_observed = iri('O8_observed');
    crmsci.O19_has_found_object = iri('O19_has_found_object');
    crmsci.O21_has_found_at = iri('O21_has_found_at');
})(crmsci || (crmsci = {}));
exports.default = crmsci;
