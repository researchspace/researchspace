/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './resource-view-tests', fullyParallel: true, workers: 2, reporter: 'list',
  use: {viewport: {width: 1280, height: 1000}, launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {}},
});
