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

import * as _ from 'lodash';

import { SparqlClient } from 'platform/api/sparql';
import { Rdf } from 'platform/api/rdf';

/**
 * Transform sparql results to make sure that there are values in the bindings
 * for all projection variables. This simplify handling of results in visualization
 * components.
 */
export function prepareResultData(data: SparqlClient.SparqlSelectResult) {
  return _.each(data.results.bindings, (binding) =>
    _.map(data.head.vars, (bindingVar) => (binding[bindingVar] ? binding[bindingVar] : Rdf.literal('')))
  );
}

export * from './LoadingBackdrop';
export * from './ComponentUtils';
export * from './Action';
export * from './HideableLink';
export * from './ControlledProps';

// temporary re-export to minimize merge conflicts
export { BrowserPersistence } from 'platform/api/persistence';
