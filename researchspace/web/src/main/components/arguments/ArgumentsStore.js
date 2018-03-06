Object.defineProperty(exports, "__esModule", { value: true });
var Maybe = require("data.maybe");
var uuid = require("uuid");
var Kefir = require("kefir");
var _ = require("lodash");
var moment = require("moment");
var rdf_1 = require("platform/api/rdf");
var rdf = rdf_1.vocabularies.rdf, rdfs = rdf_1.vocabularies.rdfs;
var sparql_1 = require("platform/api/sparql");
var ldp_1 = require("platform/api/services/ldp");
var vocabularies_1 = require("researchspace/data/vocabularies/vocabularies");
var ArgumentsApi_1 = require("./ArgumentsApi");
var FieldUtils_1 = require("./FieldUtils");
var BeliefsUtil_1 = require("./BeliefsUtil");
var assertionContainer = ldp_1.ldpc(vocabularies_1.rso.ArgumentsContainer.value);
function loadArgumentsForAssertion(assertionIri) {
    return findArgumentsForAssertion(assertionIri).flatMap(function (argumentIris) {
        if (_.isEmpty(argumentIris)) {
            return Kefir.constant([]);
        }
        else {
            return Kefir.combine(_.map(argumentIris, function (iri) { return assertionContainer.get(iri).map(function (graph) { return rdf_1.Rdf.pg(iri, graph); }); }));
        }
    }).flatMap(function (graphs) {
        if (_.isEmpty(graphs)) {
            return Kefir.constant([]);
        }
        else {
            return Kefir.combine(_.map(graphs, deserializeArgument));
        }
    }).toProperty();
}
exports.loadArgumentsForAssertion = loadArgumentsForAssertion;
var FIND_ARGUMENTS_QUERY = (_a = ["\n  SELECT DISTINCT ?argument WHERE {\n    ?__assertion__ <http://www.researchspace.org/ontology/PX_asserts> ?belief .\n    ?argument <http://www.ics.forth.gr/isl/CRMinf/J2_concluded_that> ?belief .\n  }\n"], _a.raw = ["\n  SELECT DISTINCT ?argument WHERE {\n    ?__assertion__ <http://www.researchspace.org/ontology/PX_asserts> ?belief .\n    ?argument <http://www.ics.forth.gr/isl/CRMinf/J2_concluded_that> ?belief .\n  }\n"], sparql_1.SparqlUtil.Sparql(_a));
function findArgumentsForAssertion(assertionIri) {
    var query = sparql_1.SparqlClient.setBindings(FIND_ARGUMENTS_QUERY, { '__assertion__': assertionIri });
    return sparql_1.SparqlClient.select(query, { context: { repository: 'assets' } }).map(function (res) { return res.results.bindings.map(function (b) { return b['argument']; }); });
}
function deserializeArgument(pg) {
    var types = rdf_1.Rdf.getValuesFromPropertyPath([rdf.type], pg);
    if (_.some(types, function (t) { return t.equals(vocabularies_1.crmsci.S19_Encounter_Event); })) {
        return Kefir.constant(deserializeObservation(pg));
    }
    else if (_.some(types, function (t) { return t.equals(vocabularies_1.crminf.I7_Belief_Adoption); })) {
        return deserializeBeliefAdoption(pg);
    }
    else {
        return deserializeInference(pg);
    }
}
function deserializeObservation(pg) {
    return {
        iri: Maybe.Just(pg.pointer),
        argumentType: ArgumentsApi_1.ObservationType,
        title: rdf_1.Rdf.getValueFromPropertyPath([rdfs.label], pg).map(function (v) { return v.value; }).getOrElse(''),
        note: rdf_1.Rdf.getValueFromPropertyPath([vocabularies_1.crm.P3_has_note], pg).map(function (v) { return v.value; }).getOrElse(''),
        place: rdf_1.Rdf.getValueFromPropertyPath([vocabularies_1.crmsci.O21_has_found_at], pg).getOrElse(undefined),
        date: rdf_1.Rdf.getValueFromPropertyPath([vocabularies_1.crm.P4_has_time_span, vocabularies_1.crm.P82a_begin_of_the_begin], pg).getOrElse(undefined),
    };
}
function deserializeBeliefAdoption(pg) {
    var adoptedBeliefAssertion = rdf_1.Rdf.getValueFromPropertyPath([vocabularies_1.rso.PX_adopted_assertion], pg);
    if (adoptedBeliefAssertion.isJust) {
        return Kefir.constant({
            iri: Maybe.Just(pg.pointer),
            argumentType: ArgumentsApi_1.BeliefAdoptionType,
            title: rdf_1.Rdf.getValueFromPropertyPath([rdfs.label], pg).map(function (v) { return v.value; }).getOrElse(''),
            note: rdf_1.Rdf.getValueFromPropertyPath([vocabularies_1.crm.P3_has_note], pg).map(function (v) { return v.value; }).getOrElse(''),
            belief: {
                iri: adoptedBeliefAssertion,
                beliefType: ArgumentsApi_1.BeliefTypeArgumentsKind,
                argumentBeliefType: ArgumentsApi_1.ArgumentsBeliefTypeAssertionKind,
                assertion: adoptedBeliefAssertion.get(),
                belief: {
                    type: 'simple',
                    value: 'Agree',
                }
            },
        });
    }
    else {
        var adoptedFieldBeliefsIri = _.head(rdf_1.Rdf.getValuesFromPropertyPath([vocabularies_1.crminf.J6_adopted], pg));
        var belief = deserializeBelief(rdf_1.Rdf.pg(adoptedFieldBeliefsIri, pg.graph));
        return belief.map(function (belief) { return ({
            iri: Maybe.Just(pg.pointer),
            argumentType: ArgumentsApi_1.BeliefAdoptionType,
            title: rdf_1.Rdf.getValueFromPropertyPath([rdfs.label], pg).map(function (v) { return v.value; }).getOrElse(''),
            note: rdf_1.Rdf.getValueFromPropertyPath([vocabularies_1.crm.P3_has_note], pg).map(function (v) { return v.value; }).getOrElse(''),
            belief: belief,
        }); });
    }
}
function deserializeInference(pg) {
    var premiseIris = rdf_1.Rdf.getValuesFromPropertyPath([vocabularies_1.crminf.J1_used_as_premise], pg);
    return Kefir.combine(premiseIris.map(function (iri) { return deserializeBelief(rdf_1.Rdf.pg(iri, pg.graph)); })).map(function (premises) {
        var inference = {
            iri: Maybe.Just(pg.pointer),
            argumentType: ArgumentsApi_1.InferenceType,
            title: rdf_1.Rdf.getValueFromPropertyPath([rdfs.label], pg).map(function (v) { return v.value; }).getOrElse(''),
            note: rdf_1.Rdf.getValueFromPropertyPath([vocabularies_1.crm.P3_has_note], pg).map(function (v) { return v.value; }).getOrElse(''),
            logicType: rdf_1.Rdf.getValueFromPropertyPath([vocabularies_1.crminf.J3_applies], pg).getOrElse(undefined),
            premises: premises,
        };
        return inference;
    }).toProperty();
}
function deserializeBelief(pg) {
    var assertion = rdf_1.Rdf.getValueFromPropertyPath([vocabularies_1.rso.PX_premise_assertion], pg);
    if (assertion.isJust) {
        var assertionBelief = {
            iri: Maybe.Just(pg.pointer),
            beliefType: ArgumentsApi_1.BeliefTypeArgumentsKind,
            argumentBeliefType: ArgumentsApi_1.ArgumentsBeliefTypeAssertionKind,
            assertion: assertion.get(),
            belief: {
                type: 'simple',
                value: 'Agree',
            }
        };
        return Kefir.constant(assertionBelief);
    }
    else {
        var target_1 = rdf_1.Rdf.getValueFromPropertyPath([vocabularies_1.rso.PX_premise_target], pg).getOrElse(undefined);
        var field = rdf_1.Rdf.getValueFromPropertyPath([vocabularies_1.rso.PX_premise_field], pg).getOrElse(undefined);
        var repository_1 = rdf_1.Rdf.getValueFromPropertyPath([vocabularies_1.rso.PX_premise_target_repository], pg)
            .map(function (l) { return l.value; }).getOrElse(undefined);
        return FieldUtils_1.getArgumentsFieldDefinition(field).map(function (fieldDefition) {
            var fieldBelief = {
                iri: Maybe.Just(pg.pointer),
                beliefType: ArgumentsApi_1.BeliefTypeArgumentsKind,
                argumentBeliefType: ArgumentsApi_1.ArgumentsBeliefTypeFieldKind,
                target: target_1,
                field: fieldDefition,
                originRepository: repository_1,
                belief: {
                    type: 'simple',
                    value: 'Agree',
                }
            };
            return fieldBelief;
        });
    }
}
var container = ldp_1.ldpc(vocabularies_1.rso.ArgumentsContainer.value);
function saveArgument(argument) {
    var argumentIri = argument.iri.getOrElse(rdf_1.Rdf.iri("http://researchspace.org/instances/argument/" + uuid.v4()));
    var argumentPremises = getBeliefsForArgument(argumentIri, argument).map(function (beliefs) { return serializeArgument(argumentIri, argument, beliefs); });
    return argumentPremises.flatMap(function (argumentGraph) {
        return container.addResource(argumentGraph, Maybe.Just(argumentIri.value));
    });
}
exports.saveArgument = saveArgument;
function removeArgument(argument) {
    return container.deleteResource(argument.iri.get());
}
exports.removeArgument = removeArgument;
function getBeliefsForArgument(argumentIri, argument) {
    return ArgumentsApi_1.matchArgument({
        Inference: function (inference) {
            return Kefir.combine(inference.premises.map(BeliefsUtil_1.getBeliefGraphs)).map(function (x) { return _.flatten(x); }).toProperty();
        },
        BeliefAdoption: function (beliefAdoption) { return BeliefsUtil_1.getBeliefGraphs(beliefAdoption.belief); },
        Observation: function (o) { return Kefir.constant([]); },
    })(argument);
}
exports.getBeliefsForArgument = getBeliefsForArgument;
function serializeArgument(newArgumentIri, argument, beliefs) {
    var conclusionTriples = argument.conclusions.map(function (belief) { return rdf_1.Rdf.triple(rdf_1.Rdf.BASE_IRI, vocabularies_1.crminf.J2_concluded_that, belief); });
    var baseArgumentGraph = rdf_1.Rdf.graph.apply(rdf_1.Rdf, [rdf_1.Rdf.triple(rdf_1.Rdf.BASE_IRI, rdf_1.vocabularies.rdf.type, vocabularies_1.crminf.I1_Argumentation),
        rdf_1.Rdf.triple(rdf_1.Rdf.BASE_IRI, rdf_1.vocabularies.rdfs.label, rdf_1.Rdf.literal(argument.title)),
        rdf_1.Rdf.triple(rdf_1.Rdf.BASE_IRI, vocabularies_1.crm.P3_has_note, rdf_1.Rdf.literal(argument.note))].concat(conclusionTriples));
    var specificArgumentGraph = serializeSpecificArgument(argument, beliefs);
    return rdf_1.Rdf.union(baseArgumentGraph, specificArgumentGraph);
}
exports.serializeArgument = serializeArgument;
function serializeSpecificArgument(argument, beliefs) {
    return ArgumentsApi_1.matchArgument({
        Inference: function (i) { return serializeInference(i, beliefs); },
        BeliefAdoption: function (ba) { return serializeBeliefAdoption(ba, beliefs); },
        Observation: serializeObservation,
    })(argument);
}
exports.serializeSpecificArgument = serializeSpecificArgument;
function serializeBeliefAdoption(beliefAdoption, beliefs) {
    var triples = beliefs.map(function (belief) {
        return rdf_1.Rdf.triple(rdf_1.Rdf.BASE_IRI, vocabularies_1.crminf.J6_adopted, belief.pointer);
    });
    if (beliefAdoption.belief.argumentBeliefType === ArgumentsApi_1.ArgumentsBeliefTypeAssertionKind) {
        triples.push(rdf_1.Rdf.triple(rdf_1.Rdf.BASE_IRI, vocabularies_1.rso.PX_adopted_assertion, beliefAdoption.belief.assertion));
    }
    return rdf_1.Rdf.graph.apply(rdf_1.Rdf, [rdf_1.Rdf.triple(rdf_1.Rdf.BASE_IRI, rdf_1.vocabularies.rdf.type, vocabularies_1.crminf.I7_Belief_Adoption)].concat(_.flatMap(beliefs, function (b) { return b.graph.triples.toArray(); }), triples));
}
exports.serializeBeliefAdoption = serializeBeliefAdoption;
function serializeObservation(observation) {
    var observationTimePg = createObservationTimeSpan(observation);
    return rdf_1.Rdf.graph.apply(rdf_1.Rdf, [rdf_1.Rdf.triple(rdf_1.Rdf.BASE_IRI, rdf_1.vocabularies.rdf.type, vocabularies_1.crmsci.S19_Encounter_Event),
        rdf_1.Rdf.triple(rdf_1.Rdf.BASE_IRI, rdf_1.vocabularies.rdf.type, vocabularies_1.crmsci.S4_Observation),
        rdf_1.Rdf.triple(rdf_1.Rdf.BASE_IRI, vocabularies_1.crmsci.O21_has_found_at, observation.place),
        rdf_1.Rdf.triple(rdf_1.Rdf.BASE_IRI, vocabularies_1.crm.P4_has_time_span, observationTimePg.pointer)].concat(observationTimePg.graph.triples.toJS()));
}
exports.serializeObservation = serializeObservation;
function createObservationTimeSpan(observation) {
    var timeIri = rdf_1.Rdf.iri("/time/" + uuid.v4());
    var time = observation.date;
    var label = rdf_1.Rdf.literal(moment(observation.date.value).format('LL'));
    return rdf_1.Rdf.pg(timeIri, rdf_1.Rdf.graph(rdf_1.Rdf.triple(timeIri, vocabularies_1.crm.P82a_begin_of_the_begin, time), rdf_1.Rdf.triple(timeIri, vocabularies_1.crm.P82a_end_of_the_end, time), rdf_1.Rdf.triple(timeIri, rdf_1.vocabularies.rdfs.label, label), rdf_1.Rdf.triple(timeIri, vocabularies_1.rso.displayLabel, label)));
}
exports.createObservationTimeSpan = createObservationTimeSpan;
function serializeInference(inference, beliefs) {
    var premises = beliefs.map(function (beliefPg) { return rdf_1.Rdf.triple(rdf_1.Rdf.BASE_IRI, vocabularies_1.crminf.J1_used_as_premise, beliefPg.pointer); });
    return rdf_1.Rdf.graph.apply(rdf_1.Rdf, [rdf_1.Rdf.triple(rdf_1.Rdf.BASE_IRI, rdf_1.vocabularies.rdf.type, vocabularies_1.crminf.I5_Inference_Making),
        rdf_1.Rdf.triple(rdf_1.Rdf.BASE_IRI, vocabularies_1.crminf.J3_applies, inference.logicType)].concat(premises, _.flatMap(beliefs, function (b) { return b.graph.triples.toArray(); })));
}
exports.serializeInference = serializeInference;
var _a;
