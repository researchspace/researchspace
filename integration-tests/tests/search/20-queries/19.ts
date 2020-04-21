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

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
export async function test_19(driver: WebDriver, test: Test, options: Options) {
  await test.test(
    '19) Find: Things refers to Year 200 AD - Year 800 AD and has material type organic or Concept where Concepts is type of Death or Birthday and is type of Europe',
    async (t: Test) => await testSearch(driver, t, options, async (s, d) => {
      await s.setDomain('Thing');
      await s.setRange('Time');
      await s.setRelation('refers to');
      await s.setDateFormat('YearRange');
      await s.setYearRange('200/AD', '800/AD');

      const c1 = await s.getLastClause();
      await s.addAndClause(c1);
      await s.setRange('Concept');
      await s.setRelation('has material type');
      await s.typeRange('organic');
      await s.toggleRangeNode('organic');
      await s.submitRangeTree();

      const c2 = await s.getLastClause();
      await s.addOrClause(c2);
      await s.startNestedSearch();
      await s.setRange('Event');
      await s.setRelation('is type of');
      await s.typeRange('death');
      await s.selectRange('Death');

      const c3 = await s.getLastClause();
      await s.addOrClause(c3);
      await s.typeRange('birthday');
      await s.selectRange('Birthday');

      await s.addAndClause(c3);
      await s.setRange('Place');
      await s.setRelation('is type of');
      await s.typeRange('europe');
      await s.toggleRangeNode('Europe');
      await s.submitRangeTree();

      const results = await s.getSearchResults();
      await sameSets(t, results, await d.readData('19'));
    }));
}
