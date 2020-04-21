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
export async function test_6(driver: WebDriver, test: Test, options: Options) {
  await test.test(
    '6) Find: Concepts has broader gold',
    async (t: Test) => await testSearch(driver, t, options, async (s, d) => {
      await s.setDomain('Concept');
      await s.setRange('Concept');
      await s.setRelation('has broader');
      await s.typeRange('gold');
      await s.toggleRangeNode('gold');
      await s.submitRangeTree();

      const results = await s.getSearchResults();
      await sameSets(t, results, ['thes:x114734']);
    }));
}
