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

/**
 * @author Philip Polkovnikov
 * @author Artem Kozlov <ak@metaphacts.com>
 */

import * as webdriver from 'selenium-webdriver';
import * as _ from 'lodash';

const username: string = process.env.BROWSERSTACK_USERNAME as string;
const accessKey: string = process.env.BROWSERSTACK_ACCESS_KEY as string;
export const windows = (browser: string, version?: string) =>
  Object.assign({
    os: 'WINDOWS',
    os_version: '10',
    browserName: browser,
  }, browserOptions(browser));

export const osx = (browser: string) =>
  Object.assign({
    os: 'osx',
    os_version: 'Sierra',
    browserName: browser,
  }, browserOptions(browser));

function browserOptions(browser: string): any {
  switch (browser) {
  case 'Firefox':
    return {
      browser_version: '47' // can't use the latest version until https://github.com/SeleniumHQ/selenium/issues/3693 is resolved
    };
  case 'Chrome':
    return {
      'chromeOptions' : {
        'args' : ['--start-fullscreen']
      }
    };
  }
}

export function browserStack(settings: {[name: string]: string}) {
  return {
    name: settings['browserName'],
    createDriver: () => new webdriver.Builder()
      .usingServer('http://hub-cloud.browserstack.com/wd/hub')
      .withCapabilities(_.assign({}, settings, {
        'browserstack.user': username,
        'browserstack.key': accessKey,
        'resolution': '1920x1080',
      }))
      .build()
  };
}
