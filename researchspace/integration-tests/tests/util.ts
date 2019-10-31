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

import {WebDriver, By, WebElement, until, Condition} from 'selenium-webdriver';
import * as asyncQ from 'async-q';
import {Test} from 'tap';
import * as _ from 'lodash';
/**
 * Print element into browser's developer console. More descriptive than `console.log` in Node.js
 * @param element element to print
 * @param mark optional description
 */
export async function debugElement(element: WebElement, mark: string = "") {
  const driver = element.getDriver();
  await driver.executeScript(`
    console.log(arguments[0], arguments[1]);
  `, mark, element);
}

/**
 * Test if two arrays are same up to reordering
 * @param t parent test object
 * @param set1 first set
 * @param set2 second set
 */
export async function sameSets<T>(t: Test, set1: T[], set2: T[]) {
  await t.same(set1.sort(), set2.sort());
}

/**
 * Sleep
 * @param time sleep time in milliseconds
 */
export const wait = (time: number) => new Promise((resolve, reject) => setTimeout(resolve, time));

/**
 * Wait until the page is loaded
 */
export async function waitPageLoad(driver: WebDriver) {
  for (;;) {
    const result = await driver.executeScript('return document.readyState');
    if (result == "complete") break;
    await wait(100);
  }
}

/**
 * Find element, ensure it's the only one
 */
export async function findOnlyElement(driver: WebDriver, t: Test, selector: string) {
  const elements = await driver.findElements(By.css(selector));
  await t.ok(elements.length == 1, `only one element of ${selector} type (got ${elements.length})`);
  return elements[0];
}

/**
 * Find element inside of parent, ensure it's the only one
 */
export async function findOnlyChild(driver: WebDriver, t: Test, parent: WebElement, selector: string) {
  const elements = await parent.findElements(By.css(selector));
  await t.ok(elements.length == 1, `only one child element of ${selector} type (got ${elements.length})`);
  return elements[0];
}

/**
 * Fill input field by field name
 */
export async function setInputValueByName(driver: WebDriver, t: Test, name: string, value: string) {
  const input = await findOnlyElement(driver, t, `input[name=${name}]`);
  return await input.sendKeys(value);
}

/**
 * Fill input field by selector
 */
export async function setInputValueBySelector(driver: WebDriver, t: Test, selector: string, value: string) {
  const input = await findOnlyElement(driver, t, selector);
  return await input.sendKeys(value);
}

/**
 * Submit form
 */
export async function submit(driver: WebDriver, t: Test) {
  const button = await findOnlyElement(driver, t, 'input[type=submit]');
  await button.click();
}

/**
 * Open page and wait for its contents to load
 */
export async function get(driver: WebDriver, url: string) {
  await driver.get(url);
  await waitPageLoad(driver);
}

/**
 * Wait for an element to show on the page
 */
export async function waitElement(driver: WebDriver, selector: string) {
  await driver.wait(
    until.elementLocated(By.css(selector)),
    30000
  );
}

/**
 * Wait for a child element to show on the page
 */
export async function waitChildElement(parent: WebElement, selector: string) {
  await awaitFor(parent.getDriver(), async () =>
    (await parent.findElements(By.css(selector))).length !== 0
  );
}

/**
 * Wait for an element to disappear from the page
 */
export async function waitElementRemoved(driver: WebDriver, selector: string) {
  await awaitFor(driver, async () =>
    (await driver.findElements(By.css(selector))).length === 0
  );
}

/**
 * Wait for arbitrary condition
 */
export async function awaitFor(driver: WebDriver, condition: () => Promise<boolean>) {
  await driver.wait(
    new Condition<void>('for element to be located <element>', condition),
    30000
  );
}

/**
 * Set value in <select>
 */
export async function setSelectValue(driver: WebDriver, t: Test, element: WebElement, value: string) {
  await element.sendKeys(value);
  // await element.click();
  // const option = await findOnlyChild(driver, t, element, `option[value='${value}']`)
  // await option.click();
}

/**
 * Authorize user
 */
export async function authorize(driver: WebDriver, t: Test, url: string, username: string, password: string) {
  await get(driver, url);
  await setInputValueByName(driver, t, 'username', username);
  await setInputValueByName(driver, t, 'password', password);
  await submit(driver, t);
}

/**
 * Wait until all loaders on the page disappear
 */
export async function waitLoaders(driver: WebDriver) {
  await waitElementRemoved(driver, '.system-spinner');
}

/**
 * Press on a button by a text on it
 */
export async function clickButtonByCaption(driver: WebDriver, t: Test, caption: string) {
  const items = await asyncQ.filterSeries(
    await driver.findElements(By.css('button')),
    async (element: WebElement) => await element.getText() == caption
  );
  t.ok(items.length == 1, `only one button with "${caption}" text (got ${items.length})`);
  await scrollIntoElement(driver, items[0]);
  await items[0].click();
}

export async function getText(element: WebElement) {
  // we need to trim the text because of https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/5569343/
  const text = await element.getText();
  return _.trim(text);
}

export async function scrollIntoElement(driver: WebDriver, element: WebElement) {
  await driver.executeScript(
    'arguments[0].scrollIntoView(false)',
    element
  );
  await wait(200);
}
