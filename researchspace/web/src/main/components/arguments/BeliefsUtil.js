Object.defineProperty(exports, "__esModule", { value: true });
var uuid = require("uuid");
var maybe = require("data.maybe");
var _ = require("lodash");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var ldp_1 = require("platform/api/services/ldp");
var vocabularies_1 = require("researchspace/data/vocabularies/vocabularies");
var ArgumentsApi_1 = require("./ArgumentsApi");
function getBeliefGraphs(belief) {
    return ArgumentsApi_1.matchBelief({
        AssertedBelief: function (b) { return getBeliefGraphForAssertedBelief(b).map(function (pg) { return [pg]; }); },
        ArgumentsBelief: function (b) { return getBeliefGraphForArgumentsBelief(b); },
    })(belief);
}
exports.getBeliefGraphs = getBeliefGraphs;
function getBeliefGraphForAssertedBelief(belief) {
    return propSetForAssertedBelief(belief).flatMap(function (propSet) {
        return savePropositionSet(propSet, belief).map(function (propSetIri) { return serializeBelief(belief, propSetIri); });
    }).toProperty();
}
function getBeliefGraphForArgumentsBelief(belief) {
    return ArgumentsApi_1.matchArgumentsBelief({
        AssertionBelief: function (b) { return getBeliefsForAssertion(b.assertion); },
        FieldBelief: function (b) { return getBeliefsForField(b).map(function (x) { return [x]; }); },
    })(belief);
}
function getBeliefsForField(belief) {
    return propSetForArgumentsBelief(belief).flatMap(function (propSet) {
        return savePropositionSet(propSet, belief).map(function (propSetIri) { return serializeBelief(belief, propSetIri); });
    }).toProperty();
}
function serializeBelief(belief, propSetIri) {
    var beliefIri = createBeliefIri(belief);
    var label = createBeliefLabel(belief);
    var triples = [
        rdf_1.Rdf.triple(beliefIri, rdf_1.vocabularies.rdf.type, vocabularies_1.crminf.I2_Belief),
        rdf_1.Rdf.triple(beliefIri, vocabularies_1.crminf.J4_that, propSetIri),
        rdf_1.Rdf.triple(beliefIri, vocabularies_1.crminf.J5_holds_to_be, rdf_1.Rdf.literal(belief.belief.value)),
        rdf_1.Rdf.triple(beliefIri, rdf_1.vocabularies.rdfs.label, rdf_1.Rdf.literal(label))
    ];
    if (belief.beliefType === ArgumentsApi_1.AssertedBeliefTypeKind) {
        triples.push(rdf_1.Rdf.triple(beliefIri, vocabularies_1.rso.PX_asserts_value, belief.targetValue), rdf_1.Rdf.triple(beliefIri, vocabularies_1.rso.PX_is_canonical_value, rdf_1.Rdf.literal(belief.isCanonical)));
    }
    else {
        if (belief.argumentBeliefType === ArgumentsApi_1.ArgumentsBeliefTypeAssertionKind) {
            triples.push(rdf_1.Rdf.triple(beliefIri, vocabularies_1.rso.PX_premise_assertion, belief.assertion));
        }
        else {
            triples.push(rdf_1.Rdf.triple(beliefIri, vocabularies_1.rso.PX_premise_target, belief.target), rdf_1.Rdf.triple(beliefIri, vocabularies_1.rso.PX_premise_field, rdf_1.Rdf.iri(belief.field.iri)), rdf_1.Rdf.triple(beliefIri, vocabularies_1.rso.PX_premise_target_repository, rdf_1.Rdf.literal(belief.originRepository)));
        }
    }
    return rdf_1.Rdf.pg(beliefIri, rdf_1.Rdf.graph(triples));
}
;
function propSetForArgumentsBelief(belief) {
    var query = buildQueryForArgumentsBelief(sparql_1.SparqlUtil.parseQuerySync(belief.field.insertPattern));
    return sparql_1.SparqlClient.construct(sparql_1.SparqlClient.setBindings(query, { 'subject': belief.target }));
}
function buildQueryForArgumentsBelief(insertQuery) {
    var operation = insertQuery.updates[0];
    return {
        prefixes: insertQuery.prefixes,
        type: 'query',
        queryType: 'CONSTRUCT',
        template: operation.insert[0].triples,
        where: [{
                type: 'bgp',
                triples: operation.insert[0].triples,
            }],
    };
}
function propSetForAssertedBelief(belief) {
    var query = buildQueryForAssertedBelief(sparql_1.SparqlUtil.parseQuerySync(belief.field.insertPattern), belief.isCanonical);
    return sparql_1.SparqlClient.construct(sparql_1.SparqlClient.setBindings(query, { 'subject': belief.target, 'value': belief.targetValue }));
}
function buildQueryForAssertedBelief(insertQuery, isCanonicalValue) {
    var operation = insertQuery.updates[0];
    return {
        prefixes: insertQuery.prefixes,
        type: 'query',
        queryType: 'CONSTRUCT',
        template: operation.insert[0].triples,
        where: isCanonicalValue ? [] : _.cloneDeep(operation.where),
    };
}
function getBeliefsForAssertion(assertionIri) {
    return ldp_1.ldpc(vocabularies_1.rso.AssertionsContainer.value).get(assertionIri).map(function (graph) {
        return _.map(rdf_1.Rdf.getValuesFromPropertyPath([vocabularies_1.rso.PX_asserts], rdf_1.Rdf.pg(assertionIri, graph)), function (belief) { return rdf_1.Rdf.pg(belief, rdf_1.Rdf.graph(rdf_1.Rdf.triple(belief, vocabularies_1.rso.PX_premise_assertion, assertionIri))); });
    });
}
function savePropositionSet(propositions, belief) {
    var propositionSetIri = createPropositionIri(createBeliefIri(belief));
    var propositionSetGraph = serializePropSet(belief, propositions);
    return ldp_1.ldpc(vocabularies_1.rso.PropositionsContainer.value).addResource(propositionSetGraph, maybe.Just(propositionSetIri.value));
}
function serializePropSet(belief, proposition) {
    var propositionSetIri = rdf_1.Rdf.iri('');
    return rdf_1.Rdf.graph.apply(rdf_1.Rdf, [rdf_1.Rdf.triple(propositionSetIri, rdf_1.vocabularies.rdf.type, vocabularies_1.crminf.I4_Proposition_Set),
        rdf_1.Rdf.triple(propositionSetIri, rdf_1.vocabularies.rdfs.label, rdf_1.Rdf.literal('Proposition Set'))].concat(proposition));
}
;
function createBeliefIri(belief) {
    return belief.iri.getOrElse(rdf_1.Rdf.iri("http://researchspace.org/instances/belief/" + uuid.v4()));
}
function createPropositionIri(beliefIri) {
    return rdf_1.Rdf.iri(beliefIri.value + "/proposition");
}
function createBeliefLabel(belief) {
    return 'Belief';
}
exports.createBeliefLabel = createBeliefLabel;
