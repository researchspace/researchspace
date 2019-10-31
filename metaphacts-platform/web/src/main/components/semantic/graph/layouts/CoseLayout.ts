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

import { has } from 'lodash';
import { identity } from 'core.lambda';

import { registerCytoscapeLayout, CytoscapeApi } from '../api/Api';

/**
 * The cose (Compound Spring Embedder) layout uses a physics simulation to lay out graphs. It works well with noncompound graphs and it has additional logic to support compound graphs well
 */
export interface SemanticGraphCoseLayoutConfig {
  /**
   * Whether to fit the viewport to the graph
   *
   * @default true
   */
  fit?: boolean

  /**
   * The padding on fit in pixels
   *
   * @default 30
   */
  padding?: number

  /**
   * Whether to transition the node positions
   *
   * @default false
   */
  animate?: boolean

  /**
   * The layout animates only after this many milliseconds (prevents flashing on fast runs)
   *
   * @default 250
   */
  animationThreshold?: number

  /**
   * Number of iterations between consecutive screen positions update (0 -> only updated on the end)
   *
   * @default 20
   */
  refresh?: number

  /**
   * Randomize the initial positions of the nodes (true) or use existing positions (false)
   *
   * @default false
   */
  randomize?: boolean

  /**
   * Extra spacing between components in non-compound graphs
   *
   * @default 100
   */
  componentSpacing?: number

  /**
   * Node repulsion (non overlapping) multiplier
   *
   * @default 400000
   */
  nodeRepulsion?: number

  /**
   * Node repulsion (overlapping) multiplier
   *
   * @default 10
   */
  nodeOverlap?: number

  /**
   * Ideal edge (non nested) length
   *
   * @default 10
   */
  idealEdgeLength?: number

  /**
   * Divisor to compute edge forces
   *
   * @default 100
   */
  edgeElasticity?: number

  /**
   * Nesting factor (multiplier) to compute ideal edge length for nested edges
   *
   * @default 5
   */
  nestingFactor?: number

  /**
   * Gravity force (constant)
   *
   * @default 80
   */
  gravity?: number

  /**
   * Maximum number of iterations to perform
   *
   * @default 1000
   */
  numIter?: number

  /**
   * Initial temperature (maximum node displacement)
   *
   * @default 200
   */
  initialTemp?: number

  /**
   * Cooling factor (how the temperature is reduced between consecutive iterations
   *
   * @default 0.95
   */
  coolingFactor?: number

  /**
   * Lower temperature threshold (below this point the layout will end)
   *
   * @default 1.0
   */
  minTemp?: number

  /**
   * Whether to use threading to speed up the layout
   *
   * @default true
   */
  useMultitasking?: boolean
}

/**
 * Register built-in cytoscape cose layout.
 *
 * @example
 *   <graph-layout-cose></graph-layout-cose>
 *
 * @see http://js.cytoscape.org/#layouts/cose
 */
export const CoseLayout = registerCytoscapeLayout('cose', identity, mapOptions);
export default CoseLayout;

function mapOptions(api: CytoscapeApi, options: Cy.LayoutOptions): Cy.LayoutOptions {
  if (has(options, 'idealEdgeLength')) {
    const idealEdgeLength = options['idealEdgeLength'] as Cy.IdealEdgeLengthCoseBilkent;
    options['idealEdgeLength'] = () => idealEdgeLength;
  }
  if (has(options, 'nodeRepulsion')) {
    const nodeRepulsion = options['nodeRepulsion'];
    options['nodeRepulsion'] = () => nodeRepulsion;
  }
  if (has(options, 'edgeElasticity')) {
    const edgeElasticity = options['edgeElasticity'];
    options['edgeElasticity'] = () => edgeElasticity;
  }
  return options;
}
