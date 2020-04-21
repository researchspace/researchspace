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
import { Component, ComponentClass } from 'react';
import * as maybe from 'data.maybe';

import * as CytoscapeCore from 'cytoscape/src/core/index';

import { CytoscapeContext, CytoscapeContextTypes, CytoscapeApi, ContextCytoscapeApi } from './Context';

export interface CytoscapeExtension {
  destroy(): void;
}

export interface ExtensionContext<Options> {
  cytoscapeApi: CytoscapeApi;
  options: Options;
}

export interface InitializationFunction<Options> {
  (context: ExtensionContext<Options>): Data.Maybe<CytoscapeExtension>;
}

export interface RegistrationFunction {
  (api: ContextCytoscapeApi);
}

/**
 * http://js.cytoscape.org/#extensions/api
 */
export type ExtensionType = 'core' | 'collection' | 'layout' | 'renderer';

export interface ExtensionParams<Options> {
  name: string;
  type: ExtensionType;
  registrationFn: RegistrationFunction;
  initializationFn: InitializationFunction<Options>;
}

export function registerCytoscapeExtension<Options>({
  name,
  registrationFn,
  initializationFn,
}: ExtensionParams<Options>): ComponentClass<Options> {
  interface ExtensionState {
    instance: Data.Maybe<CytoscapeExtension>;
  }

  return class CytoscapeExtensionComponent extends Component<Options, ExtensionState> {
    static contextTypes = CytoscapeContextTypes;
    context: CytoscapeContext;

    constructor(props: Options, context: CytoscapeContext) {
      super(props, context);

      this.state = {
        instance: maybe.Nothing<CytoscapeExtension>(),
      };
    }

    componentDidMount() {
      this.registerExtension(this.props, this.context.cytoscapeApi);
    }

    componentWillUnmount() {
      this.state.instance.map((instance) => {
        // for layouts, instance can be actual cytoscape instance
        // we shouldn't destroy it here
        const isCyInstance = this.context.cytoscapeApi.instance.map((cy) => cy === instance).getOrElse(false);
        if (!isCyInstance && instance.destroy) {
          instance.destroy();
        }
      });
    }

    private registerExtension(props: Options, cytoscapeApi: ContextCytoscapeApi) {
      const { instance } = cytoscapeApi;

      // quick and dirty way to check if extension has been already registered,
      // it uses non-public cytoscape API
      // maybe someday there will be better solution
      // see https://github.com/cytoscape/cytoscape.js/issues/1585
      if (!CytoscapeCore.prototype[name]) {
        registrationFn(cytoscapeApi);
      }
      instance.map((cy) => {
        const api = assign({}, cytoscapeApi, { instance: cy }) as CytoscapeApi;
        cy.ready(this.onCytoscapeReady(api, props));
      });
    }

    private onCytoscapeReady = (api: CytoscapeApi, options: Options) => (event: Cy.EventObject) => {
      const extensionContext = { options: options, cytoscapeApi: api };
      this.setState({
        instance: initializationFn(extensionContext),
      });
    };

    render() {
      return null;
    }
  };
}

export default registerCytoscapeExtension;
