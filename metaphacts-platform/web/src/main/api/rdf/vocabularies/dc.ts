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

import RDF = require('../core/Rdf');

module dc {
  export var _NAMESPACE = 'http://purl.org/dc/elements/1.1/';

  export var contributor = RDF.iri(_NAMESPACE + 'contributor');
  export var coverage = RDF.iri(_NAMESPACE + 'coverage');
  export var creator = RDF.iri(_NAMESPACE + 'creator');
  export var date = RDF.iri(_NAMESPACE + 'date');
  export var description = RDF.iri(_NAMESPACE + 'description');
  export var format = RDF.iri(_NAMESPACE + 'format');
  export var identifier = RDF.iri(_NAMESPACE + 'identifier');
  export var language = RDF.iri(_NAMESPACE + 'language');
  export var publisher = RDF.iri(_NAMESPACE + 'publisher');
  export var relation = RDF.iri(_NAMESPACE + 'relation');
  export var rights = RDF.iri(_NAMESPACE + 'rights');
  export var source = RDF.iri(_NAMESPACE + 'source');
  export var subject = RDF.iri(_NAMESPACE + 'subject');
  export var title = RDF.iri(_NAMESPACE + 'title');
  export var type = RDF.iri(_NAMESPACE + 'type');
}

export default dc;
