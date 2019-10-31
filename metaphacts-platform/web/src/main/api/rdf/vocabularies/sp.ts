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

module sp {
  export var _NAMESPACE = 'http://spinrdf.org/sp#';

  export var Query = RDF.iri(_NAMESPACE + 'Query');
  export const Ask = RDF.iri(_NAMESPACE + 'Ask');
  export const Select = RDF.iri(_NAMESPACE + 'Select');
  export const Describe = RDF.iri(_NAMESPACE + 'Describe');
  export const Construct = RDF.iri(_NAMESPACE + 'Construct');
  export const Update = RDF.iri(_NAMESPACE + 'Update');

  export var text = RDF.iri(_NAMESPACE + 'text');
}

export default sp;
