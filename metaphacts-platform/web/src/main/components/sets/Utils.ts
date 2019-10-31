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
import { trigger } from 'platform/api/events';
import { getSetServiceForUser } from 'platform/api/services/ldp-set';
import { SetManagementEvents } from 'platform/api/services/ldp-set/SetManagementEvents';
import { List } from 'immutable';

export function createNewSetFromItems(source: string, name: string, items: Rdf.Iri[]) {
  return getSetServiceForUser().flatMap(
    service => service.createSetAndAddItems(name, List(items))
  ).onValue(value => {
    trigger(
      {eventType: SetManagementEvents.SetAdded, source: source}
    );
  });
}
