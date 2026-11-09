/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { defineConfig } from '@playwright/test';

// Isolated rendering checks against the production CSS; no backend or login required.
// Run `npm run prod` at the repository root first.
export default defineConfig({
  testDir: './style-tests', testMatch: 'resource-styles.spec.ts',
  fullyParallel: true, workers: 2, reporter: 'list',
  use: {
    viewport: {width: 1440, height: 1000},
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {},
  },
});
