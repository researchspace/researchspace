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

import { assert, expect } from 'chai';
import * as Immutable from 'immutable';

import { Rdf, vocabularies } from 'platform/api/rdf';

import { _makeCellComparator, _makeCellFilterer } from 'platform/components/semantic/table/Table';

const {xsd} = vocabularies;

describe('SemanticTable', () => {
  it('sorts column data with prefetched labels and numeric data', () => {
    const sourceData: Rdf.Node[] = [
      Rdf.literal('03', xsd.double),
      Rdf.literal('003'),
      Rdf.iri('http://example.com/04-eee'),
      Rdf.literal('2.1', xsd.float),
      Rdf.iri('http://example.com/01-ccc'),
      Rdf.literal('-1', xsd.negativeInteger),
      Rdf.iri('http://example.com/05-ddd'),
      Rdf.literal('2.901', xsd.decimal),
      Rdf.iri('http://example.com/02-bbb'),
      Rdf.literal('1', xsd.integer),
      Rdf.iri('http://example.com/03-aaa'),
      Rdf.literal('bbb2'),
      Rdf.literal('bbb1'),
      Rdf.literal('bb'),
    ];

    const sortedData: ReadonlyArray<Rdf.Node> = [
      Rdf.literal('-1', xsd.negativeInteger),
      Rdf.literal('003'),
      Rdf.literal('1', xsd.integer),
      Rdf.literal('2.1', xsd.float),
      Rdf.literal('2.901', xsd.decimal),
      Rdf.literal('03', xsd.double),
      Rdf.iri('http://example.com/03-aaa'),
      Rdf.literal('bb'),
      Rdf.iri('http://example.com/02-bbb'),
      Rdf.literal('bbb1'),
      Rdf.literal('bbb2'),
      Rdf.iri('http://example.com/01-ccc'),
      Rdf.iri('http://example.com/05-ddd'),
      Rdf.iri('http://example.com/04-eee'),
    ];

    const dataLabels = Immutable.Map<Rdf.Iri, string>([
      [Rdf.iri('http://example.com/03-aaa'), 'aaa'],
      [Rdf.iri('http://example.com/02-bbb'), 'bbb'],
      [Rdf.iri('http://example.com/01-ccc'), 'ccc'],
      [Rdf.iri('http://example.com/05-ddd'), 'ddd'],
    ]);

    sourceData.sort(_makeCellComparator({
      getLabel: iri => dataLabels.get(iri)
    }));
    for (let i = 0; i < sourceData.length; i++) {
      if (!sourceData[i].equals(sortedData[i])) {
        const result = `[${sourceData.join(',\n')}]`;
        const expected = `[${sortedData.join(',\n')}]`;
        assert(false,
          `Sorting column values returned different result: ` +
          `${result} but expected ${expected}`
        );
      }
    }
  });

  it('filters column data with prefetched labels and primitive values', () => {
    interface TableItem {
      iri: Rdf.Iri,
      literal?: Rdf.Literal,
      num?: number,
      str?: string,
    }

    const items: TableItem[] = [
      /* 0 */ {iri: Rdf.iri('http://example.com/1')},
      /* 1 */ {iri: Rdf.iri('http://example.com/242')},
      /* 2 */ {iri: Rdf.iri('http://example.com/3')},
      /* 3 */ {iri: Rdf.iri('http://example.com/4'), str: 'something42!!'},
      /* 4 */ {iri: Rdf.iri('http://example.com/5'), num: 1642},
      /* 5 */ {iri: Rdf.iri('http://example.com/642')},
      /* 6 */ {iri: Rdf.iri('http://example.com/7'), str: 'not-forty-two', num: -2},
    ];

    const dataLabels = Immutable.Map<Rdf.Iri, string>([
      [Rdf.iri('http://example.com/1'), 'aaa42'],
      [Rdf.iri('http://example.com/242'), 'bbb'],
      [Rdf.iri('http://example.com/3'), 'ccc'],
    ]);

    const expectedFilteredItems = [
      items[0],
      items[1],
      items[3],
      items[4],
      items[5],
    ];

    const filterCells = _makeCellFilterer({
      getLabel: iri => dataLabels.get(iri)
    });

    const resultFilteredItems = filterCells(items, '42');
    expect(resultFilteredItems).to.eql(expectedFilteredItems);
  });
});
