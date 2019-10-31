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

import { serializerFor, deserializerFor } from '../JsonCore';
import * as maybe from 'data.maybe';

/**
 * Serializers and deserializers for data.maybe.
 */
export function registerSerializersAndDeserializers() {

  serializerFor(
    {
      name: 'Data.Maybe',
      predicate: function(obj) {
        return obj instanceof maybe;
      },
      serializer: function(obj: Data.Maybe<any>) {
        if (obj.isNothing) {
          return {};
        } else {
          return {
            value: obj.get(),
          };
        }
      },
    }
  );
  deserializerFor({
    name: 'Data.Maybe',
    deserializer: function(object: any) {
      if (object.value) {
        return maybe.Just(object.value);
      } else {
        return maybe.Nothing();
      }
    },
  });

}
