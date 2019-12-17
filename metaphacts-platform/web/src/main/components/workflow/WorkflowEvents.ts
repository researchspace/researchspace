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

import { EventMaker } from 'platform/api/events';

export interface WorkflowEventData {
  /**
   * WorflowCreateComponent listen to this event and once event is fired
   * the new workflow instantiations for specified iri is created
   */
  'Workflow.Create': { iri: string };
  /**
   * WorflowCreateComponent fires this event after a
   * new worflow instantiation is created
   * where the iri is the workflow IRI
   */
  'Workflow.Created': { iri: string; };
  /**
   * WorflowCreateComponent fires this event after a
   * new worflow instantiation is created
   * where the iri is the subject IRI
   */
  'Workflow.SubjectGetInWorkflow': { iri: string; };
}
const event: EventMaker<WorkflowEventData> = EventMaker;

export const WorkflowCreate = event('Workflow.Create');
export const WorkflowCreated = event('Workflow.Created');
export const SubjectGetInWorkflow = event('Workflow.SubjectGetInWorkflow');
