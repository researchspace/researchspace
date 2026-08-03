/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { expect, type Locator, type Page } from '@playwright/test';

type SemanticSearchExample = 'constant' | 'structured';

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

  private readonly example: SemanticSearchExample;

  constructor(page: Page, example: SemanticSearchExample = 'constant') {
    this.page = page;
    this.example = example;
    this.root = page.locator(
      example === 'constant' ? '.structured-constant-search-example' : '.structured-search-example'
    );
    this.count = this.root.getByText(/^Found \d+ matches$/);
    this.titles = this.root.locator('.grid-resource-link');
    this.thumbnails = this.root.locator(
      '.semantic-search-result-thumbnail[src^="https://artresearch.net/cache/images/thumbnails/"]'
    );
  }

  async open(): Promise<void> {
    const resource =
      this.example === 'constant' ? 'Help:StructuredConstantSearchExample' : 'Help:StructuredSearchExample';
    await this.page.goto(`/resource/${resource}`);
    await expect(this.root).toBeVisible();
    if (this.example === 'constant') {
      await this.expectCount(20);
    } else {
      await expect(
        this.root.getByRole('listbox', { name: 'search domain category selection' })
      ).toBeVisible();
    }
  }

  async selectStructuredYearRange(begin: number, end: number): Promise<void> {
    await this.selectStructuredRange('Production date');

    const dateFormat = this.root.getByText('Select Date or Range Type', { exact: true });
    await expect(dateFormat).toBeVisible();
    await dateFormat.click();

    const dateFormatOptions = this.root.locator('.Select-menu .Select-option');
    await expect(dateFormatOptions).toHaveCount(6);
    await dateFormatOptions.nth(4).click();

    const yearInputs = this.root.locator('input[placeholder="YYYY"]');
    await expect(yearInputs).toHaveCount(2);
    await yearInputs.nth(0).fill(String(begin));
    await yearInputs.nth(1).fill(String(end));
    await this.root.getByRole('button', { name: 'Select', exact: true }).click();
  }

  async selectStructuredResource(range: string, searchTerm: string, suggestion: string): Promise<void> {
    await this.selectStructuredRange(range);

    const input = this.root.getByRole('combobox');
    await expect(input).toBeVisible();
    await input.fill(searchTerm);

    const options = this.root.locator('.Select-option').filter({ hasText: suggestion });
    await expect(options).toHaveCount(1);
    await options.first().click();
  }

  async selectStructuredText(range: string, text: string): Promise<void> {
    await this.selectStructuredRange(range);

    const input = this.root.locator('input[placeholder="text"]');
    await expect(input).toBeVisible();
    await input.fill(text);
    await this.root.getByRole('button', { name: 'Find Text', exact: true }).click();
  }

  private async selectStructuredRange(range: string): Promise<void> {
    await this.root
      .getByRole('listbox', { name: 'search domain category selection' })
      .getByRole('option', { name: 'Human-made object' })
      .click();
    await this.root
      .getByRole('listbox', { name: 'search range category selection' })
      .getByRole('option', { name: range })
      .click();
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
