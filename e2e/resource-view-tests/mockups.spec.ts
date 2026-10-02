/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const html = readFileSync(resolve(__dirname, '../../docs/resource-views/mockups.html'), 'utf8');
async function open(page: Page, view = 'sample') {
  await page.route('http://heritage.test/**', route => route.fulfill({contentType: 'text/html', body: html}));
  await page.goto('http://heritage.test/?view=' + view);
}
async function fillAction(page: Page, label: string, title: string) {
  await page.getByRole('button', {name: label, exact: true}).click();
  await page.getByRole('textbox', {name: 'Activity title', exact: true}).fill(title);
}
for (const view of ['sample', 'painting', 'site']) {
  for (const width of [390, 1280]) {
    test(`${view} fits ${width}px and uses explicit Edit`, async ({page}) => {
      await page.setViewportSize({width, height: 1000}); await open(page, view);
      await expect(page.getByRole('button', {name: 'Edit', exact: true})).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await expect(page.getByText('Work to continue', {exact: true})).toHaveCount(0);
      await expect(page.getByText('Continue work', {exact: true})).toHaveCount(0);
      expect(await page.getByRole('tab', {selected: true}).evaluate(el => getComputedStyle(el).borderTopWidth)).toBe('0px');
    });
  }
}
test('saving a preparation updates summary and history once', async ({page}) => {
  await open(page); await fillAction(page, 'Prepare sample', 'Polished cross-section');
  await page.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('.history li')).toHaveCount(4);
  await expect(page.locator('.history li').first()).toContainText('Polished cross-section');
  await expect(page.locator('.facts')).toContainText('Polished cross-section');
});
test('cancel and failed save preserve history and keep failed entries', async ({page}) => {
  await open(page); await fillAction(page, 'Examine sample', 'New examination');
  await page.getByRole('button', {name: 'Cancel', exact: true}).click();
  await expect(page.locator('.history li')).toHaveCount(3);
  await fillAction(page, 'Examine sample', 'New examination');
  await page.evaluate(() => { (window as any).HeritageMockup.failNextSave = true; });
  await page.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('textbox', {name: 'Activity title', exact: true})).toHaveValue('New examination');
  await expect(page.locator('.history li')).toHaveCount(3);
});
test('child samples appear on sample and site lists', async ({page}) => {
  await open(page); await fillAction(page, 'Take child samples', 'Two fragments selected');
  await page.getByRole('textbox', {name: 'Child sample identifier'}).fill('S0-A-2');
  await page.getByRole('button', {name: 'Save', exact: true}).click();
  await page.getByRole('tab', {name: 'Samples from this site'}).click();
  await expect(page.getByRole('button', {name: 'S0-A-2', exact: true})).toBeVisible();
  await page.getByRole('navigation', {name: 'Preview resource type'}).getByRole('button', {name: 'Sampling site', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Samples from this site (5)'})).toBeVisible();
});
test('backdated records appear in date order', async ({page}) => {
  await open(page); await fillAction(page, 'Examine sample', 'Earlier examination');
  await page.getByLabel('Date performed').fill('2026-09-01');
  await page.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(page.locator('.history li').last()).toContainText('Earlier examination');
});
test('tabs support keyboard navigation and underline focus', async ({page}) => {
  await open(page); await page.getByRole('tab', {name: 'Overview', exact: true}).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', {name: 'Samples from this site'})).toBeFocused();
  expect(await page.getByRole('tab', {selected: true}).evaluate(el => getComputedStyle(el).outlineStyle)).toBe('none');
});
