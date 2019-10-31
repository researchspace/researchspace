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
export async function test_9(driver: WebDriver, test: Test, options: Options) {
  await test.test(
    '9) Find: Actors has met Year 800 AD - Year 1960 AD and is owner of Thing where Things has material type gold and created at Asia',
    async (t: Test) => await testSearch(driver, t, options, async (s, d) => {
      await s.setDomain('Actor');
      await s.setRange('Time');
      await s.setRelation('has met');
      await s.setDateFormat('YearRange');
      await s.setYearRange('800/AD', '1960/AD');
      const c1 = await s.getLastClause();

      await s.addAndClause(c1);
      await s.setRange('Thing');
      await s.setRelation('is owner of');
      await s.startNestedSearch();
      await s.setRange('Concept');
      await s.setRelation('has material type');
      await s.typeRange('gol');
      await s.toggleRangeNode('gold');
      await s.submitRangeTree();

      await s.getLastClause(); // skip clause
      const c3 = await s.getLastClause();
      await s.addAndClause(c3);
      await s.setRange('Place');
      await s.setRelation('created at');
      await s.typeRange('asia');
      await s.toggleRangeNode('Asia');
      await s.submitRangeTree();

      const results = await s.getSearchResults();
      await sameSets(t, results, await d.readData('9'));
    }));
}
