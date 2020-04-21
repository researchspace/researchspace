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

import { Rdf } from 'platform/api/rdf';

export module foaf {
  export const _NAMESPACE = 'http://xmlns.com/foaf/0.1/';
  export const i = (s: string) => Rdf.iri(_NAMESPACE + s);

  export const knows = i('knows');
  export const member = i('member');
}

export module person {
  export const _NAMESPACE = 'http://example.com/person/';
  export const i = (s: string) => Rdf.iri(_NAMESPACE + s);

  export const alice = i('alice');
  export const bob = i('bob');
  export const carol = i('carol');
  export const mike = i('mike');
  export const sam = i('sam');
  export const W3C = i('W3C');
  export const W3C2 = i('W3C2');
}
