/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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

/**
 * @author Philip Polkovnikov
 */

import * as t from 'tap';

// this line disables promise manager (https://github.com/SeleniumHQ/selenium/wiki/WebDriverJs)
// it has to be require(...) to work (https://github.com/Microsoft/TypeScript/issues/6751)
require('selenium-webdriver/lib/promise').USE_PROMISE_MANAGER = false;

import {getTargets} from './config/machines';
import {searchTest} from './tests/search';
import { authorize } from './tests/util';

(async function () {
  const machine = process.argv.length >= 3 && process.argv[2] || 'local';
  const {targets, options} = getTargets(machine);

  for (let {name, createDriver} of targets) {
    await t.test(name, async (t) => {
      const driver = createDriver();
      await driver.manage().window().maximize();

      if (!options.noLogin) {
        await authorize(driver, t, options.loginUrl || "", options.username || "", options.password || "");
      }

      await searchTest(driver, t, options);
      await driver.quit();
    });
  }
})();
