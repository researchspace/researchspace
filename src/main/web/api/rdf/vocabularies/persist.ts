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

import * as Rdf from '../core/Rdf';

namespace persist {
  export const NAMESPACE = 'http://www.researchspace.org/ontologies/persist/';

  export const COMPONENT_TYPE_PREFIX = NAMESPACE + 'components/';
  export const PersistedComponent = Rdf.iri(NAMESPACE + 'PersistedComponent');

  export const componentType = Rdf.iri(NAMESPACE + 'componentType');
  export const componentProps = Rdf.iri(NAMESPACE + 'componentProps');
  export const componentChildren = Rdf.iri(NAMESPACE + 'componentChildren');
  export const componentContext = Rdf.iri(NAMESPACE + 'componentContext');

  export const JsonNull = Rdf.iri(NAMESPACE + 'json/null');
  export const JsonUndefined = Rdf.iri(NAMESPACE + 'json/undefined');
}

export default persist;
