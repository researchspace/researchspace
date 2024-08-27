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

export interface TextEditorEventData {
  // triggers

  /**
   * Event which should be triggered when a narrative has been created.
   */
  'Narrative.Created': { iri: string };

  /**
   * Event which should be triggered when a narrative has been updated.
   */
  'Narrative.Updated': { iri: string };

  /**
   * Event which should be triggered when refresh button is clicked.
   */
  'Narrative.Refreshed': {};
  

}
const event: EventMaker<TextEditorEventData> = EventMaker;

export const NarrativeCreated = event('Narrative.Created');
export const NarrativeUpdated = event('Narrative.Updated');
export const NarrativeRefreshed = event('Narrative.Refreshed');
