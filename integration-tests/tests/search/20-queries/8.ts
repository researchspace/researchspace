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
export async function test_8(driver: WebDriver, test: Test, options: Options) {
  await test.test(
    '8) Find: Things created inProduction of Dead. Positively dead, paper (1868,0808.5792)',
    async (t: Test) => await testSearch(driver, t, options, async (s, d) => {
      await s.setDomain('Thing');
      await s.setRange('Event');
      await s.setRelation('created in');
      await s.typeRange('production of dead positively');
      await s.selectRange('Production of Dead. Positively dead, paper (1868,0808.5792)');

      const results = await s.getSearchResults();
      await sameSets(t, results, ['<http://collection.britishmuseum.org/id/object/PPA77219>']);
    }));
}
