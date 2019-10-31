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
