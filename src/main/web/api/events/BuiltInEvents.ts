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

import * as Kefir from 'kefir';

import { EventType } from './EventsApi';
import { EventMaker } from './Utils';

export interface BuiltInEventData {
  /**
   * Event which should be triggered when something should be refreshed.
   */
  'Component.Refresh': object;
  /**
   * Event which should be triggered when data has been loaded.
   */
  'Component.Loaded': object;
  /**
   * Event which should be triggered when a template should be updated with new properties.
   */
  'Component.TemplateUpdate': object;
}
const event: EventMaker<BuiltInEventData> = EventMaker;

export const ComponentRefresh = event('Component.Refresh');
/**
 * Event which should be triggered when component starts loading data.
 */
export const ComponentLoading: EventType<Kefir.Property<any>> = 'Component.Loading';
export const ComponentLoaded = event('Component.Loaded');
export const ComponentTemplateUpdate = event('Component.TemplateUpdate');
