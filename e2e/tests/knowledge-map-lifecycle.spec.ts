/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { test, expect } from '@playwright/test';
import * as path from 'node:path';
import { KnowledgeMap, sel } from '../pages';

const TEST_IMAGE = path.resolve('fixtures/test-image.jpg');
const uid = () => Date.now().toString(36);

test.describe('Knowledge Map lifecycle', () => {
  test('rename an entity, update the map and preserve its position', async ({ page }) => {
    const s = uid();
    const original = `Rename Original ${s}`;
    const renamed = `Rename Updated ${s}`;
    const anchorName = `Rename Anchor ${s}`;
    const km = await KnowledgeMap.openNew(page);
    const card = await km.createEntity({ name: original });
    await km.createEntity({ name: anchorName });
    await km.saveData();
    await km.saveMapAs(`Rename Map ${s}`);

    const form = await card.openEditForm();
    await form.setName(renamed);
    await form.save();
    await km.saveData();

    const edited = km.entity(renamed);
    const anchor = km.entity(anchorName);
    const beforeMove = await edited.position();
    await edited.moveTo(beforeMove.x + 300, beforeMove.y + 140);
    const savedPosition = await edited.position();
    const savedAnchorPosition = await anchor.position();
    const savedDelta = {
      x: savedPosition.x - savedAnchorPosition.x,
      y: savedPosition.y - savedAnchorPosition.y,
    };
    await km.saveMap();
    await km.reopen();

    await km.expectEntity(renamed);
    await expect(page.locator('[data-element-id]').filter({ hasText: original })).toHaveCount(0);
    const reopenedPosition = await km.entity(renamed).position();
    const reopenedAnchorPosition = await km.entity(anchorName).position();
    expect(Math.abs((reopenedPosition.x - reopenedAnchorPosition.x) - savedDelta.x)).toBeLessThan(8);
    expect(Math.abs((reopenedPosition.y - reopenedAnchorPosition.y) - savedDelta.y)).toBeLessThan(8);
  });

  test('delete an entity and persist the deletion', async ({ page }) => {
    const s = uid();
    const victim = `Delete Victim ${s}`;
    const survivor = `Delete Survivor ${s}`;
    const km = await KnowledgeMap.openNew(page);
    const victimCard = await km.createEntity({ name: victim });
    await km.createEntity({ name: survivor });
    await km.saveData();
    await km.saveMapAs(`Delete Map ${s}`);

    await victimCard.delete();
    await km.saveData();
    await km.saveMap();
    await km.reopen();

    await km.expectEntity(survivor);
    await expect(page.locator('[data-element-id]').filter({ hasText: victim })).toHaveCount(0);
  });

  test('undo and redo grouping', async ({ page }) => {
    const s = uid();
    const alpha = `History Alpha ${s}`;
    const beta = `History Beta ${s}`;
    const km = await KnowledgeMap.openNew(page);
    const a = await km.createEntity({ name: alpha });
    const b = await km.createEntity({ name: beta });
    await km.saveData();
    await km.groupEntities([a, b]);
    await km.expectGroupContaining([alpha, beta]);

    await km.undo();
    await expect(page.locator('[data-element-id]:has(.reactodia-standard-element--group)')).toHaveCount(0);
    await km.expectEntity(alpha);
    await km.expectEntity(beta);

    await km.redo();
    await km.expectGroupContaining([alpha, beta]);
  });

  test('ungroup one member and preserve the result', async ({ page }) => {
    const s = uid();
    const alpha = `Ungroup Alpha ${s}`;
    const beta = `Ungroup Beta ${s}`;
    const km = await KnowledgeMap.openNew(page);
    const a = await km.createEntity({ name: alpha });
    const b = await km.createEntity({ name: beta });
    await km.saveData();
    await km.groupEntities([a, b]);
    await km.ungroupEntity(alpha);
    await km.saveMapAs(`Ungroup Map ${s}`);
    await km.reopen();

    await km.expectEntity(alpha);
    await km.expectEntity(beta);
    await expect(page.locator('[data-element-id]:has(.reactodia-standard-element--group)').filter({ hasText: alpha }))
      .toHaveCount(0);
  });

  test('delete a relation and persist the deletion', async ({ page }) => {
    const s = uid();
    const km = await KnowledgeMap.openNew(page);
    const a = await km.createEntity({ name: `Relation Alpha ${s}` });
    const b = await km.createEntity({ name: `Relation Beta ${s}` });
    await a.connectTo(b);
    await km.saveData();
    await km.saveMapAs(`Relation Map ${s}`);

    await km.deleteFirstLink();
    await km.saveData();
    await km.saveMap();
    await km.reopen();

    expect(await km.linkCount()).toBe(0);
  });

  test('clear the map and restore it with undo and redo', async ({ page }) => {
    const s = uid();
    const alpha = `Clear Alpha ${s}`;
    const beta = `Clear Beta ${s}`;
    const km = await KnowledgeMap.openNew(page);
    await km.createEntity({ name: alpha });
    await km.createEntity({ name: beta });
    await km.saveData();

    await km.clearAll();
    await km.undo();
    await km.expectEntity(alpha);
    await km.expectEntity(beta);
    await km.redo();
    await expect(page.locator('[data-element-id]')).toHaveCount(0);
  });

  test('export the map as SVG and PNG', async ({ page }) => {
    const s = uid();
    const km = await KnowledgeMap.openNew(page);
    await km.createEntity({
      name: `Export Node ${s}`,
      image: { name: `Export Image ${s}`, file: TEST_IMAGE },
    });
    await km.saveData();

    expect(await km.exportSvg()).toBe('diagram.svg');
    expect(await km.exportPng()).toBe('diagram.png');
  });

  test('export renders the default card icon of an entity without an image', async ({ page }) => {
    const s = uid();
    const km = await KnowledgeMap.openNew(page);
    await km.createEntity({ name: `Export Icon Node ${s}` });
    await km.saveData();
    await expect(page.locator(`${sel.km.anyNode} .resource-card__icon-container`)).toBeVisible();

    const svg = await km.exportSvgSource();

    expect(svg).toMatch(
      /resource-card__icon-container[^>]*>\s*<i\b[^>]*>\s*<svg[^>]*viewBox="0 -960 960 960"/
    );
    // a leftover ligature would render as the raw icon name, or as nothing
    expect(svg).not.toMatch(/<i\b[^>]*class="[^"]*material-[^"]*"[^>]*>\s*\w+\s*<\/i>/);
    expect(svg).not.toContain('resource-card__header-actions');
  });

  test('export embeds the app text fonts, not the icon font', async ({ page }) => {
    const s = uid();
    const km = await KnowledgeMap.openNew(page);
    await km.createEntity({ name: `Export Font Node ${s}` });
    await km.saveData();

    const svg = await km.exportSvgSource();

    const faces = svg.match(/@font-face\{[^}]*\}/g) ?? [];
    expect(faces.length).toBeGreaterThan(0);
    for (const face of faces) {
      expect(face).toContain('src:url(data:');
      // the icon font is 4 MB and is exported as SVG instead
      expect(face.toLowerCase()).not.toContain('material symbols');
    }
  });

  test('export embeds the font an app configures, not a fixed one', async ({ page }) => {
    const s = uid();
    const km = await KnowledgeMap.openNew(page);

    // stand in for an app extension overriding the platform font hook
    const registered = await page.evaluate(() => {
      const faces = [...document.styleSheets]
        .flatMap(sheet => {
          try {
            return [...sheet.cssRules];
          } catch {
            return [];
          }
        })
        .filter((rule): rule is CSSFontFaceRule => rule instanceof CSSFontFaceRule);
      const source = faces.map(face => face.style.getPropertyValue('src'))
        .find(value => value.includes('.woff2'));
      const url = source ? /url\(\s*["']?([^"')]+\.woff2)["']?\s*\)/.exec(source)?.[1] : undefined;
      if (!url) {
        return false;
      }
      const style = document.createElement('style');
      style.textContent =
        `@font-face{font-family:'Override Test Font';font-style:normal;font-weight:400;` +
        `src:url("${url}") format("woff2")}\n` +
        `:root{--font-family-base:'Override Test Font','Helvetica Neue',sans-serif}`;
      document.head.appendChild(style);
      return true;
    });
    expect(registered).toBe(true);

    await km.createEntity({ name: `Override Node ${s}` });
    await km.saveData();

    const svg = await km.exportSvgSource();

    expect(svg).toContain("--reactodia-font-family-base: 'Override Test Font'");
    expect(svg).toContain('@font-face{font-family:"Override Test Font"');
    // no longer the rendered font, so it must not be shipped
    expect(svg).not.toContain('Source Sans Pro');
  });
});
