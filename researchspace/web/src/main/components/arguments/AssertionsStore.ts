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

import * as Kefir from 'kefir';
import * as uuid from 'uuid';
import * as Maybe from 'data.maybe';
import * as moment from 'moment';
import * as _ from 'lodash';

import { Rdf, vocabularies } from 'platform/api/rdf';
const { rdfs } = vocabularies;

import { LdpService } from 'platform/api/services/ldp';
import { Util } from 'platform/api/services/security';

import { crm, rso, crminf } from 'researchspace/data/vocabularies/vocabularies';
import {
  Assertion, AssertedBeliefTypeKind,
} from './ArgumentsApi';
import { getArgumentsFieldDefinition } from './FieldUtils';

import { getBeliefGraphs } from './BeliefsUtil';

// Assertion restore
export function loadAssertion(iri: Rdf.Iri): Kefir.Property<Assertion> {
  return new LdpService(rso.AssertionsContainer.value).get(iri).flatMap(
    graph => deserializeAssertion(iri, graph)
  ).toProperty();
}

function deserializeAssertion(iri: Rdf.Iri, graph: Rdf.Graph): Kefir.Property<Assertion> {
  const pg = Rdf.pg(iri, graph);

  const target = Rdf.getValueFromPropertyPath<Rdf.Iri>([rso.targetsRecord], pg).getOrElse(undefined);
  const fieldIri =
    Rdf.getValueFromPropertyPath<Rdf.Iri>([rso.targetsField], pg).getOrElse(undefined);

  return getArgumentsFieldDefinition(fieldIri).map(
    field => {
      const beliefRoots = Rdf.getValuesFromPropertyPath<Rdf.Iri>([rso.PX_asserts], pg);
      const beliefs =
        beliefRoots.map(
          beliefIri => {
            const beliefPg = Rdf.pg(beliefIri, graph);
            return {
              iri: Maybe.Just(beliefIri),
              beliefType: AssertedBeliefTypeKind as typeof AssertedBeliefTypeKind,
              target: target,
              field: field,
              targetValue: Rdf.getValueFromPropertyPath([rso.PX_asserts_value], beliefPg).getOrElse(undefined),
              isCanonical: Rdf.getValueFromPropertyPath([rso.PX_is_canonical_value], beliefPg).map(v => v.value === 'true').getOrElse(false),
              originRepository: 'default',
              belief: {
                type: 'simple' as 'simple',
                value: Rdf.getValueFromPropertyPath([crminf.J5_holds_to_be], beliefPg).map(v => v.value).getOrElse(undefined) as any,
              }
            };
          }
        );

      const assertion: Assertion = {
        iri: Maybe.Just(iri),
        title: Rdf.getValueFromPropertyPath([rdfs.label], pg).map(v => v.value).getOrElse(''),
        note: Rdf.getValueFromPropertyPath([crm.P3_has_note], pg).map(v => v.value).getOrElse(''),
        narrative: Rdf.getValueFromPropertyPath<Rdf.Iri>([crm.P70i_is_documented_in], pg).getOrElse(undefined),
        target: target,
        field: field,
        beliefs: beliefs,
      };

      return assertion;
    }
  );
}

// Assertion saving
export interface SavedAssertion {
  assertion: Rdf.Iri;
  beliefs: Array<Rdf.Node>;
}

export function saveAssertion(
  assertion: Assertion
): Kefir.Property<SavedAssertion> {
  return Kefir.fromPromise(Util.getUser()).toProperty().flatMap(
    user =>
      evaluate({
        user: Rdf.iri(user.userURI),
      })(assertion)
    ).toProperty();
  }

interface EvaluationContext {
  user: Rdf.Iri;
}

export function evaluate(context: EvaluationContext) {
  return (assertion: Assertion) => {
    const assertionIri = assertion.iri.getOrElse(
      Rdf.iri(`${assertion.field.iri}/assertion/${uuid.v4()}`)
    );
    return Kefir.combine(
      _.map(assertion.beliefs, getBeliefGraphs)
    ).map<[Rdf.PointedGraph, Array<Rdf.Node>]>(
      beliefGraphs => {
        const allBeliefs = _.flatten(beliefGraphs);
        return [
          evaluateAssertion(context, assertionIri)(assertion, allBeliefs),
          _.map(allBeliefs, b => b.pointer)
        ];
      }
    ).flatMap(
      ([assertionPg, bs]) => {
        const service = new LdpService(rso.AssertionsContainer.value);
        if (assertion.iri.isJust) {
          return service.update(assertion.iri.get(), assertionPg.graph).map(
            _ => ({assertion: assertion.iri.get(), beliefs: bs})
          );
        } else {
          return new LdpService(rso.AssertionsContainer.value).addResource(
            assertionPg.graph, Maybe.Just(assertionIri.value)
          ).map(
            iri => ({assertion: iri, beliefs: bs})
          );
        }
      }
    );
  };
}

function evaluateAssertion(context: EvaluationContext, baseIri: Rdf.Iri) {
  return (
    assertion: Assertion, beliefsPgs: Array<Rdf.PointedGraph>
  ): Rdf.PointedGraph => {
    const assertionIri = Rdf.BASE_IRI;
    const beliefsTriples =
      _.map(beliefsPgs,
        beliefPg =>
          Rdf.union(
            Rdf.graph([
              Rdf.triple(assertionIri, rso.PX_asserts, beliefPg.pointer),
            ]),
            beliefPg.graph
          )
      );
    const assertionTimePg = createAssertionTimeSpan();
    const triples = [
      Rdf.triple(assertionIri, vocabularies.rdf.type, rso.EX_Assertion),
      Rdf.triple(assertionIri, vocabularies.rdfs.label, Rdf.literal(assertion.title)),
      Rdf.triple(assertionIri, crm.P3_has_note, Rdf.literal(assertion.note)),
      Rdf.triple(assertionIri, rso.targetsField, Rdf.iri(assertion.field.iri)),
      Rdf.triple(assertionIri, rso.targetsRecord, assertion.target),
      Rdf.triple(assertionIri, crm.P14_carried_out_by, context.user),
      Rdf.triple(assertionIri, crm.P4_has_time_span, assertionTimePg.pointer),
      ...Rdf.union(...beliefsTriples).triples.toJS(),
      ...assertionTimePg.graph.triples.toJS()
    ];

    if (assertion.narrative) {
      triples.push(
        Rdf.triple(assertionIri, crm.P70i_is_documented_in, assertion.narrative)
      );
    }

    return Rdf.pg(assertionIri, Rdf.graph(triples));
  };
}

function createAssertionTimeSpan(): Rdf.PointedGraph {
  const timeIri = Rdf.iri(`/time/${uuid.v4()}`);
  const time = moment();
  const timeLiteral = Rdf.literal(time.toISOString(), vocabularies.xsd.dateTime);
  const label = Rdf.literal(time.format('LL'));
  return Rdf.pg(
    timeIri,
    Rdf.graph([
      Rdf.triple(timeIri, crm.P82a_begin_of_the_begin, timeLiteral),
      Rdf.triple(timeIri, crm.P82a_end_of_the_end, timeLiteral),
      Rdf.triple(timeIri, rso.displayLabel, label),
      Rdf.triple(timeIri, vocabularies.rdfs.label, label),
    ])
  );
}
