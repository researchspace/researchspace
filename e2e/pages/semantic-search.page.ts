/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { expect, type Locator, type Page } from '@playwright/test';

function facetValueText(value: string): RegExp {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}\\s*\\(\\d+\\)\\s*$`);
}

export class SemanticSearchPage {
  readonly page: Page;
  readonly root: Locator;
  readonly count: Locator;
  readonly titles: Locator;
  readonly thumbnails: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator('.structured-constant-search-example');
    this.count = this.root.getByText(/^Found \d+ matches$/);
    this.titles = this.root.locator('.grid-resource-link');
    this.thumbnails = this.root.locator(
      '.semantic-search-result-thumbnail[src^="https://artresearch.net/cache/images/thumbnails/"]'
    );
  }

  async open(): Promise<void> {
    await this.page.goto('/resource/Help:StructuredConstantSearchExample');
    await expect(this.root).toBeVisible();
    await this.expectCount(20);
  }

  relation(name: string): Locator {
    return this.root
      .locator('.facet__relation')
      .filter({
        has: this.page.locator('.facet__relation__label').getByText(name, { exact: true }),
      });
  }

  async openRelation(name: string): Promise<Locator> {
    const relation = this.relation(name);
    await expect(relation).toBeVisible();
    if (!(await relation.locator('.facet__relation__body').isVisible())) {
      await relation.locator('.facet__relation__header').click();
    }
    await expect(relation.locator('.facet__relation__body')).toBeVisible();
    return relation;
  }

  facetValue(relation: Locator, label: string): Locator {
    return relation
      .locator('.facet__relation__values__value')
      .filter({
        has: this.page.locator('.facet__relation__values__value-label').filter({
          hasText: facetValueText(label),
        }),
      });
  }

  async filterFacetValues(relation: Locator, value: string): Promise<void> {
    const input = relation.locator('.facet__relation__values__filter input');
    await expect(input).toBeVisible();
    await input.fill(value);
  }

  async selectFacetValue(relation: Locator, label: string): Promise<void> {
    const value = this.facetValue(relation, label);
    const checkbox = value.locator('input[type="checkbox"]');
    await expect(value).toBeVisible();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  }

  async expectCount(expected: number): Promise<void> {
    await expect(this.count).toHaveText(`Found ${expected} matches`);
  }

  async expectVisibleTitles(expected: string[]): Promise<void> {
    for (const title of expected) {
      await expect(this.titles.filter({ hasText: title })).toBeVisible();
    }
  }

  async setDateRange(relation: Locator, begin: number, end: number, epoch: 'AD' | 'BC' = 'AD'): Promise<void> {
    const yearInputs = relation.locator('input[type="number"]');
    const epochInputs = relation.locator('select');
    await expect(yearInputs).toHaveCount(2);
    await expect(epochInputs).toHaveCount(2);

    await epochInputs.nth(0).selectOption(epoch);
    await epochInputs.nth(1).selectOption(epoch);
    await yearInputs.nth(0).fill(String(begin));
    await yearInputs.nth(1).fill(String(end));
  }
}
