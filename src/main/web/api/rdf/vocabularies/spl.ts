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

import RDF = require('../core/Rdf');

module spl {
  export const _NAMESPACE = 'http://spinrdf.org/spl#';

  export const optionalProp = RDF.iri(_NAMESPACE + 'optional');
  export const predicateProp = RDF.iri(_NAMESPACE + 'predicate');
  export const valueTypeProp = RDF.iri(_NAMESPACE + 'valueType');
  export const defaultValue = RDF.iri(_NAMESPACE + 'defaultValue');
  export const Argument = RDF.iri(_NAMESPACE + 'Argument');
}

export default spl;
