/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { readFile } from 'node:fs/promises';

import { type Page, type Locator, type Download, expect } from '@playwright/test';
import { ResourceSearch } from './ResourceSearch';

export interface ImportFile {
  name: string;
  content: string;
}

export interface DownloadedFile {
  fileName: string;
  text: string;
}

/** The knowledge map search page: download, delete and import. */
export class KnowledgeMapSearch extends ResourceSearch {
  static async open(page: Page): Promise<KnowledgeMapSearch> {
    const search = new KnowledgeMapSearch(page);
    await search.openFromFinder('Knowledge Map');
    return search;
  }

  get importButton(): Locator {
    return this.page.getByRole('button', { name: 'Import', exact: true });
  }

  get importDialog(): Locator {
    return this.page.locator('.modal').filter({ hasText: 'Import knowledge map' });
  }

  get importReport(): Locator {
    return this.importDialog.locator('.KnowledgeMapImport__report');
  }

  private async download(name: string, item: string): Promise<DownloadedFile> {
    const menu = await this.openActions(name);
    const started = this.page.waitForEvent('download');
    await menu.getByText(item, { exact: true }).click();
    const download: Download = await started;
    await expect.poll(() => download.failure()).toBeNull();
    return { fileName: download.suggestedFilename(), text: await readFile(await download.path(), 'utf8') };
  }

  downloadMap(name: string): Promise<DownloadedFile> {
    return this.download(name, 'Download Knowledge Map');
  }

  downloadData(name: string): Promise<DownloadedFile> {
    return this.download(name, 'Download Data');
  }

  /** Imports a file and returns the text of the report. */
  async importFile(file: ImportFile): Promise<string> {
    await this.importButton.click();
    await expect(this.importDialog).toBeVisible();
    await this.importDialog.locator('input[type="file"]').setInputFiles({
      name: file.name,
      mimeType: 'application/trig',
      buffer: Buffer.from(file.content, 'utf8'),
    });
    await expect(this.importReport).toBeVisible({ timeout: 60_000 });
    return this.importReport.innerText();
  }

  async closeImport(): Promise<void> {
    await this.importReport.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(this.importDialog).toHaveCount(0);
  }
}
