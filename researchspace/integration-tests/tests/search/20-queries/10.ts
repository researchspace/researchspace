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
export async function test_10(driver: WebDriver, test: Test, options: Options) {
  await test.test(
    '10) Find: Things has type Egyptian hierogylphic and from Egypt',
    async (t: Test) => await testSearch(driver, t, options, async (s, d) => {
      await s.setDomain('Thing');
      await s.setRange('Concept');
      await s.setRelation('has type');
      await s.typeRange('egyptian');
      await s.toggleRangeNode('Egyptian hierogylphic');
      await s.submitRangeTree();
      const c1 = await s.getLastClause();

      await s.addAndClause(c1);
      await s.setRange('Place');
      await s.setRelation('from');
      await s.typeRange('egypt');
      await s.toggleRangeNode('Egypt');
      await s.submitRangeTree();

      const results = await s.getSearchResults();
      await sameSets(t, results, [
        '<http://collection.britishmuseum.org/id/object/GAA53407/inscription/1>',
        '<http://collection.britishmuseum.org/id/object/GAA59639/inscription/1>'
      ]);
    }));
}
