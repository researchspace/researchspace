/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type Page, type Locator, expect } from '@playwright/test';

const THINKING_FRAMES_PATH = '/resource/ThinkingFrames';

/** The Thinking Frames page, whose frames are kept by an app-state in backend mode. */
export class ThinkingFrames {
  private constructor(readonly page: Page) {}

  static async open(page: Page, url = THINKING_FRAMES_PATH): Promise<ThinkingFrames> {
    const frames = new ThinkingFrames(page);
    await page.goto(url);
    await expect(frames.frameTabs.first()).toBeVisible();
    return frames;
  }

  /** Tabs of the frames in the main area (side panels excluded). */
  get frameTabs(): Locator {
    return this.page.locator('.flexlayout__tabset .flexlayout__tab_button');
  }

  get saveButton(): Locator {
    return this.page.locator('.app-state-save-button');
  }

  async addFrame(): Promise<void> {
    const count = await this.frameTabs.count();
    await this.page.locator('.flexlayout__tab_toolbar_sticky_button').first().click();
    await expect(this.frameTabs).toHaveCount(count + 1);
  }

  /** Saves the frames and returns the id of the saved state. */
  async save(): Promise<string> {
    await expect(this.saveButton).toBeEnabled();
    await this.saveButton.click();
    await expect(this.page).toHaveURL(/[?&]stateId=/);
    return new URL(this.page.url()).searchParams.get('stateId') ?? '';
  }
}
