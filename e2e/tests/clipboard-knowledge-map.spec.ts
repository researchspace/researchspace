/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { test, expect, type Locator } from '@playwright/test';
import { Clipboard, KnowledgeMap } from '../pages';

const uid = () => Date.now().toString(36);

test.describe('Knowledge Map and clipboard', () => {
  test('drop a saved map into the clipboard, open it and highlight matching map items', async ({ page }) => {
    const s = uid();
    const mapName = `Clipboard Map ${s}`;
    const alpha = `Clipboard Alpha ${s}`;
    const beta = `Clipboard Beta ${s}`;
    const km = await KnowledgeMap.openNew(page);

    const a = await km.createEntity({ name: alpha });
    const b = await km.createEntity({ name: beta });
    await a.connectTo(b);
    await km.saveData();
    await km.saveMapAs(mapName);

    await expect(km.dragHandle).toBeVisible();
    const clipboard = await new Clipboard(page).open();
    await clipboard.drop(km.dragHandle);
    await clipboard.expectMap(mapName);
    await clipboard.openMap(mapName);
    await clipboard.useListView();
    await clipboard.expectItem(alpha);
    await clipboard.expectItem(beta);

    await clipboard.search(alpha);
    await km.expectEntityHighlighted(alpha);
    await km.expectEntityDimmed(beta);
    await expect(page.locator('.reactodia-link--blurred')).toHaveCount(0);

    await clipboard.clearSearch();
    await km.expectNoSearchHighlight();
  });

  test('searching for a grouped member highlights its group', async ({ page }) => {
    const s = uid();
    const mapName = `Clipboard Group ${s}`;
    const alpha = `Group Search Alpha ${s}`;
    const beta = `Group Search Beta ${s}`;
    const unrelated = `Group Search Unrelated ${s}`;
    const km = await KnowledgeMap.openNew(page);

    const a = await km.createEntity({ name: alpha });
    const b = await km.createEntity({ name: beta });
    await km.createEntity({ name: unrelated });
    await km.saveData();
    await km.groupEntities([a, b]);
    await km.saveMapAs(mapName);

    const clipboard = await new Clipboard(page).open();
    await clipboard.drop(km.dragHandle);
    await clipboard.expectMap(mapName);
    await clipboard.openMap(mapName);
    await clipboard.useListView();
    await clipboard.expectItem(alpha);

    const cardStyle = async (locator: Locator) => locator.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        borderTopColor: style.borderTopColor,
        borderTopWidth: style.borderTopWidth,
        height: style.height,
      };
    });
    const labelStyle = async (locator: Locator) => locator.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        display: style.display,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        overflow: style.overflow,
        textOverflow: style.textOverflow,
        whiteSpace: style.whiteSpace,
      };
    });
    const clipboardCard = clipboard.root.locator('.set-management__set-item', { hasText: alpha })
      .locator('.resource-card');
    const groupCard = page.locator('.reactodia-standard-element__item', { hasText: alpha });
    const groupElement = page.locator('.reactodia-standard-element--group', { hasText: alpha });
    const clipboardType = clipboardCard.locator('.resource-card__footer-type');
    const groupType = groupCard.locator('.reactodia-standard-element__type-label');
    const clipboardLabel = clipboardCard.locator('.resource-card__footer-title');
    const groupLabel = groupCard.locator('.reactodia-standard-element__label');

    expect(await cardStyle(groupCard)).toEqual(await cardStyle(clipboardCard));
    expect(await groupElement.evaluate(element => getComputedStyle(element).borderTopColor))
      .toBe((await cardStyle(clipboardCard)).borderTopColor);
    expect(await labelStyle(groupLabel)).toEqual(await labelStyle(clipboardLabel));
    await expect(groupType).toHaveText(await clipboardType.innerText());
    await expect(groupLabel.locator('.text-link')).toHaveText(alpha);
    await expect(groupCard.locator('.reactodia-standard-element__item-stripe')).toHaveCount(0);

    await clipboard.search(alpha);

    const groupNode = page.locator('[data-element-id]:has(.reactodia-standard-element--group)');
    await expect(groupNode).not.toHaveClass(/reactodia-overlaid-element--blurred/);
    await km.expectEntityDimmed(unrelated);
  });
});
