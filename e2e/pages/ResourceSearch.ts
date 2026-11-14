/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type Page, type Locator, expect } from '@playwright/test';

/** The search page of a resource type, opened from the Finder: results and their actions. */
export class ResourceSearch {
  protected constructor(readonly page: Page) {}

  static async open(page: Page, finderItem: string): Promise<ResourceSearch> {
    const search = new ResourceSearch(page);
    await search.openFromFinder(finderItem);
    return search;
  }

  protected async openFromFinder(finderItem: string): Promise<void> {
    await this.page.goto('/resource/ThinkingFrames');
    await this.page.locator('.flexlayout__border_button', { hasText: 'Finder' }).click();
    // the Finder capitalises the labels with CSS
    await this.page.locator('.Tree--itemLink')
      .filter({ has: this.page.getByText(new RegExp(`^${finderItem}$`, 'i')) }).first().click();
    await expect(this.keyword).toBeVisible();
  }

  get keyword(): Locator {
    return this.page.getByPlaceholder(/^Search /).filter({ visible: true });
  }

  get deleteDialog(): Locator {
    return this.page.locator('.modal').filter({ hasText: 'Are you sure you want to delete' });
  }

  /** Filters the results by a token of the resource name (the keyword search matches whole words). */
  async find(token: string): Promise<void> {
    await this.keyword.fill(token);
    await this.keyword.press('Enter');
  }

  row(name: string): Locator {
    return this.page.locator('.text-link', { hasText: name }).filter({ visible: true });
  }

  async expectListed(name: string): Promise<void> {
    await expect(this.row(name).first()).toBeVisible();
  }

  async expectNotListed(name: string): Promise<void> {
    await expect(this.row(name)).toHaveCount(0);
  }

  /** Opens the actions menu of a listed result. */
  async openActions(name: string): Promise<Locator> {
    const row = this.row(name).first().locator(
      'xpath=ancestor::*[.//button[contains(@class, "dropdown-toggle")]][1]',
    );
    await row.locator('button.dropdown-toggle').click();
    const menu = row.locator('.open > .dropdown-menu');
    await expect(menu).toBeVisible();
    return menu;
  }

  async openDeleteDialog(name: string): Promise<Locator> {
    const menu = await this.openActions(name);
    await menu.getByText('Delete', { exact: true }).click();
    await expect(this.deleteDialog).toBeVisible();
    return this.deleteDialog;
  }

  /** Deletes a listed result with a single click on Delete. */
  async delete(name: string): Promise<void> {
    const dialog = await this.openDeleteDialog(name);
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(dialog).toHaveCount(0, { timeout: 30_000 });
  }
}
