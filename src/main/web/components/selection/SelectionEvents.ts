/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { EventMaker } from 'platform/api/events';

export interface SelectionEventData {
  'Selection.Toggle': { value: string, isSelected: boolean }

  'Selection.SetActive': { isActive:boolean, selections: Record<string, boolean> }

  'Selection.Trigger': { action: string, selections: string[] }

  // selection sends this to toggles when they should become visible
  'Selection.CurrentState': { isActive: boolean, selections: Record<string, boolean> }

  // selection toggles send this event when they are first rendered to ask selection
  // to broadcast Selection.CurrentState
  'Selection.GetState': { }
}

const event: EventMaker<SelectionEventData> = EventMaker;

export const SelectionToggle = event('Selection.Toggle');
export const SelectionSetActive = event('Selection.SetActive');
export const SelectionCurrentState = event('Selection.CurrentState');
export const SelectionGetState = event('Selection.GetState');
export const SelectionTrigger = event('Selection.Trigger');
