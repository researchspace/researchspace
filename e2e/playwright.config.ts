/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { defineConfig, devices } from '@playwright/test';

// App base URL. Dev stack serves the app from the backend on :10214
// (JS bundles come from webpack-dev-server on :3000, referenced by the page).
const baseURL = process.env.RS_BASE_URL ?? 'http://localhost:10214';

// In this sandbox Playwright's bundled Chromium can't run (NixOS has no
// matching ELF interpreter); point at a system Chromium via env var.
// Unset in CI so the bundled browser is used.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  // Tests mutate shared backend state — never run them in parallel.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    launchOptions: executablePath ? { executablePath } : {},
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },
  projects: [
    // Logs in once and saves the session; other tests reuse it.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
