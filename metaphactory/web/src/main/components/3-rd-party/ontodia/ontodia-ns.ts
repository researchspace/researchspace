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

import { Rdf } from 'platform/api/rdf';

module ontodiaNs {
  export const _NAMESPACE = 'http://www.ontodia.org/schema/v1#';
  export const iri = (s: string) => Rdf.iri(_NAMESPACE + s);

  export const diagram = iri('diagram');
  export const diagramLayoutString = iri('diagramLayoutString');
}

export default ontodiaNs;
