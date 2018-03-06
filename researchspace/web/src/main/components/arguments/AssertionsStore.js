Object.defineProperty(exports, "__esModule", { value: true });
var Kefir = require("kefir");
var uuid = require("uuid");
var Maybe = require("data.maybe");
var moment = require("moment");
var _ = require("lodash");
var rdf_1 = require("platform/api/rdf");
var rdfs = rdf_1.vocabularies.rdfs;
var ldp_1 = require("platform/api/services/ldp");
var security_1 = require("platform/api/services/security");
var vocabularies_1 = require("researchspace/data/vocabularies/vocabularies");
var ArgumentsApi_1 = require("./ArgumentsApi");
var FieldUtils_1 = require("./FieldUtils");
var BeliefsUtil_1 = require("./BeliefsUtil");
function loadAssertion(iri) {
    return new ldp_1.LdpService(vocabularies_1.rso.AssertionsContainer.value).get(iri).flatMap(function (graph) { return deserializeAssertion(iri, graph); }).toProperty();
}
exports.loadAssertion = loadAssertion;
function deserializeAssertion(iri, graph) {
    var pg = rdf_1.Rdf.pg(iri, graph);
    var target = rdf_1.Rdf.getValueFromPropertyPath([vocabularies_1.rso.targetsRecord], pg).getOrElse(undefined);
    var fieldIri = rdf_1.Rdf.getValueFromPropertyPath([vocabularies_1.rso.targetsField], pg).getOrElse(undefined);
    return FieldUtils_1.getArgumentsFieldDefinition(fieldIri).map(function (field) {
        var beliefRoots = rdf_1.Rdf.getValuesFromPropertyPath([vocabularies_1.rso.PX_asserts], pg);
        var beliefs = beliefRoots.map(function (beliefIri) {
            var beliefPg = rdf_1.Rdf.pg(beliefIri, graph);
            return {
                iri: Maybe.Just(beliefIri),
                beliefType: ArgumentsApi_1.AssertedBeliefTypeKind,
                target: target,
                field: field,
                targetValue: rdf_1.Rdf.getValueFromPropertyPath([vocabularies_1.rso.PX_asserts_value], beliefPg).getOrElse(undefined),
                isCanonical: rdf_1.Rdf.getValueFromPropertyPath([vocabularies_1.rso.PX_is_canonical_value], beliefPg).map(function (v) { return v.value === 'true'; }).getOrElse(false),
                originRepository: 'default',
                belief: {
                    type: 'simple',
                    value: rdf_1.Rdf.getValueFromPropertyPath([vocabularies_1.crminf.J5_holds_to_be], beliefPg).map(function (v) { return v.value; }).getOrElse(undefined),
                }
            };
        });
        var assertion = {
            iri: Maybe.Just(iri),
            title: rdf_1.Rdf.getValueFromPropertyPath([rdfs.label], pg).map(function (v) { return v.value; }).getOrElse(''),
            note: rdf_1.Rdf.getValueFromPropertyPath([vocabularies_1.crm.P3_has_note], pg).map(function (v) { return v.value; }).getOrElse(''),
            narrative: rdf_1.Rdf.getValueFromPropertyPath([vocabularies_1.crm.P70i_is_documented_in], pg).getOrElse(undefined),
            target: target,
            field: field,
            beliefs: beliefs,
        };
        return assertion;
    });
}
function saveAssertion(assertion) {
    return Kefir.fromPromise(security_1.Util.getUser()).toProperty().flatMap(function (user) {
        return evaluate({
            user: rdf_1.Rdf.iri(user.userURI),
        })(assertion);
    }).toProperty();
}
exports.saveAssertion = saveAssertion;
function evaluate(context) {
    return function (assertion) {
        var assertionIri = assertion.iri.getOrElse(rdf_1.Rdf.iri(assertion.field.iri + "/assertion/" + uuid.v4()));
        return Kefir.combine(_.map(assertion.beliefs, BeliefsUtil_1.getBeliefGraphs)).map(function (beliefGraphs) {
            var allBeliefs = _.flatten(beliefGraphs);
            return [
                evaluateAssertion(context, assertionIri)(assertion, allBeliefs),
                _.map(allBeliefs, function (b) { return b.pointer; })
            ];
        }).flatMap(function (_a) {
            var assertionPg = _a[0], bs = _a[1];
            var service = new ldp_1.LdpService(vocabularies_1.rso.AssertionsContainer.value);
            if (assertion.iri.isJust) {
                return service.update(assertion.iri.get(), assertionPg.graph).map(function (_) { return ({ assertion: assertion.iri.get(), beliefs: bs }); });
            }
            else {
                return new ldp_1.LdpService(vocabularies_1.rso.AssertionsContainer.value).addResource(assertionPg.graph, Maybe.Just(assertionIri.value)).map(function (iri) { return ({ assertion: iri, beliefs: bs }); });
            }
        });
    };
}
exports.evaluate = evaluate;
function evaluateAssertion(context, baseIri) {
    return function (assertion, beliefsPgs) {
        var assertionIri = rdf_1.Rdf.BASE_IRI;
        var beliefsTriples = _.map(beliefsPgs, function (beliefPg) {
            return rdf_1.Rdf.union(rdf_1.Rdf.graph(rdf_1.Rdf.triple(assertionIri, vocabularies_1.rso.PX_asserts, beliefPg.pointer)), beliefPg.graph);
        });
        var assertionTimePg = createAssertionTimeSpan();
        var triples = [
            rdf_1.Rdf.triple(assertionIri, rdf_1.vocabularies.rdf.type, vocabularies_1.rso.EX_Assertion),
            rdf_1.Rdf.triple(assertionIri, rdf_1.vocabularies.rdfs.label, rdf_1.Rdf.literal(assertion.title)),
            rdf_1.Rdf.triple(assertionIri, vocabularies_1.crm.P3_has_note, rdf_1.Rdf.literal(assertion.note)),
            rdf_1.Rdf.triple(assertionIri, vocabularies_1.rso.targetsField, rdf_1.Rdf.iri(assertion.field.iri)),
            rdf_1.Rdf.triple(assertionIri, vocabularies_1.rso.targetsRecord, assertion.target),
            rdf_1.Rdf.triple(assertionIri, vocabularies_1.crm.P14_carried_out_by, context.user),
            rdf_1.Rdf.triple(assertionIri, vocabularies_1.crm.P4_has_time_span, assertionTimePg.pointer)
        ].concat(rdf_1.Rdf.union.apply(rdf_1.Rdf, beliefsTriples).triples.toJS(), assertionTimePg.graph.triples.toJS());
        if (assertion.narrative) {
            triples.push(rdf_1.Rdf.triple(assertionIri, vocabularies_1.crm.P70i_is_documented_in, assertion.narrative));
        }
        return rdf_1.Rdf.pg(assertionIri, rdf_1.Rdf.graph(triples));
    };
}
function createAssertionTimeSpan() {
    var timeIri = rdf_1.Rdf.iri("/time/" + uuid.v4());
    var time = moment();
    var timeLiteral = rdf_1.Rdf.literal(time.toISOString(), rdf_1.vocabularies.xsd.dateTime);
    var label = rdf_1.Rdf.literal(time.format('LL'));
    return rdf_1.Rdf.pg(timeIri, rdf_1.Rdf.graph(rdf_1.Rdf.triple(timeIri, vocabularies_1.crm.P82a_begin_of_the_begin, timeLiteral), rdf_1.Rdf.triple(timeIri, vocabularies_1.crm.P82a_end_of_the_end, timeLiteral), rdf_1.Rdf.triple(timeIri, vocabularies_1.rso.displayLabel, label), rdf_1.Rdf.triple(timeIri, rdf_1.vocabularies.rdfs.label, label)));
}
