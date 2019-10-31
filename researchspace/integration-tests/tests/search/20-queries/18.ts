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
 * @author Artem Kozlov <ak@metaphacts.com>
 */
export async function test_18(driver: WebDriver, test: Test, options: Options) {
  await test.test(
    '18) Find: Things created on Year 800 BC - Year 300 BC and created at Greece and refers to Birth of Athena and has material type pottery',
    async (t: Test) => await testSearch(driver, t, options, async (s, d) => {
      await s.setDomain('Thing');
      await s.setRange('Time');
      await s.setRelation('created on');
      await s.setDateFormat('YearRange');
      await s.setYearRange('800/BC', '300/BC');

      const c1 = await s.getLastClause();
      await s.addAndClause(c1);
      await s.setRange('Place');
      await s.setRelation('created at');
      await s.typeRange('greece');
      await s.toggleRangeNode('Greece');
      await s.submitRangeTree();

      const c2 = await s.getLastClause();
      await s.addAndClause(c2);
      await s.setRange('Event');
      await s.setRelation('refers to');
      await s.typeRange('birth of athena');
      await s.selectRange('Birth of Athena');

      const c3 = await s.getLastClause();
      await s.addAndClause(c3);
      await s.setRange('Concept');
      await s.setRelation('has material type');
      await s.typeRange('pottery');
      await s.toggleRangeNode('pottery');
      await s.submitRangeTree();

      const results = await s.getSearchResults();
      await sameSets(t, results, [
        '<http://collection.britishmuseum.org/id/object/GAA7253>'
      ]);
    }));
}
