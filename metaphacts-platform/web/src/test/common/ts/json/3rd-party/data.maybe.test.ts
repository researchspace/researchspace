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

import { Rdf } from 'platform/api/rdf';
import { serialize, deserialize } from 'platform/api/json';

describe('instance to json serialization', () => {
  describe('maybe serialization', () => {
    it('serialize/deserialize "Just" part', () => {
      const just = maybe.Just(1);
      const expected = {
        '#type': 'Data.Maybe',
        '#value': {
          'value': 1,
        },
      };

      expect(
        serialize(just)
      ).to.be.deep.equal(expected);

      expect(
        deserialize(serialize(just))
      ).to.be.deep.equal(just);
    });

    it('serialize/deserialize nested "Just" part', () => {
      const just = maybe.Just(maybe.Just(Rdf.iri('http://example.com')));
      const expected = {
        '#type': 'Data.Maybe',
        '#value': {
          'value': {
            '#type': 'Data.Maybe',
            '#value': {
              'value': {
                '#type': 'Iri',
                '#value': {
                  'termType': 'NamedNode',
                  'value': 'http://example.com',
                },
              },
            },
          },
        },
      };

      expect(
        serialize(just)
      ).to.be.deep.equal(expected);
      expect(
        deserialize(serialize(just))
      ).to.be.instanceof(maybe);
      expect(
        deserialize(serialize(just))
      ).to.be.deep.equal(just);
    });

    it('serialize/deserialize "Nothing" part', () => {
      let nothing = maybe.Nothing();
      expect(
        deserialize(serialize(nothing))
      ).to.be.deep.equal(nothing);
    });
  });
});
