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

import { assert } from 'chai';
import { SparqlUtil } from 'platform/api/sparql';


describe('SparqlUtils', () => {
  const TEST_QUERY = 'Hello   (!)world';
  it(`makeLuceneQuery('${TEST_QUERY}', escape, tokenize) => 'Hello* \\(\\!\\)world*'.`, () => {
    assert.equal(
      SparqlUtil.makeLuceneQuery(TEST_QUERY).value,
      'Hello* \\(\\!\\)world*'
    );
    assert.equal(
      SparqlUtil.makeLuceneQuery(TEST_QUERY, true, true).value,
      'Hello* \\(\\!\\)world*'
    );
  });
  it(`makeLuceneQuery('${TEST_QUERY}', escape, !tokenize) => 'Hello \\(\\!\\)world'.`, () => {
    assert.equal(
      SparqlUtil.makeLuceneQuery(TEST_QUERY, true, false).value,
      'Hello \\(\\!\\)world'
    );
  });
  it(`makeLuceneQuery('${TEST_QUERY}, !escape, tokenize) => 'Hello* (!)world*'.`, () => {
    assert.equal(
      SparqlUtil.makeLuceneQuery(TEST_QUERY, false, true).value,
      'Hello* (!)world*'
    );
  });
  it(`makeLuceneQuery('${TEST_QUERY}', !escape, !tokenize) => 'Hello (!)world'.`, () => {
    assert.equal(
      SparqlUtil.makeLuceneQuery(TEST_QUERY, false, false).value,
      'Hello (!)world'
    );
  });
});
