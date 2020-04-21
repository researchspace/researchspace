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

import { BrowserPersistence } from 'platform/components/utils';

const value = 'bar';
const namespace = 'test';

describe('LocalPersistence', () => {
  it('can save value', () => {
    expect(BrowserPersistence).to.respondTo('setItem');
  });

  it('can read value', () => {
    expect(BrowserPersistence).to.respondTo('getItem');
    BrowserPersistence.setItem('foo', value, namespace);
    expect(BrowserPersistence.getItem('foo', namespace)).to.be.eql(value);
  });

  it('can clear values', () => {
    expect(BrowserPersistence).to.respondTo('removeItem');
    BrowserPersistence.setItem('foo', value, namespace);
    BrowserPersistence.removeItem('foo', namespace);
    expect(BrowserPersistence.getItem('foo', namespace)).to.be.null;
  });
});
