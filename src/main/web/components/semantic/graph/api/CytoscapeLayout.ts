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

import { ContextCytoscapeApi, CytoscapeApi } from './Context';
import { registerCytoscapeExtension, ExtensionContext, CytoscapeExtension } from './CytoscapeExtension';

type RegistrationFunction = (cytoscape: Cy.Static, jquery: JQueryStatic) => void;

/**
 * To map layout attributes values, e.g when layout accept function as an option
 * but function can't be passed as html attribute value.
 */
type MapOptionsFunction = (api: CytoscapeApi, options: Cy.LayoutOptions) => Cy.LayoutOptions;

export function registerCytoscapeLayout(
  name: string,
  registerFn: RegistrationFunction,
  mapOptionsFunction?: MapOptionsFunction
) {
  const registerFnWrapper = (api: ContextCytoscapeApi) => registerFn(api.cytoscape, api.jQuery);

  return registerCytoscapeExtension({
    name: name,
    type: 'layout',
    registrationFn: registerFnWrapper,
    initializationFn: initializeLayout(name, mapOptionsFunction),
  });
}

function initializeLayout(name: string, mapOptionsFunction?: MapOptionsFunction) {
  return function ({ cytoscapeApi, options }: ExtensionContext<Cy.LayoutOptions>): Data.Maybe<CytoscapeExtension> {
    let layoutOptions = assign<Cy.LayoutOptions>({ name: name }, options);
    layoutOptions = mapOptionsFunction ? mapOptionsFunction(cytoscapeApi, layoutOptions) : layoutOptions;
    cytoscapeApi.actions.setLayout(layoutOptions);
    return maybe.Nothing<CytoscapeExtension>();
  };
}
