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

import { identity } from 'core.lambda';

import { registerCytoscapeLayout } from '../api/Api';

/**
 * The breadthfirst layout puts nodes in a hierarchy, based on a breadthfirst traversal of the graph
 */
export interface SemanticGraphBreadthFirstLayoutConfig {
  /**
   * Array of full IRIs that should be treated as tree roots
   */
  roots: Array<string>;

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
   * Prevents node overlap, may overflow bounding-box and radius if not enough space
   *
   * @default true
   */
  avoidOverlap?: boolean;

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

  /**
   * Whether the tree is directed downwards (or edges can point in any direction if false)
   *
   * @default false
   */
  directed?: boolean;

  /**
   * Put depths in concentric circles if true, put depths top down if false
   *
   * @default false
   */
  circle?: boolean;

  /**
   * Positive spacing factor, larger => more space between nodes (N.B. n/a if causes overlap)
   *
   * @default 1.75
   */
  spacingFactor?: number;

  /**
   * How many times to try to position the nodes in a maximal way (i.e. no backtracking)
   *
   * @default 0
   */
  maximalAdjustments?: number;
}

/**
 * Register built-in cytoscape grid layout.
 *
 * @example
 *   <graph-layout-breadthfirst></graph-layout-breadthfirst>
 *
 * @see http://js.cytoscape.org/#layouts/breadthfirst
 */
export const BreadthFirstLayout = registerCytoscapeLayout('breadthfirst', identity);
export default BreadthFirstLayout;
