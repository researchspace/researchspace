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

namespace sp {
  export var _NAMESPACE = 'http://spinrdf.org/sp#';

  export var Query = Rdf.iri(_NAMESPACE + 'Query');
  export const Ask = Rdf.iri(_NAMESPACE + 'Ask');
  export const Select = Rdf.iri(_NAMESPACE + 'Select');
  export const Describe = Rdf.iri(_NAMESPACE + 'Describe');
  export const Construct = Rdf.iri(_NAMESPACE + 'Construct');
  export const Update = Rdf.iri(_NAMESPACE + 'Update');

  export var text = Rdf.iri(_NAMESPACE + 'text');
}

export default sp;
