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
          value: 1,
        },
      };

      expect(serialize(just)).to.be.deep.equal(expected);

      expect(deserialize(serialize(just))).to.be.deep.equal(just);
    });

    it('serialize/deserialize nested "Just" part', () => {
      const just = maybe.Just(maybe.Just(Rdf.iri('http://example.com')));
      const expected = {
        '#type': 'Data.Maybe',
        '#value': {
          value: {
            '#type': 'Data.Maybe',
            '#value': {
              value: {
                '#type': 'Iri',
                '#value': {
                  termType: 'NamedNode',
                  value: 'http://example.com',
                },
              },
            },
          },
        },
      };

      expect(serialize(just)).to.be.deep.equal(expected);
      expect(deserialize(serialize(just))).to.be.instanceof(maybe);
      expect(deserialize(serialize(just))).to.be.deep.equal(just);
    });

    it('serialize/deserialize "Nothing" part', () => {
      let nothing = maybe.Nothing();
      expect(deserialize(serialize(nothing))).to.be.deep.equal(nothing);
    });
  });
});
