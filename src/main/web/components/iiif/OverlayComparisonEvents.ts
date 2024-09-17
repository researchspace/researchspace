/**
 * ResearchSpace
 * Copyright (C) 2024, © Kartography Community Interest Company
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
import Rdf = require('platform/api/rdf/core/Rdf');



export interface OverlayComparisonEventData {
  /**
   * Event which should be triggered when overlay images has been saved.
   */
  'OverlayComparison.Created': {
    /**
     * Saved overlay image IRI.
     */
    iri: Rdf.Iri;
  };
  
  /**
   * Event which should be triggered to delete an entity.
   */
  'OverlayComparison.Deleted': {
    /**
     * IRI of an image to be deleted.
     */
    iri: string;
  };
}
const event: EventMaker<OverlayComparisonEventData> = EventMaker;

export const OverlayComparisonCreated = event('OverlayComparison.Created');
export const OverlayComparisonDeleted = event('OverlayComparison.Deleted');