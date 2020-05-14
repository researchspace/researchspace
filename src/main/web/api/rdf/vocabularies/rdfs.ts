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

module rdfs {
  export var _NAMESPACE = 'http://www.w3.org/2000/01/rdf-schema#';
  export const iri = (s: string) => Rdf.iri(_NAMESPACE + s);

  export const label = iri('label');
  export const domain = iri('domain');
  export const range = iri('range');
  export const comment = iri('comment');
  export const subClassOf = iri('subClassOf');

  export const Resource = iri('Resource');
}

export default rdfs;
