/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
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
  'Workflow.Created': { iri: string };
  /**
   * WorflowCreateComponent fires this event after a
   * new worflow instantiation is created
   * where the iri is the subject IRI
   */
  'Workflow.SubjectGetInWorkflow': { iri: string };
}
const event: EventMaker<WorkflowEventData> = EventMaker;

export const WorkflowCreate = event('Workflow.Create');
export const WorkflowCreated = event('Workflow.Created');
export const SubjectGetInWorkflow = event('Workflow.SubjectGetInWorkflow');
