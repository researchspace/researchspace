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

import { test_1 } from './1';
import { test_2 } from './2';
import { test_3 } from './3';
import { test_4 } from './4';
import { test_6 } from './6';

import { test_8 } from './8';
import { test_9 } from './9';
import { test_10 } from './10';
import { test_11 } from './11';
import { test_13 } from './13';
import { test_14 } from './14';
import { test_15 } from './15';
import { test_16 } from './16';
import { test_17 } from './17';
import { test_18 } from './18';
import { test_19 } from './19';
import { test_20 } from './20';

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
export async function search20Tests(driver: WebDriver, t: Test, options: Options) {
  await test_1(driver, t, options);
  await test_2(driver, t, options);
  await test_3(driver, t, options);
  await test_4(driver, t, options);
  // query 5 is missing because there is some problem with 'found by' FR
  await test_6(driver, t, options);
  // query 7 is missing because there is some problem with 'from' FR
  // disabled because label for event and sub-event is the same
  // await test_8(driver, t, options);
  await test_9(driver, t, options);
  // disabled, because inscription don't have associated places
  // await test_10(driver, t, options);
  await test_11(driver, t, options);
  // query 12 is omitted because I think it correctly returns 0, we don't index P3_has_note in solr as of now, Andrey has changed the script for solr, so we can add the test when new index is available
  await test_13(driver, t, options);
  await test_14(driver, t, options);
  await test_15(driver, t, options);
  await test_16(driver, t, options);
  await test_17(driver, t, options);
  await test_18(driver, t, options);
  await test_19(driver, t, options);
  await test_20(driver, t, options);
}
