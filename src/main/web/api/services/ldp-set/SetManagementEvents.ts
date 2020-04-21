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

export interface SetManagementEventData {
  'Components.SetManagement.SetAdded': void;
  'Components.SetManagement.SetRenamed': void;
  'Components.SetManagement.SetRemoved': void;
  'Components.SetManagement.ItemAdded': void;
  'Components.SetManagement.ItemRemoved': void;
  'Components.SetManagement.ItemSelected': string;
  'Components.SetManagement.ItemsReordered': void;
  'Components.SetManagement.ItemsFiltered': ItemsFilteredData;
  'Components.SetManagement.ItemsFetched': { iris: Array<string> };
}
const event: EventMaker<SetManagementEventData> = EventMaker;

export type SetManagementEvents = typeof SetManagementEvents;
export namespace SetManagementEvents {
  export const SetAdded = event('Components.SetManagement.SetAdded');
  export const SetRenamed = event('Components.SetManagement.SetRenamed');
  export const SetRemoved = event('Components.SetManagement.SetRemoved');
  export const ItemAdded = event('Components.SetManagement.ItemAdded');
  export const ItemRemoved = event('Components.SetManagement.ItemRemoved');
  export const ItemSelected = event('Components.SetManagement.ItemSelected');
  export const ItemsReordered = event('Components.SetManagement.ItemsReordered');
  export const ItemsFiltered = event('Components.SetManagement.ItemsFiltered');
  export const ItemsFetched = event('Components.SetManagement.ItemsFetched');
}

export type SetManagementEventType = SetManagementEvents[keyof SetManagementEvents];

export interface ItemsFilteredData {
  iris?: Array<string>;
}
