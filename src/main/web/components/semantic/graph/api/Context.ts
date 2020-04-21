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

import * as PropTypes from 'prop-types';

export const CytoscapeContextTypes = {
  cytoscapeApi: PropTypes.any.isRequired,
};

export interface CytoscapeContext {
  cytoscapeApi: ContextCytoscapeApi;
}

interface BaseCytoscapeApi {
  jQuery: JQueryStatic;
  cytoscape: Cy.Static;
  actions: {
    setLayout: (layout: Cy.LayoutOptions) => void;
    runLayout: () => void;
  };
}

export interface ContextCytoscapeApi extends BaseCytoscapeApi {
  instance: Data.Maybe<Cy.Instance>;
}

export interface CytoscapeApi extends BaseCytoscapeApi {
  instance: Cy.Instance;
}
