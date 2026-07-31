/**
 * ResearchSpace
 * Copyright (C) 2026
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
import * as SparqlJs from 'sparqljs';

import { SparqlUtil } from 'platform/api/sparql';
import { transformRangePattern } from 'platform/components/semantic/search/data/Common';

describe('semantic search range patterns', () => {
  it('replaces top-level range filters with facet value bindings', () => {
    const patterns = SparqlUtil.parsePatterns(`
      $subject <http://example.com/date> ?date .
      ?date <http://example.com/begin> ?begin .
      ?date <http://example.com/end> ?end .
      FILTER(?begin <= ?__dateEndValue__) .
      FILTER(?end >= ?__dateBeginValue__) .
    `);

    const transformed = transformRangePattern(
      patterns,
      { begin: '__dateBeginValue__', end: '__dateEndValue__' },
      { begin: 'dateBeginValue', end: 'dateEndValue' }
    );
    const bindings = transformed.filter((pattern) => pattern.type === 'bind') as SparqlJs.BindPattern[];

    expect(bindings).to.have.length(2);
    expect(bindings[0].variable).to.equal('?dateBeginValue');
    expect(bindings[0].expression).to.equal('?begin');
    expect(bindings[1].variable).to.equal('?dateEndValue');
    expect(bindings[1].expression).to.equal('?end');
  });
});
