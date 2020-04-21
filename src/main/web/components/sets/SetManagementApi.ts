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
 * API exposed by <mp-set-management> through the React context.
 */
export interface SetManagementApi {
  /**
   * Remove set item from the set.
   */
  removeSetItem(set: Rdf.Iri, item: Rdf.Iri);

  /**
   * Remove set by IRI.
   */
  removeSet(set: Rdf.Iri);

  /**
   * Puts set into renaming mode.
   */
  startRenamingSet(set: Rdf.Iri);

  /**
   * Fetches set items of a selected set
   */
  fetchSetItems(set: Rdf.Iri);
}

// TODO revise when https://github.com/Microsoft/TypeScript/issues/13948 is fixed
export const SetManagementContextKey = 'mp-set-management';
export type SetManagementContext = {
  [K in typeof SetManagementContextKey]: SetManagementApi;
};

export const SetManagementContextTypes = {
  [SetManagementContextKey]: PropTypes.any.isRequired,
};

/**
 * API exposed by set view component through the React context.
 */
export interface SetViewApi {
  getCurrentSet(): Rdf.Iri;
}

export const SetViewContextKey = 'mp-set-management--set-view';
export type SetViewContext = {
  [K in typeof SetViewContextKey]: SetViewApi;
};
export const SetViewContextTypes = {
  [SetViewContextKey]: PropTypes.any.isRequired,
};

/**
 * API exposed by set item view component through the React context.
 */
export interface SetItemViewApi {
  getItem(): Rdf.Iri;
  getSetItemIri(): Rdf.Iri;
}

export const SetItemViewContextKey = 'mp-set-management--set-item-view';
export type SetItemViewContext = {
  [K in typeof SetItemViewContextKey]: SetItemViewApi;
};
export const SetItemViewContextTypes = {
  [SetItemViewContextKey]: PropTypes.any.isRequired,
};
