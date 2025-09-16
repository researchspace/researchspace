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

namespace dc {
  export var _NAMESPACE = 'http://purl.org/dc/elements/1.1/';

  export var contributor = Rdf.iri(_NAMESPACE + 'contributor');
  export var coverage = Rdf.iri(_NAMESPACE + 'coverage');
  export var creator = Rdf.iri(_NAMESPACE + 'creator');
  export var date = Rdf.iri(_NAMESPACE + 'date');
  export var description = Rdf.iri(_NAMESPACE + 'description');
  export var format = Rdf.iri(_NAMESPACE + 'format');
  export var identifier = Rdf.iri(_NAMESPACE + 'identifier');
  export var language = Rdf.iri(_NAMESPACE + 'language');
  export var publisher = Rdf.iri(_NAMESPACE + 'publisher');
  export var relation = Rdf.iri(_NAMESPACE + 'relation');
  export var rights = Rdf.iri(_NAMESPACE + 'rights');
  export var source = Rdf.iri(_NAMESPACE + 'source');
  export var subject = Rdf.iri(_NAMESPACE + 'subject');
  export var title = Rdf.iri(_NAMESPACE + 'title');
  export var type = Rdf.iri(_NAMESPACE + 'type');
}

export default dc;
