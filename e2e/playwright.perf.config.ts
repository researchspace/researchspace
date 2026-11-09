/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { defineConfig, devices } from '@playwright/test';

// Phase 0 baseline measurements (see perf-tests/baseline.spec.ts). Needs a
// running local stack with the IGSN_Modelling diagram loaded; logs in through
// the shared auth setup. Sequential, no retries: every run is a measurement.
const baseURL = process.env.RS_BASE_URL ?? 'http://localhost:10214';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

export default defineConfig({
  testDir: '.',
  testMatch: ['tests/auth.setup.ts', 'perf-tests/*.spec.ts'],
  timeout: 300_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL,
    launchOptions: executablePath ? { executablePath } : {},
    actionTimeout: 30_000,
    navigationTimeout: 90_000,
    viewport: { width: 1440, height: 1000 },
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'perf', testMatch: /perf-tests\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' }, dependencies: ['setup'] },
  ],
});
