/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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

import { WebDriver } from 'selenium-webdriver';
import { Test } from 'tap';
import { Options } from '../../options';
import { testSearch } from '../util';
import { sameSets } from '../../util';

/**
 * added additional 'acquired at China' clause, because original query returned 50k results
 * and it would take too much time to check them all
 *
 * @author Artem Kozlov <ak@metaphacts.com>
 */
export async function test_4(driver: WebDriver, test: Test, options: Options) {
  await test.test(
    '4) Find: Events from Asia and created Thing where Things has material type gold or silver and found or acquired at China',
    async (t: Test) => await testSearch(driver, t, options, async (s, d) => {
      await s.setDomain('Event');
      await s.setRange('Place');
      await s.setRelation('from');
      await s.typeRange('Asia');
      await s.toggleRangeNode('Asia');
      await s.submitRangeTree();
      const c1 = await s.getLastClause();

      await s.addAndClause(c1);
      await s.setRange('Thing');
      await s.setRelation('created');
      await s.startNestedSearch();
      await s.setRange('Concept');
      await s.setRelation('has material type');
      await s.typeRange('gol');
      await s.toggleRangeNode('gold');
      await s.submitRangeTree();

      await s.getLastClause(); // skip clause
      const c3 = await s.getLastClause();
      await s.addOrClause(c3);
      await s.typeRange('silve');
      await s.toggleRangeNode('silver');
      await s.submitRangeTree();

      await s.addAndClause(c3);
      await s.setRange('Place');
      await s.setRelation('found or acquired at');
      await s.typeRange('China');
      await s.toggleRangeNode('China');
      await s.submitRangeTree();

      const results = await s.getSearchResults();
      await sameSets(t, results, await d.readData('4'));
    }));
}
