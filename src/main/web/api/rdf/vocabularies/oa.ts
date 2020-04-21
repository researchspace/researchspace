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

import Rdf = require('../core/Rdf');

module oa {
  export const _NAMESPACE = 'http://www.w3.org/ns/oa#';

  export const Annotation = Rdf.iri(_NAMESPACE + 'Annotation');
  export const SpecificResource = Rdf.iri(_NAMESPACE + 'SpecificResource');
  export const TextualBody = Rdf.iri(_NAMESPACE + 'TextualBody');
  export const RangeSelector = Rdf.iri(_NAMESPACE + 'RangeSelector');
  export const XPathSelector = Rdf.iri(_NAMESPACE + 'XPathSelector');
  export const TextPositionSelector = Rdf.iri(_NAMESPACE + 'TextPositionSelector');

  export const end = Rdf.iri(_NAMESPACE + 'end');
  export const hasBody = Rdf.iri(_NAMESPACE + 'hasBody');
  export const hasEndSelector = Rdf.iri(_NAMESPACE + 'hasEndSelector');
  export const hasRole = Rdf.iri(_NAMESPACE + 'hasRole');
  export const hasSelector = Rdf.iri(_NAMESPACE + 'hasSelector');
  export const hasSource = Rdf.iri(_NAMESPACE + 'hasSource');
  export const hasStartSelector = Rdf.iri(_NAMESPACE + 'hasStartSelector');
  export const hasTarget = Rdf.iri(_NAMESPACE + 'hasTarget');
  export const refinedBy = Rdf.iri(_NAMESPACE + 'refinedBy');
  export const start = Rdf.iri(_NAMESPACE + 'start');
  export const text = Rdf.iri(_NAMESPACE + 'text');
}

export default oa;
