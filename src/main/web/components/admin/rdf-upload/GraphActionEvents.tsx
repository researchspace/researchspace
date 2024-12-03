/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
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

export interface GraphActionEventData {
  /**
   * Trigger when RDF file has been successfully uploaded
   */
  'GraphAction.Success': { }
  'GraphAction.Delete': { iri: string };
  'GraphAction.Update': { }
}
const event: EventMaker<GraphActionEventData> = EventMaker;

export const GraphActionSuccess = event('GraphAction.Success')
export const GraphActionDelete = event('GraphAction.Delete')
export const GraphActionUpdate = event('GraphAction.Update')
