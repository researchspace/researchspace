/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { test, expect, Page } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, basename } from 'node:path';

const root = resolve(__dirname, '../..');
const assets = resolve(root, 'src/main/webapp/assets/no_auth');
// Webpack keeps older hashed assets; inspect the most recent production CSS.
const styles = readdirSync(assets)
  .filter(name => /^styles-.*\.css$/.test(name))
  .sort((a, b) => statSync(resolve(assets, b)).mtimeMs - statSync(resolve(assets, a)).mtimeMs)[0];
if (!styles) { throw new Error('Run npm run prod before the resource style checks'); }
const templates = resolve(root, 'src/main/resources/org/researchspace/apps/default/data/templates');
const template = (name: string) => readFileSync(resolve(templates,
  `http%3A%2F%2Fwww.researchspace.org%2Fresource%2F${name}.html`), 'utf8');
// Use the actual action markup so a regression to an icon-only button fails here.
const edit = template('ResourceHeader').match(/<button type="button"[\s\S]*?<\/button>/)![0];
const view = template('ResourceViewButton').match(/<button type="button"[\s\S]*?<\/button>/)![0];
const title = 'Archaeological object with a deliberately long descriptive title and accession identifier 123456789';

async function render(page: Page, width: number, editor = false, imageSize = [60, 160]) {
  await page.route('http://resource.test/**', route => {
    const name = basename(new URL(route.request().url()).pathname);
    if (name && name !== 'index.html') {
      return route.fulfill({body: readFileSync(resolve(assets, name)),
        contentType: name.endsWith('.css') ? 'text/css' : undefined});
    }
    return route.fulfill({contentType: 'text/html', body: `<!doctype html><meta charset="utf-8">
      <link rel="stylesheet" href="/${styles}">
      <div style="width:${width}px;height:auto" class="${editor ? 'resource-editView-container' : ''}">
      <div class="page__grid-container" style="height:auto">
      <div class="page__content-container resource-editView-form-container resource-view">
      ${editor ? `<header class="resource-record-header resource-record-header--editor">
        <div class="resource-record-header-title-container">
          <h2 class="resource-record-header-title"><div class="text-truncate">${title}</div></h2>
          <span class="text-type-subheader">Archaeological object</span>
        </div><div class="btn-inline-container">${view}</div></header>` : `
        <header class="resource-record-header resource-record-header--view">
        <div class="resource-record-header__thumbnail"><img class="resource-thumbnail resource-record-header__image" alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${imageSize[0]}' height='${imageSize[1]}' viewBox='0 0 ${imageSize[0]} ${imageSize[1]}'%3E%3Crect width='100%25' height='100%25' fill='tan'/%3E%3C/svg%3E"></div>
        <div class="resource-record-header__body">
          <div class="resource-record-header__top">
            <div class="resource-record-header__identity"><h3 class="resource-record-header__title"><span class="link-draggable"><div class="text-truncate">${title}</div></span></h3></div>
            <nav class="resource-record-header__actions">${edit}<button class="resource-record-header__action" aria-label="More actions">⋮</button></nav>
          </div>
          <div class="resource-record-header__facts">
            <div class="resource-record-header__fact"><div class="resource-record-header__fact-label">Identifier</div><div class="resource-record-header__fact-content">https://example.org/collection/averylongunbrokenidentifier012345678901234567890</div></div>
            <div class="resource-record-header__fact"><div class="resource-record-header__fact-label">Location</div><div class="resource-record-header__fact-content">Museum collection</div></div>
          </div>
        </div></header>`}
      <ul class="nav nav-tabs" role="tablist">
        <li class="active" role="presentation"><a role="tab" aria-selected="true" href="#details">Details</a></li>
        <li role="presentation"><a role="tab" aria-selected="false" href="#context">Context</a></li>
      </ul>
      </div></div></div><a href="#visited-resource" class="text-link">Resource link</a>`});
  });
  await page.goto('http://resource.test/index.html');
  await page.evaluate(() => document.fonts.ready);
}

for (const width of [320, 480, 900]) {
  for (const editor of [false, true]) {
    test(`${editor ? 'editor' : 'resource'} header fits a ${width}px pane in a wide viewport`, async ({page}) => {
      await render(page, width, editor);
      const button = page.getByRole('button', {name: editor ? 'View' : 'Edit', exact: true});
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(36);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      const overflow = await page.locator('.resource-record-header').evaluate(el => el.scrollWidth - el.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      const heading = page.getByRole('heading');
      expect(await heading.evaluate(el => getComputedStyle(el.querySelector('.text-truncate')!).whiteSpace)).toBe('normal');
      await page.keyboard.press('Tab');
      await expect(button).toBeFocused();
      expect(await button.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
      expect(await button.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    });
  }
}

test('facts have readable text and spacing', async ({page}) => {
  await render(page, 640);
  const facts = page.locator('.resource-record-header__fact-content').first();
  const style = await facts.evaluate(el => ({size: parseFloat(getComputedStyle(el).fontSize), line: parseFloat(getComputedStyle(el).lineHeight)}));
  expect(style.size).toBeGreaterThanOrEqual(16);
  expect(style.line / style.size).toBeGreaterThanOrEqual(1.5);
});

test('resource surfaces respect semantic theme overrides', async ({page}) => {
  await render(page, 640);
  await page.addStyleTag({content: ':root { --rs-color-surface: rgb(20, 30, 40); --rs-color-text: rgb(240, 245, 250); }'});
  const style = await page.locator('.resource-record-header').evaluate(el => ({background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color}));
  expect(style).toEqual({background: 'rgb(20, 30, 40)', color: 'rgb(240, 245, 250)'});
});


for (const width of [320, 480, 900]) {
  test(`editor and resource headers have matching insets at ${width}px`, async ({page}) => {
    const measurements = async () => page.locator('.resource-record-header').evaluate(el => ({
      x: el.getBoundingClientRect().x,
      width: el.getBoundingClientRect().width,
      padding: getComputedStyle(el).padding,
    }));
    await render(page, width);
    const resourceHeader = await measurements();
    await render(page, width, true);
    const editorHeader = await measurements();
    expect(editorHeader).toEqual(resourceHeader);
    expect(editorHeader.x).toBe(20);
  });
}

test('selected resource tabs retain their underline without a box on click or keyboard focus', async ({page}) => {
  await render(page, 900);
  const selected = page.getByRole('tab', {name: 'Details'});
  await selected.click();
  await expect(selected).toBeFocused();
  expect(await selected.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('none');
  expect(await selected.evaluate(el => getComputedStyle(el).borderTopWidth)).toBe('0px');
  expect(await selected.evaluate(el => getComputedStyle(el).textDecorationLine)).toBe('none');
  expect(await selected.evaluate(el => getComputedStyle(el.parentElement!).boxShadow)).toContain('inset');
  await page.keyboard.press('Tab');
  const next = page.getByRole('tab', {name: 'Context'});
  await expect(next).toBeFocused();
  expect(await next.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('none');
  expect(await next.evaluate(el => getComputedStyle(el).textDecorationLine)).toBe('underline');
  expect(await next.evaluate(el => getComputedStyle(el).textDecorationStyle)).toBe('dotted');
});

test('a clicked resource link retains an underline without a focus box on subsequent hover', async ({page}) => {
  await render(page, 900);
  const link = page.getByRole('link', {name: 'Resource link'});
  await link.click();
  await page.mouse.move(1, 1);
  await link.hover();
  const style = await link.evaluate(el => ({outline: getComputedStyle(el).outlineStyle,
    shadow: getComputedStyle(el).boxShadow, decoration: getComputedStyle(el).textDecorationLine}));
  expect(style).toEqual({outline: 'none', shadow: 'none', decoration: 'underline'});
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(link).toBeFocused();
  expect(await link.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('none');
  expect(await link.evaluate(el => getComputedStyle(el).textDecorationStyle)).toBe('dotted');
});

for (const imageSize of [[60, 160], [160, 60]]) {
  test(`thumbnail preserves ${imageSize.join('x')} image proportions without a square background`, async ({page}) => {
    await render(page, 900, false, imageSize);
    const thumbnail = page.locator('.resource-record-header__thumbnail');
    const img = thumbnail.locator('img');
    const box = (await img.boundingBox())!;
    expect(box.width / box.height).toBeCloseTo(imageSize[0] / imageSize[1], 2);
    expect(Math.max(box.width, box.height)).toBe(112);
    const wrapper = (await thumbnail.boundingBox())!;
    expect(wrapper.width).toBeCloseTo(box.width, 1);
    expect(wrapper.height).toBeCloseTo(box.height, 1);
    expect(await thumbnail.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    expect(await thumbnail.evaluate(el => getComputedStyle(el).borderWidth)).toBe('0px');
  });
}
