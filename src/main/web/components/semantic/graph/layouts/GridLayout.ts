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

import * as maybe from 'data.maybe';
import { has } from 'lodash';
import { identity } from 'core.lambda';
import { createFactory } from 'react';

import { registerCytoscapeLayout, CytoscapeApi } from '../api/Api';
import { sort, getNumberValueForProperty } from '../api/LayoutHelpers';

/**
 * Register built-in cytoscape grid layout.
 *
 * @example
 *   <graph-layout-grid></graph-layout-grid>
 *
 * @see http://js.cytoscape.org/#layouts/grid
 */
export const component = registerCytoscapeLayout('grid', identity, mapOptions);
export const factory = createFactory(component);
export default component;

function mapOptions(api: CytoscapeApi, options: Cy.LayoutOptions): Cy.LayoutOptions {
  if (has(options, 'sortBy')) {
    const sortBy = options['sortBy'];
    options['sort'] = sort(sortBy);
  }
  if (has(options, 'positionRow') || has(options, 'positionCol')) {
    options['position'] = positionBy(options['positionRow'], options['positionCol']);
  }

  return options;
}

/**
 * Transform position properties to position function required by the layout.
 */
function positionBy(x: string | undefined, y: string | undefined) {
  const xFn = maybe.fromNullable(x).map(getNumberValueForProperty).getOrElse(maybe.Nothing);
  const yFn = maybe.fromNullable(y).map(getNumberValueForProperty).getOrElse(maybe.Nothing);
  return function (element: Cy.CollectionFirstNode): { row: number; col: number } {
    return {
      row: xFn(element).getOrElse(undefined),
      col: yFn(element).getOrElse(undefined),
    };
  };
}
