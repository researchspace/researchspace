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

export interface FileEventData {
  // triggers
  'File.Removed': { iri: string }

  //litens
  'File.Remove': { iri: string }
}

const event: EventMaker<FileEventData> = EventMaker;
export const FileRemove = event('File.Remove');
export const FileRemoved = event('File.Removed');
