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

import {WebDriver} from 'selenium-webdriver';
import {Test} from 'tap';
import {Options} from '../options';
import {testSearch} from './util';
import {wait, waitLoaders, sameSets} from '../util';

export async function removeSearchClause(driver: WebDriver, t: Test, options: Options) {
  await t.test('Remove search clause', async (t: Test) => testSearch(driver, t, options, async (s, d) => {
    await s.setDomain('Thing');
    await s.setRange('Time');
    await s.setRelation('created on');
    await s.setDateFormat('YearRange');
    await s.setYearRange('0000/AD', '2000/AD');
    const c1 = await s.getLastClause();
    
    await s.addAndClause(c1);
    await s.setRange('Actor');
    await s.setRelation('acquired by');
    await s.typeRange('Bla');
    await s.selectRange('Peter Black');
    const c2 = await s.getLastClause();
    
    await s.addOrClause(c2);
    await s.typeRange('Bla');
    await s.selectRange('Bertie Black');
    
    await waitLoaders(driver);
    await wait(1000);
    const results1 = await s.getSearchResults();
    await sameSets(t, results1, await d.readData('result-set-1'));
    
    await s.removeConjunct('Bertie Black');

    await waitLoaders(driver);
    const results2 = await s.getSearchResults();
    await sameSets(t, results2, await d.readData('result-set-2'));
  }));
}