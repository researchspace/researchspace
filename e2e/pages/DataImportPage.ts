/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type Page, type Locator, expect } from '@playwright/test';

/** Administration > Data import and download. */
export class DataImportPage {
  private constructor(readonly page: Page) {}

  static async open(page: Page): Promise<DataImportPage> {
    const dataImport = new DataImportPage(page);
    await page.goto(`/resource/?uri=${encodeURIComponent('http://www.researchspace.org/resource/admin/DataImportExport')}`);
    await expect(page.getByPlaceholder('Filter Results')).toBeVisible({ timeout: 60_000 });
    return dataImport;
  }

  /** Uploads a TriG file keeping its named graphs. */
  async upload(file: { name: string; content: string }): Promise<void> {
    await this.page.getByText('Keep source named graphs').click();
    await this.page.locator('input[type="file"]').setInputFiles({
      name: file.name,
      mimeType: 'application/trig',
      buffer: Buffer.from(file.content, 'utf8'),
    });
  }

  async row(graph: string): Promise<Locator> {
    await this.page.getByPlaceholder('Filter Results').fill(graph);
    const row = this.page.locator('table tbody tr').filter({
      has: this.page.getByRole('link', { name: graph, exact: true }),
    });
    await expect(row).toHaveCount(1);
    return row;
  }

  openInKnowledgeMap(row: Locator): Locator {
    return row.getByRole('button', { name: /Open in knowledge map/ });
  }
}
