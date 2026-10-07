/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { test, expect } from '@playwright/test';
import { ThinkingFrames } from '../pages';

test.describe('app-state in Thinking Frames', () => {
  test('restores the open frames from a saved link', async ({ page, browser }) => {
    const frames = await ThinkingFrames.open(page);
    await expect(frames.frameTabs).toHaveCount(1);
    // the default layout is not a change to save
    await expect(frames.saveButton).toBeDisabled();

    await frames.addFrame();
    const stateId = await frames.save();
    const link = page.url();

    const context = await browser.newContext({ storageState: await page.context().storageState() });
    const restored = await ThinkingFrames.open(await context.newPage(), link);
    // the saved frames replace the default one, no extra frame is added
    await expect(restored.frameTabs).toHaveCount(2);
    await context.close();

    const deleted = await page.request.delete(`/rest/app-state/delete/${stateId}`);
    expect(deleted.ok()).toBeTruthy();
    const loaded = await page.request.get(`/rest/app-state/load/${stateId}`);
    expect(loaded.status()).toBe(404);
  });

  test('warns before leaving with unsaved frames', async ({ page }) => {
    const frames = await ThinkingFrames.open(page);
    await frames.addFrame();

    const dialog = page.waitForEvent('dialog');
    await page.close({ runBeforeUnload: true });
    const shown = await dialog;
    expect(shown.type()).toBe('beforeunload');
    await shown.accept();
  });
});
