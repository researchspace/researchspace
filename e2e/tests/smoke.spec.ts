/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { test, expect } from '@playwright/test';

const baseURL = process.env.RS_BASE_URL ?? 'http://localhost:10214';

test('renders the login page', async ({ browser }) => {
  // browser.newContext() inherits the project's authenticated storage state.
  // Explicitly clear it because visiting /login logs out an existing session.
  const context = await browser.newContext({
    baseURL,
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();

  await page.goto('/login');
  await expect(page.getByPlaceholder('Username')).toBeVisible();
  await expect(page.getByPlaceholder('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();

  await context.close();
});

test('opens the application with an authenticated session', async ({ page }) => {
  const user = process.env.RS_USER ?? 'admin';

  await page.goto('/');
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.locator('#application')).toBeVisible();

  const principal = await page.request.get('/rest/security/user');
  expect(principal.ok()).toBeTruthy();
  await expect(principal.json()).resolves.toMatchObject({
    isAuthenticated: true,
    principal: user,
  });
});
