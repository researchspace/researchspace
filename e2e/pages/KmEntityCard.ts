/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { sel } from './selectors';
import { EntityForm } from './EntityForm';

/** A single entity card (node) on the knowledge-map canvas. */
export class KmEntityCard {
  constructor(
    private readonly page: Page,
    readonly ref: { id?: string; name?: string },
  ) {}

  get locator(): Locator {
    if (this.ref.id) return this.page.locator(sel.km.node(this.ref.id));
    return this.page.locator(sel.km.anyNode).filter({ hasText: this.ref.name! });
  }

  async expectVisible(): Promise<void> {
    await expect(this.locator).toBeVisible();
  }

  /** Assert the image loaded real pixels. */
  async expectImageRendered(): Promise<void> {
    const img = this.locator.locator('img').first();
    await expect(img).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(async () => img.evaluate((im: HTMLImageElement) => (im.complete ? im.naturalWidth : 0)), { timeout: 20_000 })
      .toBeGreaterThan(0);
    await expect(this.locator).not.toContainText('Error occurred');
  }

  async expectNoImage(): Promise<void> {
    await expect(this.locator.locator('img')).toHaveCount(0);
  }

  async position(): Promise<{ x: number; y: number }> {
    const box = await this.locator.boundingBox();
    if (!box) throw new Error('card has no bounding box');
    return { x: box.x, y: box.y };
  }

  async select(opts: { additive?: boolean } = {}): Promise<void> {
    const box = await this.locator.boundingBox();
    if (!box) throw new Error('card has no bounding box');
    await this.locator.click({
      position: { x: box.width / 2, y: 12 },
      modifiers: opts.additive ? ['Shift'] : [],
    });
  }

  async moveTo(x: number, y: number): Promise<void> {
    const box = await this.locator.boundingBox();
    if (!box) throw new Error('card has no bounding box');
    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.45);
    await this.page.mouse.down();
    await this.page.mouse.move(x, y, { steps: 12 });
    await this.page.mouse.up();
    await this.page.waitForTimeout(200);
  }

  async openEditForm(): Promise<EntityForm> {
    await this.select();
    const decorations = this.locator.locator(
      'xpath=following-sibling::*[contains(@class, "reactodia-element-decorations")][1]',
    );
    const action = decorations.locator(sel.km.editAction);
    await expect(action).toBeVisible();
    await action.click();
    return new EntityForm(this.page).waitOpen();
  }

  async delete(): Promise<void> {
    await this.select();
    const decorations = this.locator.locator(
      'xpath=following-sibling::*[contains(@class, "reactodia-element-decorations")][1]',
    );
    const action = decorations.locator(sel.km.deleteAction);
    await expect(action).toBeEnabled();
    await action.click();
  }

  async connectTo(target: KmEntityCard, opts: { type?: string } = {}): Promise<void> {
    await this.select();
    const handle = this.page.locator(sel.km.establishLink).first();
    await handle.waitFor({ state: 'visible' });

    const from = await handle.boundingBox();
    const to = await target.locator.boundingBox();
    if (!from || !to) throw new Error('connect: missing bounding box');

    await this.page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(from.x + 15, from.y + 5, { steps: 4 });
    await this.page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 18 });
    await this.page.mouse.up();

    const dialog = this.page
      .locator(sel.form.dialog)
      .filter({ has: this.page.locator('#reactodia-dialog-caption', { hasText: sel.connectDialog.caption }) });
    await dialog.waitFor();

    const typeSelect = dialog.locator(sel.connectDialog.typeSelect);
    await typeSelect.waitFor();
    if (opts.type) {
      await typeSelect.selectOption({ label: opts.type });
    } else {
      await typeSelect.selectOption({ index: 1 });
    }
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }
}
