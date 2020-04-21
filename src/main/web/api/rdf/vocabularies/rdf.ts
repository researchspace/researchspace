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

module rdf {
  export const _NAMESPACE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
  export const iri = (s: string) => Rdf.iri(_NAMESPACE + s);

  export const type = iri('type');
  export const langString = iri('langString');
  export const first = iri('first');
  export const rest = iri('rest');
  export const nil = iri('nil');
  export const value = iri('value');
}

export default rdf;
