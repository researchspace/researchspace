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

import { DiagramModel, AuthoringState, TemporaryState } from 'ontodia';

import { EventMaker } from 'platform/api/events';

export interface OntodiaEventData {
  /**
   * Event which should be triggered when diagram has been saved.
   */
  'Ontodia.DiagramSaved': { resourceIri: string };
  /**
   * Event which should be triggered when diagram has been changed.
   */
  'Ontodia.DiagramChanged': {
    model: DiagramModel;
    authoringState: AuthoringState;
    temporaryState: TemporaryState;
  };
  /**
   * Event which should be triggered when diagram has been changed.
   */
  'Ontodia.DiagramIsDirty': { hasChanges: boolean };
}
const event: EventMaker<OntodiaEventData> = EventMaker;

export const DiagramSaved = event('Ontodia.DiagramSaved');
export const DiagramChanged = event('Ontodia.DiagramChanged');
export const DiagramIsDirty = event('Ontodia.DiagramIsDirty');
