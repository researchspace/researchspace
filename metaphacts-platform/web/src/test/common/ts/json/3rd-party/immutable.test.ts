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

import { expect } from 'chai';
import * as maybe from 'data.maybe';
import { Record, Map, List } from 'immutable';

import { Rdf } from 'platform/api/rdf';
import { serialize, deserialize, recordSerializer } from 'platform/api/json';

describe('instance to json serialization', () => {
  describe('immutable.js serialization', () => {
    it('serialize/deserialize immutable.js Recrod', () => {
      const RecordX = Record({x: 1});
      const record = new RecordX({x: 2});
      recordSerializer('Record', RecordX);
      const expectedSerialization = {
        '#type': 'Record',
        '#value': {
          x: 2,
        },
      };

      expect(
        serialize(record)
      ).to.be.deep.equal(expectedSerialization);
      expect(
        deserialize(serialize(record))
      ).to.be.instanceof(Record);
      expect(
        deserialize(serialize(record))
      ).to.be.deep.equal(record);
    });

    it('serialize/deserialize immutable.js nested Recrod', () => {
      type RecordX = Record.IRecord<{x: Data.Maybe<Rdf.Iri>}>;
      const RecordX = Record<{x: Data.Maybe<Rdf.Iri>}>({x: null});
      recordSerializer('RecordX', RecordX);
      const RecordY = Record<{x: RecordX}>({x: null});
      recordSerializer('RecordY', RecordY);

      const record = new RecordY({
        x: RecordX({
          x: maybe.Just(Rdf.iri('http://example.com')),
        }),
      });
      const expectedSerialization = {
        '#type': 'RecordY',
        '#value': {
          x: {
            '#type': 'RecordX',
            '#value': {
              x: {
                '#type': 'Data.Maybe',
                '#value': {
                  value: {
                    '#type': 'Iri',
                    '#value': {
                      'termType': 'NamedNode',
                      'value': 'http://example.com',
                    },
                  },
                },
              },
            },
          },
        },
      };

      expect(
        serialize(record)
      ).to.be.deep.equal(expectedSerialization);
      expect(
        deserialize(serialize(record))
      ).to.be.instanceof(RecordY);
    });

    it('serialize/deserialize Immutable.Map', () => {
      const map = Map({x: 1, y: 2});
      const expectedSerialization = {
        '#type': 'Immutable.Map',
        '#value': {
          'x': 1,
          'y': 2,
        },
      };

      const serializedMap = serialize(map);
      expect(
        serializedMap
      ).to.be.deep.equal(expectedSerialization);
      expect(
        deserialize(serializedMap)
      ).to.be.instanceof(Map);
      expect(
        deserialize(serializedMap)
      ).to.be.deep.equal(map);
    });

    it('serialize/deserialize Immutable.List', () => {
      const list = List(['first', 'second']);

      const expectedSerialization = {
        '#type': 'Immutable.List',
        '#value': [ 'first', 'second' ],
      };
      const serializedList = serialize(list);

      expect(
        serializedList
      ).to.be.deep.equal(expectedSerialization);

      expect(
        deserialize(serializedList)
      ).to.be.instanceof(List);

      expect(
        deserialize(serializedList)
      ).to.be.deep.equal(list);

    });
  });
});
