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

namespace spin {
  export var _NAMESPACE = 'http://spinrdf.org/spin#';

  export const Template = Rdf.iri(_NAMESPACE + 'Template');
  export const SelectTemplate = Rdf.iri(_NAMESPACE + 'SelectTemplate');
  export const ConstructTemplate = Rdf.iri(_NAMESPACE + 'ConstructTemplate');
  export const AskTemplate = Rdf.iri(_NAMESPACE + 'AskTemplate');
  export const UpdateTemplate = Rdf.iri(_NAMESPACE + 'UpdateTemplate');
  export const constraintProp = Rdf.iri(_NAMESPACE + 'constraint');
  export const bodyProp = Rdf.iri(_NAMESPACE + 'body');

  export var text = Rdf.iri(_NAMESPACE + 'text');
}

export default spin;
