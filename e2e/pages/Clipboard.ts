/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type Locator, type Page, expect } from '@playwright/test';
import { dragAndDrop } from './DragAndDrop';
import { sel } from './selectors';

export class Clipboard {
  constructor(private readonly page: Page) {}

  get root(): Locator {
    return this.page.locator(sel.clipboard.root).filter({ visible: true });
  }

  get searchInput(): Locator {
    return this.root.locator(sel.clipboard.searchInput);
  }

  async open(): Promise<this> {
    const tab = this.page.locator(sel.clipboard.tab).first();
    await expect(tab).toBeVisible();
    await tab.click();
    await expect(this.root).toBeVisible();
    return this;
  }

  async drop(source: Locator): Promise<void> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const added = this.page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().includes('/container?repository=assets') &&
          response.status() < 400,
        { timeout: 10_000 },
      );
      await dragAndDrop(this.page, source, this.root);
      try {
        await added;
        return;
      } catch (error) {
        if (attempt === 1) throw error;
      }
    }
  }

  map(name: string): Locator {
    return this.root.locator(sel.clipboard.set).filter({ hasText: name });
  }

  async expectMap(name: string): Promise<void> {
    await expect(this.map(name)).toBeVisible({ timeout: 30_000 });
  }

  async openMap(name: string): Promise<void> {
    const map = this.map(name);
    await expect(map).toBeVisible();
    await map.locator(sel.clipboard.setCaption).click();
    await expect(this.root.locator(sel.clipboard.openedSet)).toContainText(name);
  }

  async useListView(): Promise<void> {
    const button = this.root.getByTitle('Switch to list view');
    await expect(button).toBeVisible();
    if ((await button.getAttribute('aria-pressed')) !== 'true') await button.click();
    await expect(this.root).toHaveClass(/set-management--list-view/);
  }

  async expectItem(name: string): Promise<void> {
    await expect(this.root.locator(sel.clipboard.item).filter({ hasText: name })).toBeVisible();
  }

  async search(text: string): Promise<void> {
    await this.searchInput.fill(text);
    const results = this.root.locator('.set-management__search-results');
    await expect(results).toBeVisible();
    await expect(results.locator('.system-spinner')).toHaveCount(0, { timeout: 30_000 });
    await expect(results.locator(sel.clipboard.item).filter({ hasText: text })).toBeVisible({ timeout: 30_000 });
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.fill('');
  }
}
