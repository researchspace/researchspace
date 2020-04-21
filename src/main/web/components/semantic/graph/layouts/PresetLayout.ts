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

import { has } from 'lodash';
import { identity } from 'core.lambda';

import { registerCytoscapeLayout, CytoscapeApi } from '../api/Api';
import { getNumberValueForProperty } from '../api/LayoutHelpers';

/**
 * The preset layout puts nodes in the positions you specify manually
 */
export interface SemanticGraphPresetLayoutConfig {
  /**
   * Full IRI of the property that points to node X position value
   */
  positionX: string;

  /**
   * Full IRI of the property that points to node Y position value
   */
  positionY: string;

  /**
   * Zoom level to set, `fit` property need to be set to false
   */
  zoom?: number;

  /**
   * The pan level to set, `fit` property need to be set to false
   */
  pan?: Cy.Position;

  /**
   * Whether to fit the viewport to the graph
   *
   * @default true
   */
  fit?: boolean;

  /**
   * The padding on fit in pixels
   *
   * @default 30
   */
  padding?: number;

  /**
   * Whether to transition the node positions
   *
   * @default false
   */
  animate?: boolean;

  /**
   * Duration of animation in ms if enabled
   *
   * @default 500
   */
  animationDuration?: boolean;

  /**
   * Easing of animation if enabled. For possible values see `transition-timing-function` at [easing](http://js.cytoscape.org/#style/transition-animation)
   */
  animationEasing?: string;
}

/**
 * Register built-in cytoscape preset layout.
 *
 * @example
 *   <graph-layout-preset position-x="<propXiri>" position-y="<propYiri>"></graph-layout-preset>
 *
 * @see http://js.cytoscape.org/#layouts/preset
 */
export const PresetLayout = registerCytoscapeLayout('preset', identity, mapOptions);
export default PresetLayout;

// TODO create proper type definitions for PresetLayout options;
export type Props = Cy.LayoutOptions;

function mapOptions(api: CytoscapeApi, options: Cy.LayoutOptions): Cy.LayoutOptions {
  if (has(options, 'positionX') && has(options, 'positionY')) {
    options['positions'] = positionBy(options['positionX'], options['positionY']);
  } else {
    // TODO think about proper error handling in graph component API
    console.error('Graph Preset Layout: position-x and position-y attributes are required!');
  }

  return options;
}

/**
 * Transform position properties to position function required by the layout.
 */
function positionBy(xProp: string, yProp: string) {
  const xFn = getNumberValueForProperty(xProp);
  const yFn = getNumberValueForProperty(yProp);
  return function (element: Cy.CollectionFirstNode): { x: number; y: number } {
    return xFn(element)
      .chain((x) =>
        yFn(element).map((y) => {
          return { x: x, y: y };
        })
      )
      .getOrElse({ x: undefined, y: undefined });
  };
}
