/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

export type SetManagementEvents = typeof SetManagementEvents;
export namespace SetManagementEvents {
  export const SetAdded = 'Components.SetManagement.SetAdded';
  export const SetRenamed = 'Components.SetManagement.SetRenamed';
  export const SetRemoved = 'Components.SetManagement.SetRemoved';
  export const ItemAdded = 'Components.SetManagement.ItemAdded';
  export const ItemRemoved = 'Components.SetManagement.ItemRemoved';
  export const ItemsReordered = 'Components.SetManagement.ItemsReordered';
}

export type SetManagementEventType = SetManagementEvents[keyof SetManagementEvents];
