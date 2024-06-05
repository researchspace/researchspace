/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
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

export interface DashboardEvents {
  /**
   * Event which should be triggered when the nested component has been changed.
   */
  'Dashboard.StatusChanged': { hasChanges: boolean };

  /**
   * Event which should be triggered when the current resource has been changed.
   */
  'Dashboard.ResourceChanged': {
    resourceIri: string;
    data?: { [key: string]: any }; // additional info that can be passed with the event
  };
}

/**
 * Can be triggered to initiate new frame
 */
export const AddFrameEvent = 'Dashboard.AddFrame';
export type AddFrameEventData = {
  resourceIri?: string;
  viewId?: string;
  entityEditorLabel?: string;
};

const event: EventMaker<DashboardEvents> = EventMaker;

export const StatusChanged = event('Dashboard.StatusChanged');
export const ResourceChanged = event('Dashboard.ResourceChanged');
