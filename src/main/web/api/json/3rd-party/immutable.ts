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

import * as Immutable from 'immutable';
import { serializerFor, deserializerFor } from '../JsonCore';

/**
 * Serializers and deserializers for Immutable.js.
 */
export function registerSerializersAndDeserializers() {
  // for Immutable.OrderedSet
  serializerFor({
    name: 'Immutable.Set',
    predicate: function (obj) {
      return obj instanceof Immutable.Set;
    },
    serializer: function (obj: any) {
      return obj.toArray();
    },
  });
  deserializerFor({
    name: 'Immutable.Set',
    deserializer: function (object: any) {
      return Immutable.Set((<any>Immutable).Seq.Indexed(object));
    },
  });

  // for Immutable.OrderedSet
  serializerFor({
    name: 'Immutable.OrderedSet',
    predicate: function (obj) {
      return obj instanceof Immutable.OrderedSet;
    },
    serializer: function (obj: any) {
      return obj.toArray();
    },
  });
  deserializerFor({
    name: 'Immutable.OrderedSet',
    deserializer: function (object: any) {
      return Immutable.OrderedSet((<any>Immutable).Seq.Indexed(object));
    },
  });

  // for Immutable.List
  serializerFor({
    name: 'Immutable.List',
    predicate: function (obj) {
      return obj instanceof Immutable.List;
    },
    serializer: function (obj: any) {
      return obj.toArray();
    },
  });
  deserializerFor({
    name: 'Immutable.List',
    deserializer: function (object: any) {
      return Immutable.List((<any>Immutable).Seq.Indexed(object));
    },
  });

  // for Immutable.OrderedMap
  serializerFor({
    name: 'Immutable.OrderedMap',
    predicate: function (obj) {
      return obj instanceof Immutable.OrderedMap;
    },
    serializer: function (obj: any) {
      return obj.toObject();
    },
  });
  deserializerFor({
    name: 'Immutable.OrderedMap',
    deserializer: function (object: any) {
      return Immutable.OrderedMap((<any>Immutable).Seq.Keyed(object));
    },
  });

  // for Immutable.Map
  serializerFor({
    name: 'Immutable.Map',
    predicate: function (obj) {
      return obj instanceof Immutable.Map;
    },
    serializer: function (obj: any) {
      return obj.toObject();
    },
  });
  deserializerFor({
    name: 'Immutable.Map',
    deserializer: function (object: any) {
      return Immutable.Map((<any>Immutable).Seq.Keyed(object));
    },
  });
}

export function recordSerializer<T>(name: string, constructorFn: Immutable.Record.Factory<T>) {
  serializerFor<T>({
    name: name,
    predicate: (obj) => obj instanceof constructorFn,
    serializer: (record) => {
      return (<any>record).toObject();
    },
  });
  deserializerFor({
    name: name,
    deserializer: (obj) => new constructorFn(<T>obj),
  });
}
