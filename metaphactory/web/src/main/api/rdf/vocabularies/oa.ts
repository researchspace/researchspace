/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

module oa {
  export var _NAMESPACE = 'http://www.w3.org/ns/oa#';

  export var Annotation = RDF.iri(_NAMESPACE + 'Annotation');
  export var TextualBody = RDF.iri(_NAMESPACE + 'TextualBody');

  export var hasBody = RDF.iri(_NAMESPACE + 'hasBody');
  export var hasTarget = RDF.iri(_NAMESPACE + 'hasTarget');
  export var text = RDF.iri(_NAMESPACE + 'text');
  export var hasRole = RDF.iri(_NAMESPACE + 'hasRole');
}

export default oa;
