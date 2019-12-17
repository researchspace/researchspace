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

import * as Rdf from '../core/Rdf';

module workflow {
  const NAMESPACE = 'http://www.metaphacts.com/ontologies/platform/workflow#';
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
