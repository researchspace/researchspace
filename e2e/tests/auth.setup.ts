/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { test as setup, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const authFile = path.join('.auth', 'user.json');

// Logs in via the server-rendered Shiro form and persists the session so every
// other test starts already authenticated.
setup('authenticate', async ({ page }) => {
  const user = process.env.RS_USER ?? 'admin';
  const password = process.env.RS_PASSWORD ?? 'admin';

  await expect.poll(async () => (await page.request.get('/login')).status(), { timeout: 90_000 }).toBe(200);
  await page.goto('/login');
  await page.getByPlaceholder('Username').fill(user);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();

  // A successful login redirects away from /login.
  await expect(page).not.toHaveURL(/\/login/);

  // Confirm the session is authenticated.
  const principal = await page.request.get('/rest/security/user');
  expect(principal.ok()).toBeTruthy();
  const me = await principal.json();
  expect(me.isAuthenticated).toBe(true);
  expect(me.principal).toBe(user);

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
