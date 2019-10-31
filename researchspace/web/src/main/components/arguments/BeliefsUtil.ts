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
import * as maybe from 'data.maybe';
import * as _ from 'lodash';
import * as SparqlJs from 'sparqljs';

import { Rdf, vocabularies } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { ldpc } from 'platform/api/services/ldp';

import { crminf, rso } from 'researchspace/data/vocabularies/vocabularies';
import {
  AssertedBelief, ArgumentsBelief, PropositionSet, Belief, matchBelief, matchArgumentsBelief,
  ArgumentsFieldBelief, AssertedBeliefTypeKind, ArgumentsBeliefTypeAssertionKind,
  ArgumentsBeliefTypeFieldKind,
} from './ArgumentsApi';

export function getBeliefGraphs(belief: Belief): Kefir.Property<Array<Rdf.PointedGraph>> {
  return matchBelief({
    AssertedBelief: b => getBeliefGraphForAssertedBelief(b).map(pg => [pg]),
    ArgumentsBelief: b => getBeliefGraphForArgumentsBelief(b),
  })(belief);
}

function getBeliefGraphForAssertedBelief(
  belief: AssertedBelief,
): Kefir.Property<Rdf.PointedGraph> {
  return propSetForAssertedBelief(belief).flatMap(
    propSet =>
      savePropositionSet(propSet, belief).map(
        propSetIri => serializeBelief(belief, propSetIri)
      )
  ).toProperty();
}

/**
 * Premise for inference making can be only crminf:Belief or rso:EX_Assertion
 * (which contains beliefs).
 * To use other object as a premise we need to construct a belief out of it.
 * e.g in case of a digital image as a Premise we construct belief that object
 * has this image as a representation.
 */
function getBeliefGraphForArgumentsBelief(
  belief: ArgumentsBelief,
): Kefir.Property<Array<Rdf.PointedGraph>> {
  return matchArgumentsBelief({
    AssertionBelief: b => getBeliefsForAssertion(b.assertion),
    FieldBelief: b => getBeliefsForField(b).map(x => [x]),
  })(belief);
}

function getBeliefsForField(
  belief: ArgumentsFieldBelief
): Kefir.Property<Rdf.PointedGraph> {
  return propSetForArgumentsBelief(belief).flatMap(
    propSet =>
      savePropositionSet(propSet, belief).map(
        propSetIri => serializeBelief(belief, propSetIri)
      )
  ).toProperty();
}

function serializeBelief(
  belief: Belief, propSetIri: Rdf.Iri
): Rdf.PointedGraph {
  const beliefIri = createBeliefIri(belief);
  const label = createBeliefLabel(belief);
  const triples = [
    Rdf.triple(beliefIri, vocabularies.rdf.type, crminf.I2_Belief),
    Rdf.triple(beliefIri, crminf.J4_that, propSetIri),
    Rdf.triple(beliefIri, crminf.J5_holds_to_be, Rdf.literal(belief.belief.value)),
    Rdf.triple(beliefIri, vocabularies.rdfs.label, Rdf.literal(label))
  ];

  if (belief.beliefType === AssertedBeliefTypeKind) {
    triples.push(
      Rdf.triple(beliefIri, rso.PX_asserts_value, belief.targetValue),
      Rdf.triple(beliefIri, rso.PX_is_canonical_value, Rdf.literal(belief.isCanonical))
    );
  } else {
    if (belief.argumentBeliefType === ArgumentsBeliefTypeAssertionKind) {
      triples.push(
        Rdf.triple(beliefIri, rso.PX_premise_assertion, belief.assertion)
      );
    } else {
      triples.push(
        Rdf.triple(beliefIri, rso.PX_premise_target, belief.target),
        Rdf.triple(beliefIri, rso.PX_premise_field, Rdf.iri(belief.field.iri)),
        Rdf.triple(beliefIri, rso.PX_premise_target_repository, Rdf.literal(belief.originRepository))
      );
    }
  }

  return Rdf.pg(beliefIri, Rdf.graph(triples));
};

function propSetForArgumentsBelief(belief: ArgumentsFieldBelief): Kefir.Property<PropositionSet> {
  const query =
    buildQueryForArgumentsBelief(
      SparqlUtil.parseQuerySync<SparqlJs.Update>(belief.field.insertPattern)
    );
  return SparqlClient.construct(
    SparqlClient.setBindings(query, {'subject': belief.target})
  );

}

function buildQueryForArgumentsBelief(
  insertQuery: SparqlJs.Update
): SparqlJs.ConstructQuery {
  const operation = insertQuery.updates[0] as SparqlJs.InsertDeleteOperation;
  return {
    prefixes: insertQuery.prefixes,
    type: 'query',
    queryType: 'CONSTRUCT',
    template: (operation.insert as Array<SparqlJs.BgpPattern>)[0].triples,
    where: [{
      type: 'bgp',
      triples:
      (operation.insert as Array<SparqlJs.BgpPattern>)[0].triples,
    }],
  };
}


function propSetForAssertedBelief(
  belief: AssertedBelief
): Kefir.Property<PropositionSet> {
  const query =
    buildQueryForAssertedBelief(
      SparqlUtil.parseQuerySync<SparqlJs.Update>(belief.field.insertPattern), belief.isCanonical
    );
  return SparqlClient.construct(
    SparqlClient.setBindings(query, {'subject': belief.target, 'value': belief.targetValue})
  );
}

/**
 * In case when user asserts new value for a field,
 * insertPattern from Field Definition is used as a construct pattern
 * for proposition set
 */
function buildQueryForAssertedBelief(
  insertQuery: SparqlJs.Update, isCanonicalValue: boolean
): SparqlJs.ConstructQuery {
  const operation = insertQuery.updates[0] as SparqlJs.InsertDeleteOperation;
  return {
    prefixes: insertQuery.prefixes,
    type: 'query',
    queryType: 'CONSTRUCT',
    template: (operation.insert as Array<SparqlJs.BgpPattern>)[0].triples,
    where: isCanonicalValue ? [] : _.cloneDeep(operation.where),
  };
}

function getBeliefsForAssertion(assertionIri: Rdf.Iri): Kefir.Property<Array<Rdf.PointedGraph>> {
  // If premise is an assertion we point to the beliefs of the assertion
  return ldpc(rso.AssertionsContainer.value).get(assertionIri).map(
    (graph: Rdf.Graph) =>
      _.map(
        Rdf.getValuesFromPropertyPath<Rdf.Iri>([rso.PX_asserts], Rdf.pg(assertionIri, graph)),
        belief => Rdf.pg(belief, Rdf.graph([
          Rdf.triple(belief, rso.PX_premise_assertion, assertionIri),
        ]))
      )
  );
}

function savePropositionSet(
  propositions: PropositionSet, belief: Belief
): Kefir.Property<Rdf.Iri> {
  const propositionSetIri =
      createPropositionIri(
        createBeliefIri(belief)
      );
  const propositionSetGraph =
    serializePropSet(belief, propositions);
  return ldpc(rso.PropositionsContainer.value).addResource(
    propositionSetGraph, maybe.Just(propositionSetIri.value)
  );
}

function serializePropSet(belief: Belief, proposition: PropositionSet): Rdf.Graph {
  const propositionSetIri = Rdf.iri('');
  return Rdf.graph([
    Rdf.triple(propositionSetIri, vocabularies.rdf.type, crminf.I4_Proposition_Set),
    Rdf.triple(propositionSetIri, vocabularies.rdfs.label, Rdf.literal('Proposition Set')),
    ...proposition,
  ]);
}

function createBeliefIri(belief: Belief): Rdf.Iri {
  return belief.iri.getOrElse(
    Rdf.iri(`http://researchspace.org/instances/belief/${uuid.v4()}`)
  );
}

function createPropositionIri(beliefIri: Rdf.Iri): Rdf.Iri {
  return Rdf.iri(`${beliefIri.value}/proposition`);
}

export function createBeliefLabel(belief: Belief): string {
  // const start = belief. === 'Agree'
  //   ? 'Agree with proposition ' : 'Disagree with proposition ';
  // const propositionSetLabel = createPropositionSetLabel(subject, field, belief);
  // return `${start} "${propositionSetLabel}"`;
  return 'Belief';
}
