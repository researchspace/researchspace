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
import { waitLoaders, sameSets } from '../../util';

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
export async function test_14(driver: WebDriver, test: Test, options: Options) {
  await test.test(
    '14) Find: Things refers to Death of Chatham or Death or English History and "duke"',
    async (t: Test) => await testSearch(driver, t, options, async (s, d) => {
      await s.setDomain('Thing');
      await s.setRange('Event');
      await s.setRelation('refers to');
      await s.typeRange('death of chath');
      await s.selectRange('Death of Chatham');

      const c1 = await s.getLastClause();
      await s.addOrClause(c1);
      await s.typeRange('death');
      await s.selectRange('Death');

      await s.addOrClause(c1);
      await s.typeRange('english history');
      await s.selectRange('English History');

      await s.addAndClause(c1);
      await s.setRange('Text search');
      await s.typeTextRange('duke');

      const results = await s.getSearchResults();
      await sameSets(t, results, [
        '<http://collection.britishmuseum.org/id/object/PDB8162>',
        '<http://collection.britishmuseum.org/id/object/PDB8162/inscription/1>',
        '<http://collection.britishmuseum.org/id/object/PDB8395>'
      ]);
    }));
}
