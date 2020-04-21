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

import { serialize, deserialize } from 'platform/api/json';

describe('instance to json serialization', () => {
  describe('plain javascirpt objects serialization', () => {
    it('keeps number unchanged', () => {
      const num = 1;
      expect(deserialize(serialize(num))).to.be.equals(num);
    });

    it('keeps string unchanged', () => {
      const str = 'test';
      expect(deserialize(serialize(str))).to.be.equals(str);
    });

    it('keeps plain object unchanged', () => {
      const obj = { x: 1 };
      expect(deserialize(serialize(obj))).to.be.deep.equal(obj);
    });

    it('keeps null unchanged', () => {
      expect(deserialize(serialize(null))).to.be.equals(null);
    });

    it('keeps array unchanged', () => {
      const array = [{ x: 1 }];
      expect(deserialize(serialize(array))).to.be.deep.equal(array);
    });
  });
});
