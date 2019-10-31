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

import * as Kefir from 'kefir';

import { EventType } from './EventsApi';
import { EventMaker } from './Utils';

export interface BuiltInEventData {
  /**
   * Event which should be triggered when something should be refreshed.
   */
  'Component.Refresh': void;
  /**
   * Event which should be triggered when data has been loaded.
   */
  'Component.Loaded': void;
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
