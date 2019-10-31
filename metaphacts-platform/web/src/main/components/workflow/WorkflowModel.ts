/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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
import * as moment from 'moment';

import { Rdf } from 'platform/api/rdf';
import {
  VocabPlatform, workflow as VocabWorkflow, rdf, xsd, sp,
} from 'platform/api/rdf/vocabularies';
import { LdpService } from 'platform/api/services/ldp';
import { SparqlClient } from 'platform/api/sparql';
import { getLabels } from 'platform/api/services/resource-label';
import { Util as SecurityUtil } from 'platform/api/services/security';

const ASSIGNEE_VARIABLE = 'assignee';
const NEW_STEP_VARIABLE = '__newStep__';
const WORKFLOW_INSTANTIATION_VARIABLE = '__workflowInstantiation__';

export interface WorkflowState {
  step: Rdf.Iri | undefined;
  assignee: Rdf.Iri | undefined;
}
export namespace WorkflowState {
  export const empty: WorkflowState = {step: undefined, assignee: undefined};

  export function isEqual(a: WorkflowState, b: WorkflowState): boolean {
    return ((a.step && a.step.equals(b.step)) || (!a.step && !b.step)) &&
      ((a.assignee && a.assignee.equals(b.assignee)) || (!a.assignee && !b.assignee));
  }
}

export interface WorkflowStep {
  readonly _stateBrand: void;
  iri: Rdf.Iri;
  label: string;
  /**
   * SPARQL Select query returns possible assignees.
   * Expected projection variables:
   *    * '?assignee' - possible assignees
   * Injected variables:
   *    * '?__newStep__' - new step IRI
   *    * '?__workflowInstantiation__' - workflow instantiation IRI
   */
  assigneeQuery?: string;
}

export interface WorkflowAssignee {
  readonly _assigneeBrand: void;
  iri: Rdf.Iri;
  label: string;
}

export function queryWorkflowInstantiation(workflow: string): Kefir.Property<Rdf.Graph> {
  const ldpService = new LdpService(VocabPlatform.WorkflowContainer.value, {repository: 'default'});
  return ldpService.get(Rdf.iri(workflow));
}

export function queryWorkflowSteps(
  {definition, currentStep}: {
    definition: string;
    currentStep?: Rdf.Iri;
  }
): Kefir.Property<Array<WorkflowStep>> {
  const definitionIri = Rdf.iri(definition);
  const ldpService = new LdpService(VocabPlatform.WorkflowDefinitionContainer.value);
  return ldpService.get(definitionIri).flatMap(g => {
    let steps: Array<Rdf.Iri>;
    if (currentStep) {
      steps = Rdf.getValuesFromPropertyPath<Rdf.Iri>(
        [VocabWorkflow.nextStep], Rdf.pg(currentStep, g)
      );
      steps.push(currentStep);
    } else {
      steps = Rdf.getValuesFromPropertyPath<Rdf.Iri>(
        [VocabWorkflow.hasStep], Rdf.pg(definitionIri, g)
      );
    }

    return getLabels(steps, {context: {repository: 'assets'}}).map(labels =>
      steps.map(step => {
        const label = labels.get(step);
        const assigneeQuery = Rdf.getValueFromPropertyPath<Rdf.Iri>(
          [VocabWorkflow.assigneeQuery, sp.text], Rdf.pg(step, g)
        ).map(v => v.value).getOrElse(undefined);
        return {iri: step, assigneeQuery, label} as WorkflowStep;
      })
    );
  }).toProperty();
}

export function queryWorkflowAssignees(
  {query, newStep, workflowInstantiations}: {
    query: string;
    newStep: Rdf.Iri;
    workflowInstantiations: Array<Rdf.Iri>;
  }
): Kefir.Property<Array<WorkflowAssignee>> {
  const values = workflowInstantiations.map(iri => ({[WORKFLOW_INSTANTIATION_VARIABLE]: iri}));
  return SparqlClient.prepareQuery(query, values).map(parsedQuery =>
    SparqlClient.setBindings(parsedQuery, {[NEW_STEP_VARIABLE]: newStep})
  ).flatMap(parsedQuery =>
    SparqlClient.select(parsedQuery)
  ).flatMap(({results}) => {
    const assignees = results.bindings.map(binding => binding[ASSIGNEE_VARIABLE] as Rdf.Iri);
    return getLabels(assignees);
  }).map(labels => {
    const assignees: Array<WorkflowAssignee> = [];
    labels.forEach((label, iri) =>
      assignees.push({iri, label} as WorkflowAssignee)
    );
    return assignees;
  }).toProperty();
}

export function updateWorkflowInstantiation(
  {workflowIri, originalGraph, workflowState}: {
    workflowIri: Rdf.Iri;
    originalGraph: Rdf.Graph;
    workflowState: WorkflowState;
  }
): Kefir.Property<Rdf.Iri> {
  return Kefir.fromPromise(SecurityUtil.getUser()).flatMap(user => {
    const workflowStateIri = Rdf.iri(`${workflowIri.value}/${uuid.v4()}`);
    const timeLiteral = Rdf.literal(moment().toISOString(), xsd.dateTime);
    const triples: Array<Rdf.Triple> = [];
    Rdf.getValueFromPropertyPath<Rdf.Iri>(
      [VocabWorkflow.currentState], Rdf.pg(workflowIri, originalGraph)
    ).map(currentState =>
      triples.push(
        Rdf.triple(currentState, VocabWorkflow.endTime, timeLiteral),
        Rdf.triple(currentState, VocabWorkflow.advancedBy, Rdf.iri(user.userURI))
      )
    );
    triples.push(
      Rdf.triple(workflowIri, VocabWorkflow.hasState, workflowStateIri),
      Rdf.triple(workflowIri, VocabWorkflow.currentState, workflowStateIri),
      Rdf.triple(workflowStateIri, rdf.type, VocabWorkflow.WorkflowState),
      Rdf.triple(workflowStateIri, VocabWorkflow.step, workflowState.step),
      Rdf.triple(workflowStateIri, VocabWorkflow.startTime, timeLiteral)
    );
    if (workflowState.assignee) {
      triples.push(Rdf.triple(workflowStateIri, VocabWorkflow.assignee, workflowState.assignee));
    }
    originalGraph.triples.forEach(t => {
      if (!t.p.equals(VocabWorkflow.currentState)) {
        triples.push(t);
      }
    });
    const workflowGraph = Rdf.graph(triples);
    const ldpService = new LdpService(
      VocabPlatform.WorkflowContainer.value, {repository: 'default'}
      );
    return ldpService.update(workflowIri, workflowGraph);
  }).toProperty();
}

export function deserializeWorkflowState(
  workflowIri: Rdf.Iri, workflowGraph: Rdf.Graph
): WorkflowState {
  return Rdf.getValueFromPropertyPath<Rdf.Iri>(
    [VocabWorkflow.currentState], Rdf.pg(workflowIri, workflowGraph)
  ).map(currentState => {
    const pg = Rdf.pg(currentState, workflowGraph);
    const step = Rdf.getValueFromPropertyPath<Rdf.Iri>(
      [VocabWorkflow.step], pg
    ).getOrElse(undefined);
    const assignee = Rdf.getValueFromPropertyPath<Rdf.Iri>(
      [VocabWorkflow.assignee], pg
    ).getOrElse(undefined);
    return {step, assignee};
  }).getOrElse(WorkflowState.empty);
}
