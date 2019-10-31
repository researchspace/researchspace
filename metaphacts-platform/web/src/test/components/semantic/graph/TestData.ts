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
