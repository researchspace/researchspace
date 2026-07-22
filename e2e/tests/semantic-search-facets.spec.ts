/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { expect, request as playwrightRequest, test, type APIRequestContext } from '@playwright/test';

import {
  ARTRESEARCH_GRAPH,
  loadArtResearchFixture,
  selectJson,
} from '../fixtures/sparql-fixture.js';
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

test('loads the CIDOC fixture with the date edge cases used by facets', async ({ request }) => {
  const result = await selectJson(
    request,
    `
      PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
      SELECT
        (COUNT(DISTINCT ?work) AS ?works)
        (COUNT(DISTINCT ?withoutTimeSpan) AS ?withoutTimeSpan)
        (COUNT(DISTINCT ?bceWork) AS ?bceWorks)
        (COUNT(DISTINCT ?beginOnlyWork) AS ?beginOnlyWorks)
        (COUNT(DISTINCT ?endOnlyWork) AS ?endOnlyWorks)
        (COUNT(DISTINCT ?zeroWidthWork) AS ?zeroWidthWorks)
      WHERE {
        GRAPH <${ARTRESEARCH_GRAPH}> {
          ?work a crm:E22_Human-Made_Object .
          OPTIONAL {
            ?withoutTimeSpan a crm:E22_Human-Made_Object .
            FILTER NOT EXISTS {
              ?withoutTimeSpan crm:P108i_was_produced_by/crm:P9_consists_of*/crm:P4_has_time-span ?anyTimeSpan .
            }
          }
          OPTIONAL {
            ?bceWork a crm:E22_Human-Made_Object ;
              crm:P108i_was_produced_by/crm:P9_consists_of*/crm:P4_has_time-span ?bceTimeSpan .
            ?bceTimeSpan crm:P82a_begin_of_the_begin ?bceBegin .
            FILTER(STRSTARTS(STR(?bceBegin), "-"))
          }
          OPTIONAL {
            ?beginOnlyWork a crm:E22_Human-Made_Object ;
              crm:P108i_was_produced_by/crm:P9_consists_of*/crm:P4_has_time-span ?beginOnlyTimeSpan .
            ?beginOnlyTimeSpan crm:P82a_begin_of_the_begin ?beginOnly .
            FILTER NOT EXISTS { ?beginOnlyTimeSpan crm:P82b_end_of_the_end ?unusedEnd }
          }
          OPTIONAL {
            ?endOnlyWork a crm:E22_Human-Made_Object ;
              crm:P108i_was_produced_by/crm:P9_consists_of*/crm:P4_has_time-span ?endOnlyTimeSpan .
            ?endOnlyTimeSpan crm:P82b_end_of_the_end ?endOnly .
            FILTER NOT EXISTS { ?endOnlyTimeSpan crm:P82a_begin_of_the_begin ?unusedBegin }
          }
          OPTIONAL {
            ?zeroWidthWork a crm:E22_Human-Made_Object ;
              crm:P108i_was_produced_by/crm:P9_consists_of*/crm:P4_has_time-span ?zeroWidthTimeSpan .
            ?zeroWidthTimeSpan crm:P82a_begin_of_the_begin ?sameDate ;
              crm:P82b_end_of_the_end ?sameDate .
          }
        }
      }
    `
  );

  expect(result.results.bindings[0]).toMatchObject({
    works: { value: '20' },
    withoutTimeSpan: { value: '4' },
    bceWorks: { value: '6' },
    beginOnlyWorks: { value: '1' },
    endOnlyWorks: { value: '1' },
    zeroWidthWorks: { value: '1' },
  });
});

test('shows the complete base semantic-search result set', async ({ page }) => {
  const search = new SemanticSearchPage(page);
  await search.open();

  await search.expectVisibleTitles(['Mona Lisa', 'Guernica', 'Las Meninas', 'Venus von Willendorf']);
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
  await search.expectVisibleTitles(['The Bedroom', 'Café Terrace at Night', 'The Red Vineyard']);

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
  await expect(search.titles.filter({ hasText: 'The Old Guitarist' })).toHaveCount(0);
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
  await search.expectVisibleTitles(['The Bedroom', 'Café Terrace at Night', 'The Red Vineyard']);
});

test.describe('historical-timezone date boundary', () => {
  test.use({ timezoneId: 'Europe/Athens' });

  test('matches an exact production year without a boundary shift', async ({ page }) => {
    test.fail(true, 'Master serializes year boundaries in the browser historical timezone');

    const search = new SemanticSearchPage(page);
    await search.open();

    const productionDate = await search.openRelation('Production date');
    await search.setDateRange(productionDate, 1888, 1888);
    await expect(search.count).toHaveText('3', { timeout: 5_000 });
  });
});

test('includes large BCE values in the production-date facet', async ({ page }) => {
  test.fail(true, 'Master drops expanded negative xsd:dateTime years while parsing facet values');

  const search = new SemanticSearchPage(page);
  await search.open();

  const productionDate = await search.openRelation('Production date');
  await expect(productionDate.locator('input[type="number"]').first()).toHaveValue('40000', { timeout: 5_000 });
  await expect(productionDate.locator('select').first()).toHaveValue('BC', { timeout: 5_000 });

  await search.setDateRange(productionDate, 28000, 28000, 'BC');
  await search.expectCount(3);
  await search.expectVisibleTitles(['Weibliches Idol', 'Steinbock', 'Venus von Willendorf']);
});
