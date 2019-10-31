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
import { getNumberValueForProperty } from '../api/LayoutHelpers';

/**
 * The concentric layout positions nodes in concentric circles, based on a numeric value of some node property. Placing nodes with higher value in levels towards the center
 */
export interface SemanticGraphConcentricLayoutConfig {

  /**
   * Full property IRI which has numeric value for each node. If property is not specified, node degree is used as a concentric weight. For a node, the degree is the number of edge connections it has. Each time a node is referenced as source or target of an edge in the graph, that counts as an edge connection
   */
  concentric?: string

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
   * Where nodes start in radians
   *
   * @default 3/2*Mathi.Pi
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
   * Whether levels have an equal radial distance betwen them, may cause bounding box overflow
   *
   * @default false
   */
  equidistant?: boolean

  /**
   * Min spacing between outside of nodes (used for radius adjustment)
   *
   * @default 10
   */
  minNodeSpacing?: number

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
 * Register built-in cytoscape concentric layout.
 *
 * @example
 *   <graph-layout-concentric></graph-layout-concentric>
 *
 * @see http://js.cytoscape.org/#layouts/concentric
 */
export const ConcentricLayout = registerCytoscapeLayout('concentric', identity, mapOptions);
export default ConcentricLayout;

function mapOptions(api: CytoscapeApi, options: Cy.LayoutOptions): Cy.LayoutOptions {
  if (has(options, 'concentric')) {
    options['concentric'] = concentricBy(options['concentric']);
  }
  return options;
}

/**
 * Transform concentric property to concentric function required by the layout.
 */
function concentricBy(levelPropertyName: string) {
  const levelFn = getNumberValueForProperty(levelPropertyName);
  return function(element: Cy.CollectionFirstNode): number {
    return levelFn(element).getOrElse(0);
  };
}
