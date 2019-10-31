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

namespace persist {
  export const NAMESPACE = 'http://www.metaphacts.com/ontologies/persist/';

  export const COMPONENT_TYPE_PREFIX = NAMESPACE + 'components/';
  export const PersistedComponent = Rdf.iri(NAMESPACE + 'PersistedComponent');

  export const componentType = Rdf.iri(NAMESPACE + 'componentType');
  export const componentProps = Rdf.iri(NAMESPACE + 'componentProps');
  export const componentChildren = Rdf.iri(NAMESPACE + 'componentChildren');
  export const componentContext = Rdf.iri(NAMESPACE + 'componentContext');

  export const JsonNull = Rdf.iri(NAMESPACE + 'json/null');
  export const JsonUndefined = Rdf.iri(NAMESPACE + 'json/undefined');
}

export default persist;
