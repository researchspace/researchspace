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
import * as Maybe from 'data.maybe';
import * as moment from 'moment';

import { Rdf } from 'platform/api/rdf';
import {
    VocabPlatform, workflow as VocabWorkflow, rdf, xsd, sp
} from 'platform/api/rdf/vocabularies';
import { LdpService } from 'platform/api/services/ldp';
import { SparqlClient } from 'platform/api/sparql';
import { getLabels } from 'platform/api/services/resource-label';
import { Util as SecurityUtil } from 'platform/api/services/security';
import { parseQuerySync } from 'platform/api/sparql/SparqlUtil';

const ASSIGNEE_VARIABLE = 'assignee';
const NEW_STEP_VARIABLE = '__newStep__';
const WORKFLOW_INSTANTIATION_VARIABLE = '__workflowInstantiation__';

export interface WorkflowState {
    step: Rdf.Iri | undefined;
    assignee: Rdf.Iri | undefined;
}
export namespace WorkflowState {
    export const empty: WorkflowState = { step: undefined, assignee: undefined };

    export function isEqual(a: WorkflowState, b: WorkflowState): boolean {
        return (a.step && a.step.equals(b.step) || !a.step && !b.step) &&
            (a.assignee && a.assignee.equals(b.assignee) || !a.assignee && !b.assignee);
    }
}

export interface WorkflowStep {
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
    iri: Rdf.Iri;
    label: string;
}

export interface WorkflowData {
    subject: Rdf.Iri;
    definition: Rdf.Iri;
    firstStep: Rdf.Iri;
    metadataQuery?: string;
    assignee?: Rdf.Iri;
    newWorkflowIriTemplate?: string;
}

export class WorkflowService {
    private ldpService: LdpService;
    constructor() {
        this.ldpService = new LdpService(
            VocabPlatform.WorkflowContainer.value,
            {repository: 'default'});
    }

    queryWorkflowInstantiation(workflow: string): Kefir.Property<Rdf.Graph> {
        return this.ldpService.get(Rdf.iri(workflow));
    }

    queryWorkflowSteps(
        {definition, currentStep}: {
            definition: string;
            currentStep?: Rdf.Iri;
        }
    ): Kefir.Property<Array<WorkflowStep>> {
        const ldpAssetsService = new LdpService(
            VocabPlatform.WorkflowContainer.value,
            {repository: 'assets'});
        const definitionIri = Rdf.iri(definition);
        return ldpAssetsService.get(definitionIri).flatMap(g => {
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

    queryWorkflowAssignees(
        { query, newStep, workflowInstantiations }: {
            query: string;
            newStep: Rdf.Iri;
            workflowInstantiations: Array<Rdf.Iri>;
        }
    ): Kefir.Property<Array<WorkflowAssignee>> {
        const values = workflowInstantiations.map(iri => ({
            [WORKFLOW_INSTANTIATION_VARIABLE]: iri
        }));
        return SparqlClient.prepareQuery(query, values).map(parsedQuery =>
            SparqlClient.setBindings(parsedQuery, { [NEW_STEP_VARIABLE]: newStep })
        ).flatMap(parsedQuery =>
            SparqlClient.select(parsedQuery)
        ).flatMap(({results}) => {
            const assignees = results.bindings.map(binding => {
                return binding[ASSIGNEE_VARIABLE] as Rdf.Iri;
            });
            return getLabels(assignees);
        }).map(labels => {
            const assignees: Array<WorkflowAssignee> = [];
            labels.forEach((label, iri) =>
                assignees.push({iri, label} as WorkflowAssignee)
            );
            return assignees;
        }).toProperty();
    }

    private generateSubjectByTemplate(template: string | undefined): string {
        const iriTemplate = template || '{{UUID}}';
        const subject = iriTemplate.replace(/{{([^{}]+)}}/g, (match, placeholder) => {
          if (placeholder === 'UUID') {
            return uuid.v4();
          } else {
            return '';
          }
        });
        return subject;
    }

    createWorkflowInstantiation(
        workflowData: WorkflowData
    ): Kefir.Property<Rdf.Iri> {
        const ldpAssetsService = new LdpService(
            VocabPlatform.WorkflowContainer.value,
            {repository: 'assets'});
        return ldpAssetsService.get(workflowData.definition).flatMap(graph => {
            try {
                const steps = Rdf.getValuesFromPropertyPath<Rdf.Iri>(
                    [VocabWorkflow.hasStep], Rdf.pg(workflowData.definition, graph)
                );
                const firstStep = steps.find(step => step.value === workflowData.firstStep.value);
                if (!firstStep) {
                    throw new Error(`Unknown step ${workflowData.firstStep}, no equals with definition's steps`);
                }
                const subjectIri = this.generateSubjectByTemplate(
                    workflowData.newWorkflowIriTemplate);
                const subject = Rdf.iri('');
                const workflowStateIri = Rdf.iri(
                    `${VocabWorkflow.hasState.value}-${uuid.v4()}`
                );
                const workflowMetadataIri = Rdf.iri(
                    `${VocabWorkflow.metadata.value}-${uuid.v4()}`
                );
                const timeLiteral = Rdf.literal(moment().toISOString(), xsd.dateTime);
                const triples: Array<Rdf.Triple> = [
                    Rdf.triple(subject, rdf.type, VocabWorkflow.WorkflowInstantiation),
                    Rdf.triple(subject, VocabWorkflow.subject, workflowData.subject),
                    Rdf.triple(subject, VocabWorkflow.hasState, workflowStateIri),
                    Rdf.triple(subject, VocabWorkflow.currentState, workflowStateIri),
                    Rdf.triple(workflowStateIri, rdf.type, VocabWorkflow.WorkflowState),
                    Rdf.triple(workflowStateIri, VocabWorkflow.step, firstStep),
                    Rdf.triple(workflowStateIri, VocabWorkflow.startTime, timeLiteral),
                ];
                if (workflowData.assignee.value) {
                    triples.push(Rdf.triple(
                        workflowStateIri,
                        VocabWorkflow.assignee,
                        workflowData.assignee
                    ));
                }
                return this.createMetadata(
                    workflowData.metadataQuery, workflowMetadataIri
                ).flatMap(metadataGraph => {
                    if (metadataGraph.length !== 0) {
                        triples.push(Rdf.triple(subject,
                            VocabWorkflow.metadata, workflowMetadataIri));
                        metadataGraph.forEach(item => {
                            triples.push(Rdf.triple(item.s, item.p, item.o));
                        });
                    }
                    const workflowGraph = Rdf.graph(triples);
                    return this.ldpService.addResource(
                        workflowGraph,
                        Maybe.Just(subjectIri)
                    );
                });
            } catch (error) {
                return Kefir.constantError(error);
            }
        }).toProperty();
    }

    createMetadata(
        metadataQuery: string,
        metadataIri: Rdf.Iri
    ): Kefir.Property<Rdf.Triple[]> {
        if (!metadataQuery) {
            return Kefir.constant([]);
        }
        let query = parseQuerySync(metadataQuery);
        query = SparqlClient.setBindings(query, {
            metadataIri
        });
        return SparqlClient.construct(query);
    }

    updateWorkflowInstantiation(
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
                triples.push(Rdf.triple(
                    workflowStateIri, VocabWorkflow.assignee, workflowState.assignee
                ));
            }
            originalGraph.triples.forEach(t => {
                if (!t.p.equals(VocabWorkflow.currentState)) {
                    triples.push(t);
                }
            });
            const workflowGraph = Rdf.graph(triples);
            return this.ldpService.update(workflowIri, workflowGraph);
        }).toProperty();
    }

    deserializeWorkflowState(
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

    isWorkflowExist(
        resourceIri: Rdf.Iri
    ): Kefir.Property<boolean> {
        const queryStr = `ASK {
            ?workflow a ?type .
            ?workflow ?predicate ?subject .
        }`;
        let query = parseQuerySync(queryStr);
        query = SparqlClient.setBindings(query, {
            subject: resourceIri,
            type: VocabWorkflow.WorkflowInstantiation,
            predicate: VocabWorkflow.subject,
        });
        return SparqlClient.ask(query);
    }
}
