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
import * as assign from 'object-assign';
import * as expand_collapse from 'cytoscape-expand-collapse';

import {
  DATA_LOADED_EVENT,
  ContextCytoscapeApi,
  registerCytoscapeExtension,
  CytoscapeExtension,
  ExtensionContext,
} from '../api/Api';

const EXPAND_COLLAPSE_DEFAULTS = {
  fisheye: true,
  animate: false,
  undoable: false,
  collapseByDefault: true,
};

export interface Config extends Cy.ExpandCollapse.Options {
  collapseByDefault: boolean;
}

function registerExpandCollapseExtension(api: ContextCytoscapeApi) {
  expand_collapse(api.cytoscape, api.jQuery);
}

function initializeExpandCollapseExtension({
  options,
  cytoscapeApi,
}: ExtensionContext<Config>): Data.Maybe<CytoscapeExtension> {
  const cy = cytoscapeApi.instance;
  const expandCollapseOptions = assign(
    {
      layoutBy: () => cytoscapeApi.actions.runLayout(),
    },
    EXPAND_COLLAPSE_DEFAULTS,
    options
  );

  const instance = cy.expandCollapse(expandCollapseOptions);
  if (expandCollapseOptions.collapseByDefault) {
    cy.on(DATA_LOADED_EVENT, () => instance.collapseAll());
  }
  return maybe.Just<CytoscapeExtension>(instance);
}

/**
 * This extension provides an interface to expand/collapse nodes for better management of complexity of `semantic-graph` compound nodes
 */
export interface SemanticGraphExpandCollapseExtensionConfig {
  /**
   * Whether to perform fisheye view after expand/collapse
   *
   * @default true
   */
  fisheye?: boolean;

  /**
   * Whether to animate on drawing changes
   *
   * @default true
   */
  animate?: boolean;

  /**
   * Whether cues are enabled
   *
   * @default true
   */
  cueEnabled?: boolean;

  /**
   * Size of the expand-collapse cue
   *
   * @default 12
   */
  expandCollapseCueSize?: number;

  /**
   * Size of lines used for drawing plus-minus icons
   *
   * @default 8
   */
  expandCollapseCueLineSize?: number;

  /**
   * Image of the expand icon
   */
  expandCueImage?: string;

  /**
   * Image of the collapse icon
   *
   */
  collapseCueImage?: string;

  /**
   * Sensitivity of the expand-collapse cues
   *
   * @default 1
   */
  expandCollapseCueSensitivity?: number;
}

/**
 * Initialize Cytoscape Expand-Collapse extension.
 *
 * @see https://github.com/iVis-at-Bilkent/cytoscape.js-expand-collapse
 */
export const CytoscapeExpandCollapse = registerCytoscapeExtension({
  name: 'expandCollapse',
  type: 'core',
  registrationFn: registerExpandCollapseExtension,
  initializationFn: initializeExpandCollapseExtension,
});
export default CytoscapeExpandCollapse;
