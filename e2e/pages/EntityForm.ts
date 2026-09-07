/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { sel } from './selectors';

/** The entity create/edit dialog. */
export class EntityForm {
  constructor(private readonly page: Page) {}

  get dialog(): Locator {
    return this.page.locator(sel.form.dialog);
  }

  get nameField(): Locator {
    return this.dialog.locator(sel.form.nameInput);
  }

  get mainImageField(): Locator {
    return this.dialog.locator(sel.form.mainImageField);
  }

  async waitOpen(): Promise<this> {
    await this.dialog.waitFor();
    await this.nameField.waitFor();
    return this;
  }

  async setName(name: string): Promise<void> {
    await this.nameField.fill(name);
  }

  async getName(): Promise<string> {
    return this.nameField.inputValue();
  }

  async setImage(image: { name: string; file: string }): Promise<void> {
    const uploadLink = this.mainImageField.locator(sel.form.uploadLink, { hasText: 'click to upload' }).first();
    const modal = this.page
      .locator(sel.imageModal.root)
      .filter({ has: this.page.locator(sel.imageModal.title, { hasText: 'New Main image' }) });

    // The form can re-render while opening the upload modal.
    await expect(uploadLink).toBeVisible();
    for (let attempt = 0; ; attempt++) {
      await uploadLink.click();
      try {
        await modal.waitFor({ timeout: 3000 });
        break;
      } catch (err) {
        if (attempt >= 3) throw err;
      }
    }

    await modal.locator(sel.imageModal.nameInput).fill(image.name);
    const temporaryUpload = this.page.waitForResponse(
      response => response.request().method() === 'POST'
        && new URL(response.url()).pathname.endsWith('/file/temporary'),
      { timeout: 60_000 },
    );
    await modal.locator(sel.imageModal.fileInput).setInputFiles(image.file);
    const temporaryUploadResponse = await temporaryUpload;
    expect(
      temporaryUploadResponse.ok(),
      `temporary image upload returned ${temporaryUploadResponse.status()}`,
    ).toBe(true);

    const preview = modal.locator('img[src*="/file?"]').first();
    await expect(preview).toBeVisible({ timeout: 30_000 });
    await expect.poll(
      () => preview.evaluate((img: HTMLImageElement) => img.complete ? img.naturalWidth : 0),
      { timeout: 30_000 },
    ).toBeGreaterThan(0);

    const storedUpload = this.page.waitForResponse(
      response => response.request().method() === 'POST'
        && new URL(response.url()).pathname.endsWith('/file/move'),
      { timeout: 60_000 },
    );
    const submit = modal.locator('button[name="submit"]', { hasText: 'Upload image' });
    await expect(submit).toBeEnabled({ timeout: 30_000 });
    await submit.click();
    const storedUploadResponse = await storedUpload;
    expect(
      storedUploadResponse.ok(),
      `stored image upload returned ${storedUploadResponse.status()}`,
    ).toBe(true);
    await expect(modal).toHaveCount(0);
    await expect(this.mainImageField.locator(sel.form.placeholder)).toHaveCount(0);
  }

  async removeImage(): Promise<void> {
    await this.mainImageField.locator('button[title="Remove"]').first().click();
    await this.expectImageEmpty();
  }

  async save(): Promise<void> {
    await this.dialog.locator(sel.form.submit, { hasText: 'Save' }).click();
    await expect(this.dialog).toHaveCount(0);
  }

  async cancel(): Promise<void> {
    await this.dialog.locator(sel.form.close).click();
    await expect(this.dialog).toHaveCount(0);
  }

  async expectImagePresent(): Promise<void> {
    await expect(this.mainImageField.locator(sel.form.placeholder)).toHaveCount(0);
  }

  async expectImageEmpty(): Promise<void> {
    await expect(this.mainImageField.locator(sel.form.placeholder)).toBeVisible();
  }
}
