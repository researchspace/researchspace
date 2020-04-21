/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { WebDriver } from 'selenium-webdriver';
import { Test } from 'tap';
import { Options } from '../../options';
import { testSearch } from '../util';
import { sameSets } from '../../util';

export async function test_3(driver: WebDriver, test: Test, options: Options) {
  await test.test(
    '3) Find: Things has part Thing where Things created at Europe and created on Year 1000 BC - Year 2016 AD',
    async (t: Test) => await testSearch(driver, t, options, async (s, d) => {
      await s.setDomain('Thing');
      await s.setRange('Thing');
      await s.setRelation('has part');
      await s.startNestedSearch();
      await s.setRange('Place');
      await s.setRelation('created at');
      await s.typeRange('Europe');
      await s.toggleRangeNode('Europe');
      await s.submitRangeTree();

      await s.getLastClause(); // need to skip the first clause
      const c2 = await s.getLastClause();
      await s.addAndClause(c2);
      await s.setRange('Time');
      await s.setRelation('created on');
      await s.setDateFormat('YearRange');
      await s.setYearRange('1000/BC', '2016/AD');

      const expectedResult = 4071;
      const resultNumber = await s.getNumResults();
      await t.equal(expectedResult, resultNumber, 'correct number of intermediate results');

      await s.showFacet();
      const rel = await s.openFacetRelation('has technique type');
      await s.clickFacetCheckbox(rel, 'pierced');

      const results = await s.getSearchResults();
      await sameSets(t, results, await d.readData('3'));
    }));
}
