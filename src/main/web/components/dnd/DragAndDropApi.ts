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

import * as PropTypes from 'prop-types';

import { Rdf } from 'platform/api/rdf';

/**
 * Type of drag data
 */
export const DRAG_AND_DROP_FORMAT = 'application/mp-draggable-iri';

/**
 * Type of drag data for IE.
 * IE doesn't support custom mime type.
 */
export const DRAG_AND_DROP_FORMAT_IE = 'text/uri-list';

/**
 * Context types of droppable component
 */
export const DroppableContextTypes = {
  droppableApi: PropTypes.any.isRequired,
};

/**
 * Context of droppable component
 */
export interface DroppableContext {
  droppableApi: DroppableApi;
}

/**
 * API of droppable component
 */
export interface DroppableApi {
  /**
   * Iri of dropped source
   */
  drop: Data.Maybe<Rdf.Iri>;
}
