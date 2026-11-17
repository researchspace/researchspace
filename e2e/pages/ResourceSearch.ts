/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type Page, type Locator, type Request, expect } from '@playwright/test';

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

  /**
   * Filters the results by a token of the resource name (the keyword search matches whole words).
   *
   * The keyword search runs while typing (debounced) and again on Enter, so the results are
   * rendered more than once. Acting on a row before the last render clicks an element that is
   * then replaced, which closes its menu or removes the delete dialog it contains. So this waits
   * until the search has settled: no requests in flight and the same results for a while.
   */
  async find(token: string): Promise<void> {
    const settled = this.trackRequests();
    try {
      await this.keyword.fill(token);
      await this.keyword.press('Enter');
      await this.waitForResultsToSettle(settled);
    } finally {
      settled.dispose();
    }
  }

  /**
   * Tracks the data requests of the page (fetch/XHR). A request pending for longer than
   * {@link LONG_REQUEST_MS} is taken as long-lived (e.g. polling) and not waited for.
   */
  private trackRequests(): { inFlight: () => number; lastActivity: () => number; dispose: () => void } {
    const pending = new Map<Request, number>();
    let lastActivity = Date.now();
    const started = (request: Request) => {
      if (request.resourceType() === 'fetch' || request.resourceType() === 'xhr') {
        pending.set(request, Date.now());
        lastActivity = Date.now();
      }
    };
    const ended = (request: Request) => {
      if (pending.delete(request)) {
        lastActivity = Date.now();
      }
    };
    this.page.on('request', started);
    this.page.on('requestfinished', ended);
    this.page.on('requestfailed', ended);
    return {
      inFlight: () => {
        const now = Date.now();
        return Array.from(pending.values()).filter((since) => now - since < LONG_REQUEST_MS).length;
      },
      lastActivity: () => lastActivity,
      dispose: () => {
        this.page.off('request', started);
        this.page.off('requestfinished', ended);
        this.page.off('requestfailed', ended);
      },
    };
  }

  /**
   * Waits until no request is in flight and the visible results have not changed for
   * {@link SETTLE_MS}; the quiet period also covers the debounce of the keyword search.
   */
  private async waitForResultsToSettle(
    requests: { inFlight: () => number; lastActivity: () => number },
    timeout = 30_000,
  ): Promise<void> {
    const results = () =>
      this.page.locator('.text-link').filter({ visible: true }).allInnerTexts().then((texts) => texts.join('\n'));
    const deadline = Date.now() + timeout;
    let previous = await results();
    let unchangedSince = Date.now();
    while (Date.now() < deadline) {
      await this.page.waitForTimeout(250);
      const current = await results();
      if (current !== previous) {
        previous = current;
        unchangedSince = Date.now();
      }
      const quietSince = Math.max(unchangedSince, requests.lastActivity());
      if (requests.inFlight() === 0 && Date.now() - quietSince >= SETTLE_MS) {
        return;
      }
    }
    // not an error by itself: the following expectations report what is wrong
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
  async openActions(name: string, timeout?: number): Promise<Locator> {
    const row = this.row(name).first().locator(
      'xpath=ancestor::*[.//button[contains(@class, "dropdown-toggle")]][1]',
    );
    await row.locator('button.dropdown-toggle').click({ timeout });
    const menu = row.locator('.open > .dropdown-menu');
    await expect(menu).toBeVisible({ timeout });
    return menu;
  }

  /**
   * Opens the delete dialog of a listed result. If the results are rendered again meanwhile
   * (the menu or the dialog is replaced), it starts over.
   */
  async openDeleteDialog(name: string): Promise<Locator> {
    let attempt = 0;
    await expect(async () => {
      if (attempt++ > 0) {
        // start over from what a previous attempt left: a dialog without Delete, an open menu
        await this.closeDeleteDialog();
        await this.page.keyboard.press('Escape');
      }
      const menu = await this.openActions(name, 5_000);
      await menu.getByText('Delete', { exact: true }).click({ timeout: 5_000 });
      await expect(this.deleteDialog).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 60_000 });
    return this.deleteDialog;
  }

  private async closeDeleteDialog(): Promise<void> {
    if ((await this.deleteDialog.count()) === 0) {
      return;
    }
    const cancel = this.deleteDialog.getByRole('button', { name: 'Cancel', exact: true });
    if (await cancel.isVisible()) {
      await cancel.click({ timeout: 5_000 });
    } else {
      await this.page.keyboard.press('Escape');
    }
    await expect(this.deleteDialog).toHaveCount(0, { timeout: 5_000 });
  }

  /**
   * Deletes a listed result with a single click on Delete. If the dialog says that the
   * resource cannot be deleted from here, fails with its message right away.
   */
  async delete(name: string): Promise<void> {
    let refused: string | undefined;
    await expect(async () => {
      const dialog = await this.openDeleteDialog(name);
      const button = dialog.getByRole('button', { name: 'Delete', exact: true });
      const cannotDelete = dialog.locator('.warning-documentation-section', {
        hasText: 'This resource cannot be deleted from here',
      });
      await expect(button.or(cannotDelete)).toBeVisible({ timeout: 10_000 });
      if (await cannotDelete.isVisible()) {
        refused = await cannotDelete.innerText();
        return;
      }
      await button.click({ timeout: 5_000 });
    }).toPass({ timeout: 90_000 });
    if (refused) {
      throw new Error(`The delete dialog of "${name}" refused to delete it: ${refused}`);
    }
    await expect(this.deleteDialog).toHaveCount(0, { timeout: 30_000 });
  }
}

/** How long the search must be quiet before its results are taken as final. */
const SETTLE_MS = 1_000;
/** A data request pending for longer than this is not waited for. */
const LONG_REQUEST_MS = 10_000;
