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
export async function test_15(driver: WebDriver, test: Test, options: Options) {
  await test.test(
    '15) Find: Actors refers to USSR or Russia Europe and performed action at Year 1700 AD - Year 2000 AD',
    async (t: Test) => await testSearch(driver, t, options, async (s, d) => {
      await s.setDomain('Actor');
      await s.setRange('Place');
      await s.setRelation('refers to');
      await s.typeRange('ussr');
      await s.toggleRangeNode('USSR');
      await s.submitRangeTree();

      const c1 = await s.getLastClause();
      await s.addOrClause(c1);
      await s.typeRange('russia');
      await s.toggleRangeNode('Russia Europe');
      await s.submitRangeTree();

      await s.addAndClause(c1);
      await s.setRange('Time');
      await s.setRelation('performed action at');
      await s.setDateFormat('YearRange');
      await s.setYearRange('1700/AD', '2000/AD');

      const results = await s.getSearchResults();
      await sameSets(t, results, await d.readData('15'));
    }));
}
