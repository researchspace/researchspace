/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

import * as Maybe from 'data.maybe';
import * as uuid from 'uuid';
import * as Kefir from 'kefir';
import * as _ from 'lodash';
import * as moment from 'moment';

import { Rdf, vocabularies} from 'platform/api/rdf';
const { rdf, rdfs } = vocabularies;
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { ldpc } from 'platform/api/services/ldp';

import { rso, crm, crminf, crmsci } from 'researchspace/data/vocabularies/vocabularies';

import {
  Argument, Inference, BeliefAdoption, Observation,
  matchArgument, ObservationType, BeliefAdoptionType, InferenceType,
  ArgumentsBeliefTypeFieldKind, ArgumentsBeliefTypeAssertionKind,
  BeliefTypeArgumentsKind, ArgumentsAssertionBelief, ArgumentsFieldBelief,
  ArgumentsBelief,
} from './ArgumentsApi';
import { getArgumentsFieldDefinition } from './FieldUtils';
import { getBeliefGraphs } from './BeliefsUtil';

const assertionContainer = ldpc(rso.ArgumentsContainer.value);
export function loadArgumentsForAssertion(assertionIri: Rdf.Iri): Kefir.Property<Array<Argument>> {
  return findArgumentsForAssertion(assertionIri).flatMap(
    argumentIris => {
      if (_.isEmpty(argumentIris)) {
        return Kefir.constant([]);
      } else {
        return Kefir.combine(
          _.map(argumentIris, iri => assertionContainer.get(iri).map(graph => Rdf.pg(iri, graph)))
        );
      }
    }
  ).flatMap(
    graphs => {
      if (_.isEmpty(graphs)) {
        return Kefir.constant([]);
      } else {
        return Kefir.combine(_.map(graphs, deserializeArgument));
      }
    }
  ).toProperty();
}

const FIND_ARGUMENTS_QUERY = SparqlUtil.Sparql`
  SELECT DISTINCT ?argument WHERE {
    ?__assertion__ <http://www.researchspace.org/ontology/PX_asserts> ?belief .
    ?argument <http://www.ics.forth.gr/isl/CRMinf/J2_concluded_that> ?belief .
  }
`;
function findArgumentsForAssertion(assertionIri: Rdf.Iri): Kefir.Property<Array<Rdf.Iri>> {
  const query =
    SparqlClient.setBindings(FIND_ARGUMENTS_QUERY, {'__assertion__': assertionIri});
  return SparqlClient.select(
    query, {context: {repository: 'assets'}}
  ).map(res => res.results.bindings.map(b => b['argument'] as Rdf.Iri));
}

function deserializeArgument(pg: Rdf.PointedGraph): Kefir.Property<Argument> {
  const types = Rdf.getValuesFromPropertyPath<Rdf.Iri>([rdf.type], pg);
  if (_.some(types, t => t.equals(crmsci.S19_Encounter_Event))) {
    return Kefir.constant(deserializeObservation(pg));
  } else if (_.some(types, t => t.equals(crminf.I7_Belief_Adoption))) {
    return deserializeBeliefAdoption(pg);
  } else {
    return deserializeInference(pg);
  }
}

function deserializeObservation(pg: Rdf.PointedGraph): Observation {
  return {
    iri: Maybe.Just(pg.pointer as Rdf.Iri),
    argumentType: ObservationType,
    title: Rdf.getValueFromPropertyPath([rdfs.label], pg).map(v => v.value).getOrElse(''),
    note: Rdf.getValueFromPropertyPath([crm.P3_has_note], pg).map(v => v.value).getOrElse(''),
    place: Rdf.getValueFromPropertyPath<Rdf.Iri>([crmsci.O21_has_found_at], pg).getOrElse(undefined),
    date: Rdf.getValueFromPropertyPath<Rdf.Literal>(
      [crm.P4_has_time_span, crm.P82a_begin_of_the_begin], pg
    ).getOrElse(undefined),
  };
}

function deserializeBeliefAdoption(pg: Rdf.PointedGraph): Kefir.Property<BeliefAdoption> {
  const adoptedBeliefAssertion =
    Rdf.getValueFromPropertyPath<Rdf.Iri>([rso.PX_adopted_assertion], pg);

  if (adoptedBeliefAssertion.isJust) {
    return Kefir.constant({
      iri: Maybe.Just(pg.pointer),
      argumentType: BeliefAdoptionType,
      title: Rdf.getValueFromPropertyPath([rdfs.label], pg).map(v => v.value).getOrElse(''),
      note: Rdf.getValueFromPropertyPath([crm.P3_has_note], pg).map(v => v.value).getOrElse(''),
      belief: {
        iri: adoptedBeliefAssertion,
        beliefType: BeliefTypeArgumentsKind,
        argumentBeliefType: ArgumentsBeliefTypeAssertionKind,
        assertion: adoptedBeliefAssertion.get(),
        belief: {
          type: 'simple',
          value: 'Agree',
        }
      },
    } as BeliefAdoption);
  } else {
    const adoptedFieldBeliefsIri =
      _.head(
        Rdf.getValuesFromPropertyPath<Rdf.Iri>([crminf.J6_adopted], pg)
      );
    const belief = deserializeBelief(Rdf.pg(adoptedFieldBeliefsIri, pg.graph));
    return belief.map(
      (belief: ArgumentsFieldBelief) => ({
        iri: Maybe.Just(pg.pointer),
        argumentType: BeliefAdoptionType,
        title: Rdf.getValueFromPropertyPath([rdfs.label], pg).map(v => v.value).getOrElse(''),
        note: Rdf.getValueFromPropertyPath([crm.P3_has_note], pg).map(v => v.value).getOrElse(''),
        belief: belief,
      } as BeliefAdoption)
    );
  }
}

function deserializeInference(pg: Rdf.PointedGraph): Kefir.Property<Inference> {
  const premiseIris = Rdf.getValuesFromPropertyPath<Rdf.Iri>([crminf.J1_used_as_premise], pg);
  return Kefir.combine(premiseIris.map(iri => deserializeBelief(Rdf.pg(iri, pg.graph)))).map(
    premises => {
      const inference: Inference = {
        iri: Maybe.Just(pg.pointer as Rdf.Iri),
        argumentType: InferenceType,
        title: Rdf.getValueFromPropertyPath([rdfs.label], pg).map(v => v.value).getOrElse(''),
        note: Rdf.getValueFromPropertyPath([crm.P3_has_note], pg).map(v => v.value).getOrElse(''),
        logicType: Rdf.getValueFromPropertyPath<Rdf.Iri>([crminf.J3_applies], pg).getOrElse(undefined),
        premises: premises,
      };
      return inference;
    }
  ).toProperty();
}

function deserializeBelief(pg: Rdf.PointedGraph): Kefir.Property<ArgumentsBelief> {
  const assertion = Rdf.getValueFromPropertyPath<Rdf.Iri>([rso.PX_premise_assertion], pg);
  if (assertion.isJust) {
    const assertionBelief: ArgumentsAssertionBelief = {
      iri: Maybe.Just(pg.pointer as Rdf.Iri),
      beliefType: BeliefTypeArgumentsKind,
      argumentBeliefType: ArgumentsBeliefTypeAssertionKind,
      assertion: assertion.get(),
      belief: {
        type: 'simple',
        value: 'Agree',
      }
    };
    return Kefir.constant(assertionBelief);
  } else {
    const target =
      Rdf.getValueFromPropertyPath<Rdf.Iri>([rso.PX_premise_target], pg).getOrElse(undefined);
    const field =
      Rdf.getValueFromPropertyPath<Rdf.Iri>([rso.PX_premise_field], pg).getOrElse(undefined);
    const repository =
      Rdf.getValueFromPropertyPath<Rdf.Literal>([rso.PX_premise_target_repository], pg)
      .map(l => l.value).getOrElse(undefined);
    return getArgumentsFieldDefinition(field).map(
      fieldDefition => {
        const fieldBelief: ArgumentsFieldBelief = {
          iri: Maybe.Just(pg.pointer as Rdf.Iri),
          beliefType: BeliefTypeArgumentsKind,
          argumentBeliefType: ArgumentsBeliefTypeFieldKind,
          target: target,
          field: fieldDefition,
          originRepository: repository,
          belief: {
            type: 'simple',
            value: 'Agree',
          }
        };
        return fieldBelief;
      }
    );
  }
}


const container = ldpc(
  rso.ArgumentsContainer.value
);

export function saveArgument(argument: Argument) {
  const argumentIri = argument.iri.getOrElse(
    Rdf.iri(`http://researchspace.org/instances/argument/${uuid.v4()}`)
  );
  const argumentPremises =
    getBeliefsForArgument(argumentIri, argument).map(
      beliefs => serializeArgument(argumentIri, argument, beliefs)
    );

  return argumentPremises.flatMap(
    argumentGraph =>
      container.addResource(
        argumentGraph, Maybe.Just(argumentIri.value)
      )
  );
}

export function removeArgument(argument: Argument): Kefir.Property<{}> {
  return container.deleteResource(argument.iri.get());
}

export function getBeliefsForArgument(
  argumentIri: Rdf.Iri, argument: Argument
): Kefir.Property<Array<Rdf.PointedGraph>> {
  return matchArgument({
    Inference: inference =>
      Kefir.combine(
        inference.premises.map(getBeliefGraphs)
      ).map(x => _.flatten(x)).toProperty(),
    BeliefAdoption: beliefAdoption => getBeliefGraphs(beliefAdoption.belief),
    Observation: o => Kefir.constant<Array<Rdf.PointedGraph>>([]),
  })(argument);
}

export function serializeArgument(
  newArgumentIri: Rdf.Iri, argument: Argument, beliefs: Array<Rdf.PointedGraph>
): Rdf.Graph {
  const conclusionTriples =
    argument.conclusions.map(
      belief => Rdf.triple(Rdf.BASE_IRI, crminf.J2_concluded_that, belief)
    );

  const baseArgumentGraph =
      Rdf.graph([
        Rdf.triple(Rdf.BASE_IRI, vocabularies.rdf.type, crminf.I1_Argumentation),
        Rdf.triple(Rdf.BASE_IRI, vocabularies.rdfs.label, Rdf.literal(argument.title)),
        Rdf.triple(Rdf.BASE_IRI, crm.P3_has_note, Rdf.literal(argument.note)),
        ...conclusionTriples,
      ]);

  const specificArgumentGraph =
    serializeSpecificArgument(argument, beliefs);

  return Rdf.union(baseArgumentGraph, specificArgumentGraph);
}

export function serializeSpecificArgument(
  argument: Argument, beliefs: Array<Rdf.PointedGraph>
): Rdf.Graph {
  return matchArgument({
    Inference: i => serializeInference(i, beliefs),
    BeliefAdoption: ba => serializeBeliefAdoption(ba, beliefs),
    Observation: serializeObservation,
  })(argument);
}

export function serializeBeliefAdoption(
  beliefAdoption: BeliefAdoption, beliefs: Array<Rdf.PointedGraph>
): Rdf.Graph {
  const triples =
      beliefs.map(
        belief =>
            Rdf.triple(Rdf.BASE_IRI, crminf.J6_adopted, belief.pointer)
      );

  if (beliefAdoption.belief.argumentBeliefType === ArgumentsBeliefTypeAssertionKind) {
    triples.push(
      Rdf.triple(Rdf.BASE_IRI, rso.PX_adopted_assertion, beliefAdoption.belief.assertion)
    );
  }

  return Rdf.graph([
    Rdf.triple(Rdf.BASE_IRI, vocabularies.rdf.type, crminf.I7_Belief_Adoption),
    ..._.flatMap(beliefs, b => b.graph.triples.toArray()),
    ...triples,
  ]);
}


export function serializeObservation(observation: Observation): Rdf.Graph {
  const observationTimePg = createObservationTimeSpan(observation);
  return Rdf.graph([
    Rdf.triple(Rdf.BASE_IRI, vocabularies.rdf.type, crmsci.S19_Encounter_Event),
    Rdf.triple(Rdf.BASE_IRI, vocabularies.rdf.type, crmsci.S4_Observation),
    Rdf.triple(Rdf.BASE_IRI, crmsci.O21_has_found_at, observation.place),
    Rdf.triple(Rdf.BASE_IRI, crm.P4_has_time_span, observationTimePg.pointer),
    ...observationTimePg.graph.triples.toJS(),
  ]);
}

export function createObservationTimeSpan(observation: Observation): Rdf.PointedGraph {
  const timeIri = Rdf.iri(`/time/${uuid.v4()}`);
  const time = observation.date;
  const label = Rdf.literal(moment(observation.date.value).format('LL'));
  return Rdf.pg(
    timeIri,
    Rdf.graph([
      Rdf.triple(timeIri, crm.P82a_begin_of_the_begin, time),
      Rdf.triple(timeIri, crm.P82a_end_of_the_end, time),
      Rdf.triple(timeIri, vocabularies.rdfs.label, label),
      Rdf.triple(timeIri, rso.displayLabel, label),
    ])
  );
}

export function serializeInference(
  inference: Inference, beliefs: Array<Rdf.PointedGraph>
): Rdf.Graph {
  const premises =
      beliefs.map(
        beliefPg => Rdf.triple(Rdf.BASE_IRI, crminf.J1_used_as_premise, beliefPg.pointer)
      );
  return Rdf.graph([
    Rdf.triple(Rdf.BASE_IRI, vocabularies.rdf.type, crminf.I5_Inference_Making),
    Rdf.triple(Rdf.BASE_IRI, crminf.J3_applies, inference.logicType),
    ...premises,
    ..._.flatMap(beliefs, b => b.graph.triples.toArray()),
  ]);
}
