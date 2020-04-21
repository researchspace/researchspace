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
export async function test_20(driver: WebDriver, test: Test, options: Options) {
  await test.test(
    '20) Find: Actors refers to Greece or Cyprus or Egypt and is owner of The Parthenon Sculptures and refers to Pericles',
    async (t: Test) => await testSearch(driver, t, options, async (s, d) => {
      await s.setDomain('Actor');
      await s.setRange('Place');
      await s.setRelation('refers to');
      await s.typeRange('Greece');
      await s.toggleRangeNode('Greece');
      await s.submitRangeTree();
      const c1 = await s.getLastClause();

      await s.addOrClause(c1);
      await s.typeRange('Cyprus');
      await s.toggleRangeNode('Cyprus');
      await s.submitRangeTree();

      await s.addOrClause(c1);
      await s.typeRange('Egypt');
      await s.toggleRangeNode('Egypt');
      await s.submitRangeTree();

      await s.addAndClause(c1);
      await s.setRange('Thing');
      await s.setRelation('is owner of');
      await s.typeRange('The Parthenon Sculptures');
      await s.selectRange('The Parthenon Sculptures');
      const c2 = await s.getLastClause();

      await s.addOrClause(c2);
      await s.typeRange('Minotaur');
      await s.selectRange('Minotaur, gold (2011,4143.2)');

      await s.addAndClause(c2);
      await s.setRange('Actor');
      await s.setRelation('refers to');
      await s.typeRange('Pericles');
      await s.selectRange('Pericles');

      const results = await s.getSearchResults();
      await sameSets(t, results, [
        '<http://collection.britishmuseum.org/id/thesauri/nationality/British>',
        '<http://collection.britishmuseum.org/id/thesauri/nationality/French>',
        '<http://collection.britishmuseum.org/id/thesauri/profession/painter/draughtsman>',
        '<http://collection.britishmuseum.org/id/thesauri/profession/politician/statesman>',
        '<http://collection.britishmuseum.org/id/thesauri/profession/printmaker>'
      ]);
    }));
}
