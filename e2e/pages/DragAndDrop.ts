/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type Locator, type Page, expect } from '@playwright/test';

export async function dragAndDrop(page: Page, source: Locator, target: Locator): Promise<void> {
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await source.dispatchEvent('dragstart', { dataTransfer });
  try {
    await expect(target).toHaveClass(/mp-droppable-enabled/, { timeout: 30_000 });
    await target.dispatchEvent('dragenter', { dataTransfer });
    await target.dispatchEvent('dragover', { dataTransfer });
    await target.dispatchEvent('drop', { dataTransfer });
  } finally {
    await source.dispatchEvent('dragend', { dataTransfer });
    await dataTransfer.dispose();
  }
}
