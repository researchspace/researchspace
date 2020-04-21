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

import { assign } from 'lodash';
import * as maybe from 'data.maybe';
import * as cytoscapeNavigator from 'cytoscape-navigator';
import 'cytoscape-navigator/cytoscape.js-navigator.css';

import { ModuleRegistry } from 'platform/api/module-loader';
import { ContextCytoscapeApi, registerCytoscapeExtension, ExtensionContext } from '../api/Api';

function registerNavigatorExtension(api: ContextCytoscapeApi) {
  cytoscapeNavigator(api.cytoscape, api.jQuery);
}

function initializeNavigatorExtension({
  cytoscapeApi,
  options,
}: ExtensionContext<Cy.Navigator.Options>): Data.Maybe<Cy.Navigator.Instance> {
  const container = createNavigatorContainer(options);
  const config = assign({}, options, { container: container });

  // add navigator container to cytoscape container
  cytoscapeApi.instance.container().appendChild(container);
  return maybe.Just(cytoscapeApi.instance.navigator(config));
}

function createNavigatorContainer(config: Cy.Navigator.Options): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'cytoscape-navigator';

  // propagate style attribute value from component attribute to navigator container
  container.setAttribute('style', config[ModuleRegistry.RAW_STYLE_ATTRIBUTE]);

  // assumption here is that cytoscape instance container has relative position
  // so navigator container absolutely positioned in it
  container.style.position = 'absolute';
  return container;
}

/**
 * Bird's eye view pan and zoom control for `semantic-graph` component
 */
export interface SemanticGraphNavigatorExtensionConfig {
  /**
   * Additional CSS styles for navigation container
   */
  style?: string;

  /**
   * Set `false` to update graph pan only on drag end; set `0` to do it instantly; set a number (frames per second) to update not more than N times per second
   *
   * @default 0
   */
  viewLiveFramerate?: number | false;

  /**
   * Max thumbnail's updates per second triggered by graph updates
   *
   * @default 30
   */
  thumbnailEventFramerate?: number;

  /**
   * Max thumbnail's updates per second. Set false to disable
   *
   * @default false
   */
  thumbnailLiveFramerate?: number | false;

  /**
   * Double-click delay in milliseconds
   *
   * @default 200
   */
  dblClickDelay?: number;

  /**
   * Milliseconds to throttle rerender updates to the panzoom for performance
   *
   * @default 100
   */
  rerenderDelay?: number;
}

/**
 * Cytoscape extension for birds-eye style navigation.
 *
 * @see https://github.com/cytoscape/cytoscape.js-navigator
 */
export const CytoscapeNavigator = registerCytoscapeExtension({
  name: 'navigator',
  type: 'core',
  registrationFn: registerNavigatorExtension,
  initializationFn: initializeNavigatorExtension,
});
export default CytoscapeNavigator;
export type Config = Cy.Navigator.Options;
