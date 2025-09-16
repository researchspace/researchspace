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

import * as Rdf from '../core/Rdf';

namespace workflow {
  const NAMESPACE = 'http://www.researchspace.org/resource/system/workflow#';
  const iri = (s: string) => Rdf.iri(NAMESPACE + s);

  /**  TYPES **/
  export const WorkflowInstantiation = iri('WorkflowInstantiation');
  export const WorkflowDefinition = iri('WorkflowDefinition');
  export const WorkflowState = iri('WorkflowState');

  /**  PROPERTIES **/
  export const hasState = iri('hasState');
  export const currentState = iri('currentState');
  export const step = iri('step');
  export const assignee = iri('assignee');
  export const startTime = iri('startTime');
  export const endTime = iri('endTime');
  export const advancedBy = iri('advancedBy');
  export const metadata = iri('metadata');
  export const hasStep = iri('hasStep');
  export const nextStep = iri('nextStep');
  export const assigneeQuery = iri('assigneeQuery');
  export const subject = iri('subject');
}

export default workflow;
