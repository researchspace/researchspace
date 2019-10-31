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
import { sameSets, waitLoaders } from '../../util';

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
export async function test_1(driver: WebDriver, test: Test, options: Options) {
  const setName = 'Things Set';
  await test.test(
    'clipboard 1) Find: Actors is owner ofentities from set: Things Set',
    async (t: Test) => {
      await testSearch(driver, t, options, async (s, d) => {
        await s.setDomain('Thing');
        await s.setRange('Actor');
        await s.setRelation('acquired by');
        await s.typeRange('Department of Greek and Roman');
        await s.selectRange('Department of Greek and Roman Antiquities, British Museum');
        await waitLoaders(driver);
        await s.saveSet(setName);
      });

      await testSearch(driver, test, options, async (s, d) => {
        await s.setDomain('Actor');
        await s.setRange('Thing');
        await s.setRelation('is owner of');
        await s.fillRangeFromSet(setName);
        const results = await s.getSearchResults();
        await sameSets(t, results, [
          '<http://collection.britishmuseum.org/id/person-institution/104636>',
          '<http://collection.britishmuseum.org/id/person-institution/114607>',
          '<http://collection.britishmuseum.org/id/person-institution/115445>',
          '<http://collection.britishmuseum.org/id/person-institution/171106>',
          '<http://collection.britishmuseum.org/id/person-institution/182209>',
          '<http://collection.britishmuseum.org/id/person-institution/58789>',
          '<http://collection.britishmuseum.org/id/person-institution/64572>',
          '<http://collection.britishmuseum.org/id/thesauri/department/C>',
          '<http://collection.britishmuseum.org/id/thesauri/department/P>',
          '<http://collection.britishmuseum.org/id/thesauri/nationality/American-USA>',
          '<http://collection.britishmuseum.org/id/thesauri/nationality/British>',
          '<http://collection.britishmuseum.org/id/thesauri/profession/academic/intellectual>',
          '<http://collection.britishmuseum.org/id/thesauri/profession/collector>',
          '<http://collection.britishmuseum.org/id/thesauri/profession/dealer/auction-house>',
          '<http://collection.britishmuseum.org/id/thesauri/profession/institution/organisation>'
        ]);

        await s.deleteSet(setName);
      });
    }
  );
}
