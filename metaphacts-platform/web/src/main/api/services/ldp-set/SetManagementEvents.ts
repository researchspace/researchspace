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
