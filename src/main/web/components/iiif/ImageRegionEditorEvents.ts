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

export interface IiifManifestObject {
  objectIri: string;

  /**
   * List of images associated with the object
   */
  images?: string[];
}

export interface ImageRegionEditorEventData {
  // trigger
  'IIIFViewer.ManifestUpdated': {objects?: IiifManifestObject[]}

  'IIIFViewer.RegionCreated': {objectIri: string, imageIri: string, regionIri: string, regionLabel: string}

  'IIIFViewer.RegionRemoved': {objectIri: string, imageIri: string, regionIri: string, regionLabel: string}

  'IIIFViewer.RegionUpdated': {objectIri: string, imageIri: string, regionIri: string, regionLabel: string}

  // listen
  'IIIFViewer.ZoomToRegion': {imageIri: string, regionIri: string}
  'IIIFViewer.HighlightRegion': {regionIri: string}

  // TODO, implement RemoveRegion
  'IIIFViewer.RemoveRegion': { objectIri: string, imageIri: string, regionIri: string }

  'IIIFViewer.AddObjectImages': {objectIri: string, imageIris: string[]}
  'IIIFViewer.AddImagesForObject': {objectIri: string}
}

const event: EventMaker<ImageRegionEditorEventData> = EventMaker;

export const ManifestUpdatedEvent = event('IIIFViewer.ManifestUpdated');
export const RegionCreatedEvent = event('IIIFViewer.RegionCreated');
export const RegionUpdatedEvent = event('IIIFViewer.RegionUpdated');
export const RegionRemovedEvent = event('IIIFViewer.RegionRemoved');

export const ZoomToRegionEvent = event('IIIFViewer.ZoomToRegion');
export const HighlightRegion = event('IIIFViewer.HighlightRegion');
export const RemoveRegion = event('IIIFViewer.RemoveRegion');
export const AddObjectImagesEvent = event('IIIFViewer.AddObjectImages');
export const AddImagesForObjectEvent = event('IIIFViewer.AddImagesForObject');
