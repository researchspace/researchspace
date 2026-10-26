/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
/**
 * Phase 0 baseline measurements for the resource-configuration rework.
 *
 * Runs the same three scenarios against a local stack and writes request
 * counts and timings to e2e/perf-results/<label>.json so that checkouts of
 * different commits (1e18b2b3, resource-configuration-improvements, rci-rework)
 * can be compared number for number.
 *
 *   RS_PERF_LABEL     name of the results file (default: git describe of HEAD)
 *   RS_PERF_DIAGRAM   saved knowledge-map diagram IRI
 *                     (default: the IGSN_Modelling diagram, 82 nodes / 246 links)
 *   RS_PERF_RESOURCE  a resource with related research outputs
 *   RS_PERF_CONFIG    a resource configuration IRI for the search scenario
 *
 *   cd e2e && RS_PERF_LABEL=old-branch npx playwright test --config playwright.perf.config.ts
 */
import { test, expect, type Page } from '@playwright/test';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const DIAGRAM = process.env.RS_PERF_DIAGRAM ??
  'http://localhost:10214/container/ontodiaDiagramContainer/IGSN_Modelling';
const RESOURCE = process.env.RS_PERF_RESOURCE ?? 'https://example.org/heritage-sample/v0.9/painting';
const CONFIG = process.env.RS_PERF_CONFIG ??
  'http://www.researchspace.org/resource/system/resource_configurations_container/data/Knowledge_map';
const RESOURCE_CONTENT = 'http://www.researchspace.org/resource/ResourceContent';

/** Requests that tell the performance story. */
const COUNTED = {
  sparql: (url: string) => /\/sparql(\?|$)/.test(url),
  labels: (url: string) => url.includes('/rest/data/rdf/utils/getLabelsForRdfValue'),
  resourceConfig: (url: string) => url.includes('/rest/data/rdf/utils/getResourceConfiguration'),
  pageLoads: (url: string) => url.includes('/rest/template/pageHtml') || url.includes('/rest/template/html'),
  thumbnails: (url: string) => url.includes('/rest/data/rdf/utils/thumbnails'),
};
type Counter = keyof typeof COUNTED;

interface Sample {
  scenario: string;
  step: string;
  elapsedMs: number;
  counts: Record<Counter, number>;
  sparqlMs: number;
  notes?: Record<string, number | string>;
}

class Meter {
  private counts: Record<Counter, number> = this.zero();
  private sparqlMs = 0;
  private inflight = 0;
  readonly samples: Sample[] = [];

  constructor(private readonly page: Page) {
    page.on('request', request => {
      const url = request.url();
      (Object.keys(COUNTED) as Counter[]).forEach(key => { if (COUNTED[key](url)) this.counts[key]++; });
      this.inflight++;
    });
    const settle = (request: { url(): string; timing(): { responseEnd: number; requestStart: number } | undefined }) => {
      this.inflight--;
      const timing = request.timing && request.timing();
      if (timing && COUNTED.sparql(request.url()) && timing.responseEnd > 0) {
        this.sparqlMs += timing.responseEnd - Math.max(timing.requestStart, 0);
      }
    };
    page.on('requestfinished', request => settle(request as any));
    page.on('requestfailed', request => settle(request as any));
  }

  private zero(): Record<Counter, number> {
    return { sparql: 0, labels: 0, resourceConfig: 0, pageLoads: 0, thumbnails: 0 };
  }

  /** Wait until no request has been in flight for `quietMs`. */
  async quiet(quietMs = 1500, timeoutMs = 90_000): Promise<void> {
    const start = Date.now();
    let quietSince = this.inflight === 0 ? Date.now() : undefined;
    while (Date.now() - start < timeoutMs) {
      await this.page.waitForTimeout(100);
      if (this.inflight === 0) {
        quietSince = quietSince ?? Date.now();
        if (Date.now() - quietSince >= quietMs) return;
      } else {
        quietSince = undefined;
      }
    }
  }

  async measure(scenario: string, step: string, action: () => Promise<Record<string, number | string> | void>) {
    this.counts = this.zero();
    this.sparqlMs = 0;
    const started = Date.now();
    const notes = (await action()) || undefined;
    await this.quiet();
    const sample: Sample = {
      scenario, step, elapsedMs: Date.now() - started,
      counts: { ...this.counts }, sparqlMs: Math.round(this.sparqlMs), notes: notes || undefined,
    };
    this.samples.push(sample);
    console.log(JSON.stringify(sample));
  }
}

function label(): string {
  if (process.env.RS_PERF_LABEL) return process.env.RS_PERF_LABEL;
  try { return execSync('git describe --always --dirty', { cwd: path.join(__dirname, '..', '..') }).toString().trim(); }
  catch { return 'unlabelled'; }
}

function write(samples: Sample[]) {
  const dir = path.join(__dirname, '..', 'perf-results');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${label()}.json`);
  const existing: Sample[] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  fs.writeFileSync(file, JSON.stringify([...existing, ...samples], null, 2));
  console.log(`perf results -> ${file}`);
}

const cardsOnCanvas = (page: Page) => page.locator('.reactodia-canvas .resource-card').count();

test.describe('Phase 0 baseline', () => {
  test('knowledge map: load a saved diagram', async ({ page }) => {
    const meter = new Meter(page);
    await meter.measure('knowledge-map', 'open diagram', async () => {
      await page.goto(`/resource/ThinkingFrames?view=knowledge-map&resource=${encodeURIComponent(DIAGRAM)}`);
      await expect(page.locator('.reactodia-canvas')).toBeVisible();
      await expect.poll(() => cardsOnCanvas(page), { timeout: 90_000 }).toBeGreaterThan(0);
      await meter.quiet(2500);
      return { cards: await cardsOnCanvas(page) };
    });
    // Panning forces the canvas to render cards that were outside the viewport.
    await meter.measure('knowledge-map', 'pan and zoom out', async () => {
      const canvas = page.locator('.reactodia-canvas');
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.wheel(0, 1200);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 - 300, box.y + box.height / 2 - 200, { steps: 10 });
        await page.mouse.up();
      }
      await meter.quiet(2500);
      return { cards: await cardsOnCanvas(page) };
    });
    // Opening a node's resource from the map should not reload the map itself.
    await meter.measure('knowledge-map', 'open first node resource view', async () => {
      const link = page.locator('.reactodia-canvas .resource-card .text-link').first();
      if (await link.count()) await link.click();
      await meter.quiet(2500);
      return { cards: await cardsOnCanvas(page) };
    });
    write(meter.samples);
  });

  test('interactive resource view: related research outputs', async ({ page }) => {
    const meter = new Meter(page);
    await meter.measure('resource-view', 'open standalone interactive view', async () => {
      await page.goto(`/resource/?uri=${encodeURIComponent(RESOURCE)}&resourceView=page` +
        `&resourceVisualisationTemplate=${encodeURIComponent(RESOURCE_CONTENT)}`);
      await expect(page.locator('.resource-view, .page__content-container').first()).toBeVisible();
    });
    await meter.measure('resource-view', 'open Research Outputs tab', async () => {
      await page.getByRole('tab', { name: /Research Outputs/ }).first().click();
    });
    // Old design: collapsible sections; new design: category buttons. Exercise
    // whichever is present, twice, so the second pass shows what a re-render costs.
    const categories = page.locator('.resource-relatedResourcesView-categories button');
    const collapsibles = page.locator('.resource-relatedResourcesView-content .mp-collapsible-div-trigger, ' +
      '.resource-relatedResourcesView-content [class*="collapsible"] [role="button"]');
    const useCategories = (await categories.count()) > 0;
    const targets = useCategories ? categories : collapsibles;
    const n = Math.min(await targets.count(), 3);
    for (let pass = 1; pass <= 2; pass++) {
      for (let i = 0; i < n; i++) {
        await meter.measure('resource-view', `pass ${pass}: ${useCategories ? 'select category' : 'toggle section'} ${i + 1}`,
          async () => {
            await targets.nth(i).click();
            return { labelsVisible: await page.locator('.resource-relatedResourcesView-content mp-label, .resource-relatedResourcesView-content .text-link').count() };
          });
      }
    }
    write(meter.samples);
  });

  test('search page: view switch, paging and refresh', async ({ page }) => {
    const meter = new Meter(page);
    await meter.measure('search', 'open resource search frame', async () => {
      await page.goto(`/resource/ThinkingFrames?view=resource-search&resource=${encodeURIComponent(CONFIG)}`);
      await expect(page.locator('.semantic-search-content').first()).toBeVisible();
      await meter.quiet(2500);
      return { rows: await page.locator('.semantic-search-content table tbody tr').count() };
    });
    await meter.measure('search', 'next page', async () => {
      const next = page.getByRole('link', { name: 'Next page' }).first();
      if (await next.count()) await next.click();
      else await page.locator('.pagination li a').last().click();
      return { rows: await page.locator('.semantic-search-content table tbody tr').count() };
    });
    await meter.measure('search', 'refresh results', async () => {
      await page.getByRole('button', { name: 'Refresh results' }).first().click();
    });
    await meter.measure('search', 'switch to grid view', async () => {
      const toggle = page.locator('[id$="-view-type-selection"] .dropdown-toggle').first();
      if (await toggle.count()) {
        await toggle.click();
        const grid = page.getByRole('menuitem', { name: /grid/i }).first();
        if (await grid.count()) await grid.click();
      }
    });
    write(meter.samples);
  });
});
