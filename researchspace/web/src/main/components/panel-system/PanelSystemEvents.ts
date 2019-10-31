/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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

export interface PanelSystemEventData {
  'PanelSystem.ShowResource': { pageId: string, pageProps: any };
  'PanelSystem.InitiateIIIFViewer': { iris: Array<string> };
  'PanelSystem.InitiateGraphAuthoring': { iris: Array<string> } | { diagram: string };
}
const event: EventMaker<PanelSystemEventData> = EventMaker;

export const ShowResource = event('PanelSystem.ShowResource');
export const InitiateIIIFViewer = event('PanelSystem.InitiateIIIFViewer');
export const InitiateGraphAuthoring = event('PanelSystem.InitiateGraphAuthoring');
