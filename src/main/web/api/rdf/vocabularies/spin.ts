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

module spin {
  export var _NAMESPACE = 'http://spinrdf.org/spin#';

  export const Template = RDF.iri(_NAMESPACE + 'Template');
  export const SelectTemplate = RDF.iri(_NAMESPACE + 'SelectTemplate');
  export const ConstructTemplate = RDF.iri(_NAMESPACE + 'ConstructTemplate');
  export const AskTemplate = RDF.iri(_NAMESPACE + 'AskTemplate');
  export const UpdateTemplate = RDF.iri(_NAMESPACE + 'UpdateTemplate');
  export const constraintProp = RDF.iri(_NAMESPACE + 'constraint');
  export const bodyProp = RDF.iri(_NAMESPACE + 'body');

  export var text = RDF.iri(_NAMESPACE + 'text');
}

export default spin;
