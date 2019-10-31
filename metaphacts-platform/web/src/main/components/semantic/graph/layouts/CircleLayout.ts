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
import { sort } from '../api/LayoutHelpers';

/**
 * The circle layout puts nodes in a circle
 */
export interface SemanticGraphCircleLayoutConfig {
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
   * Prevents node overlap, may overflow bounding-box and radius if not enough space
   *
   * @default true
   */
  avoidOverlap?: boolean

  /**
   * The radius of the circle in pixels
   */
  radius?: number

  /**
   * Where nodes start in radians
   *
   * @default 3/2*Math.Pi
   */
  startAngle?: number

  /**
   * How many radians should be between the first and last node (defaults to full circle)
   */
  sweep?: number

  /**
   * Whether the layout should go clockwise (true) or counterclockwise/anticlockwise (false)
   *
   * @default true
   */
  clockwise?: boolean

  /**
   * Full IRI of the property which value can be used to order nodes. Property value should be some kind of number, e.g `xsd:integer`, or at least valid number in `xsd:string` literal.
   */
  sortBy?: string
  /**
   * Whether to transition the node positions
   *
   * @default false
   */
  animate?: boolean

  /**
   * Duration of animation in ms if enabled
   *
   * @default 500
   */
  animationDuration?: boolean

  /**
   * Easing of animation if enabled. For possible values see `transition-timing-function` at [easing](http://js.cytoscape.org/#style/transition-animation)
   */
  animationEasing?: string
}

/**
 * Register built-in cytoscape circle layout.
 *
 * @example
 *   <graph-layout-circle></graph-layout-circle>
 *
 * @see http://js.cytoscape.org/#layouts/circle
 */
export const CircleLayout = registerCytoscapeLayout('circle', identity, mapOptions);
export default CircleLayout;

function mapOptions(api: CytoscapeApi, options: Cy.LayoutOptions): Cy.LayoutOptions {
  if (has(options, 'sortBy')) {
    const sortBy = options['sortBy'];
    options['sort'] = sort(sortBy);
  }
  return options;
}
