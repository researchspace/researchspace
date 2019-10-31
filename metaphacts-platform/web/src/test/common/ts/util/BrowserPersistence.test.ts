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
