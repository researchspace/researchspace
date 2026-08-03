/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { expect, request as playwrightRequest, test, type APIRequestContext } from '@playwright/test';

import { loadArtResearchFixture } from '../fixtures/sparql-fixture.js';
import { SemanticSearchPage } from '../pages/semantic-search.page.js';

let dropFixture: (() => Promise<void>) | undefined;
let fixtureRequest: APIRequestContext | undefined;

test.beforeAll(async () => {
  fixtureRequest = await playwrightRequest.newContext({
    baseURL: process.env.RS_BASE_URL ?? 'http://localhost:10214',
    storageState: '.auth/user.json',
  });
  dropFixture = await loadArtResearchFixture(fixtureRequest);
});

test.afterAll(async () => {
  try {
    await dropFixture?.();
  } finally {
    await fixtureRequest?.dispose();
  }
});

test('shows the complete base semantic-search result set', async ({ page }) => {
  const search = new SemanticSearchPage(page);
  await search.open();

  await search.expectVisibleTitles(['Mona Lisa', 'Guernica', 'Las Meninas', 'Venus von Willendorf']);
  await expect(search.thumbnails.first()).toBeVisible();
});

test('keyword search shows all sample artworks before filtering', async ({ page }) => {
  await page.goto('/resource/Help:StructuredKeywordSearchExample');

  const search = page.locator('.structured-keyword-search-example');
  await expect(search.getByText(/^Found \d+ matches$/)).toHaveText('Found 20 matches');
  await expect(search.locator('.grid-resource-link')).toHaveCount(20);

  await search.getByPlaceholder('Search all, minimum 3 characters').fill('Mona Lisa');
  await expect(search.getByText(/^Found \d+ matches$/)).toHaveText('Found 1 matches');
  await expect(search.locator('.grid-resource-link')).toHaveCount(1);
  await expect(search.locator('.grid-resource-link')).toContainText('Mona Lisa');
});

test('structured search offers a date-range selector and filters results', async ({ page }) => {
  const search = new SemanticSearchPage(page, 'structured');
  await search.open();

  await search.selectStructuredYearRange(1888, 1889);
  await search.expectCount(3);
  await search.expectVisibleTitles(['Sunflowers.', 'Café Terrace at Night', 'The Red Vineyard']);
});

test('structured search autocompletes resources and filters by creator', async ({ page }) => {
  const search = new SemanticSearchPage(page, 'structured');
  await search.open();

  await search.selectStructuredResource('Creator', 'Gogh', 'Gogh, Vincent van');
  await search.expectCount(3);
  await search.expectVisibleTitles(['Sunflowers.', 'Café Terrace at Night', 'The Red Vineyard']);
});

test('semantic-search documentation examples filter CIDOC artworks', async ({ page }) => {
  await page.goto('/resource/Help:SemanticSearch');

  const keyword = page.getByPlaceholder('Search all, minimum 3 characters');
  const simpleArtworks = page.locator('.semantic-search-simple-artwork');
  await expect(simpleArtworks).toHaveCount(4);

  await keyword.fill('night');
  await expect(simpleArtworks).toHaveCount(1);
  await expect(simpleArtworks).toContainText('Outdoor Café at Night.');

  const artworks = page.locator('.semantic-search-constant-artwork');
  await expect(artworks).toHaveCount(4);
  const thumbnails = artworks.locator('.semantic-search-result-thumbnail');
  await expect(thumbnails).toHaveCount(4);
  await expect(thumbnails.first()).toBeVisible();
});

test('structured search filters titles with free text', async ({ page }) => {
  const search = new SemanticSearchPage(page, 'structured');
  await search.open();

  await search.selectStructuredText('Title', 'mona lisa');
  await search.expectCount(1);
  await search.expectVisibleTitles(['Mona Lisa']);
});

test('combines structured search with a facet filter', async ({ page }) => {
  const search = new SemanticSearchPage(page, 'structured');
  await search.open();
  await search.selectStructuredYearRange(1888, 1889);
  await search.expectCount(3);

  const title = await search.openRelation('Title');
  await search.filterFacetValues(title, 'Sunflowers.');
  await search.selectFacetValue(title, 'Sunflowers.');
  await search.expectCount(1);
  await search.expectVisibleTitles(['Sunflowers.']);
});

test('narrows resource autocomplete results with a literal facet', async ({ page }) => {
  const search = new SemanticSearchPage(page, 'structured');
  await search.open();
  await search.selectStructuredResource('Creator', 'Gogh', 'Gogh, Vincent van');
  await search.expectCount(3);

  const title = await search.openRelation('Title');
  await search.filterFacetValues(title, 'Sunflowers.');
  await expect(search.facetValue(title, 'Sunflowers.')).toContainText('(1)');
  await search.selectFacetValue(title, 'Sunflowers.');
  await search.expectCount(1);
  await search.expectVisibleTitles(['Sunflowers.']);
});

test('narrows free-text results with a resource facet', async ({ page }) => {
  const search = new SemanticSearchPage(page, 'structured');
  await search.open();
  await search.selectStructuredText('Title', 'night');
  await search.expectCount(2);
  await search.expectVisibleTitles(['Café Terrace at Night', 'The Nightmare']);

  const creator = await search.openRelation('Creator');
  await search.filterFacetValues(creator, 'Gogh');
  await expect(search.facetValue(creator, 'Gogh, Vincent van')).toContainText('(1)');
  await search.selectFacetValue(creator, 'Gogh, Vincent van');
  await search.expectCount(1);
  await search.expectVisibleTitles(['Café Terrace at Night']);
});

test('filters and combines multiple creator facet values with OR', async ({ page }) => {
  const search = new SemanticSearchPage(page);
  await search.open();

  const creator = await search.openRelation('Creator');
  await search.filterFacetValues(creator, 'Gogh');
  await expect(search.facetValue(creator, 'Gogh, Vincent van')).toContainText('(3)');
  await search.expectCount(20);
  await search.selectFacetValue(creator, 'Gogh, Vincent van');
  await search.expectCount(3);
  await search.expectVisibleTitles(['Sunflowers.', 'Café Terrace at Night', 'The Red Vineyard']);

  await search.filterFacetValues(creator, 'Picasso');
  await expect(search.facetValue(creator, 'Picasso, Pablo')).toContainText('(2)');
  await search.selectFacetValue(creator, 'Picasso, Pablo');
  await search.expectCount(5);
});

test('combines resource facets with AND and keeps contextual counts', async ({ page }) => {
  const search = new SemanticSearchPage(page);
  await search.open();

  const creator = await search.openRelation('Creator');
  await search.filterFacetValues(creator, 'Picasso');
  await search.selectFacetValue(creator, 'Picasso, Pablo');
  await search.expectCount(2);

  const objectType = await search.openRelation('Object type');
  await search.filterFacetValues(objectType, 'landscape format');
  await expect(search.facetValue(objectType, 'landscape format')).toContainText('(1)');
  await search.selectFacetValue(objectType, 'landscape format');
  await search.expectCount(1);
  await search.expectVisibleTitles(['Guernica']);
});

test('filters literal facet values and applies a title facet', async ({ page }) => {
  const search = new SemanticSearchPage(page);
  await search.open();

  const title = await search.openRelation('Title');
  await search.filterFacetValues(title, 'Mona Lisa');
  await search.expectCount(20);
  await search.selectFacetValue(title, 'Mona Lisa');
  await search.expectCount(1);
  await search.expectVisibleTitles(['Mona Lisa']);
});

test('filters an AD production-date range', async ({ page }) => {
  const search = new SemanticSearchPage(page);
  await search.open();

  const productionDate = await search.openRelation('Production date');
  await search.setDateRange(productionDate, 1888, 1889);
  await search.expectCount(3);
  await search.expectVisibleTitles(['Sunflowers.', 'Café Terrace at Night', 'The Red Vineyard']);
});

test.describe('historical-timezone date boundary', () => {
  test.use({ timezoneId: 'Europe/Athens' });

  test('matches an exact production year without a boundary shift', async ({ page }) => {
    const search = new SemanticSearchPage(page);
    await search.open();

    const productionDate = await search.openRelation('Production date');
    await search.setDateRange(productionDate, 1888, 1888);
    await search.expectCount(3);
  });
});

test('includes large BCE values in the production-date facet', async ({ page }) => {
  const search = new SemanticSearchPage(page);
  await search.open();

  const productionDate = await search.openRelation('Production date');
  await expect(productionDate.locator('input[type="number"]').first()).toHaveValue('40000', { timeout: 5_000 });
  await expect(productionDate.locator('select').first()).toHaveValue('BC', { timeout: 5_000 });

  await search.setDateRange(productionDate, 28000, 28000, 'BC');
  await search.expectCount(3);
  await search.expectVisibleTitles(['Weibliches Idol', 'Steinbock', 'Venus von Willendorf']);
});
