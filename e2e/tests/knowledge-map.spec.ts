/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { test, expect } from '@playwright/test';
import * as path from 'node:path';
import { KnowledgeMap } from '../pages';

// Digilib requires a non-degenerate image.
const TEST_IMAGE = path.resolve('fixtures/test-image.jpg');
// Keep shared-backend test data unique.
const uid = () => Date.now().toString(36);

test.describe('Knowledge Map', () => {
  test('a new map loads with its toolbar', async ({ page }) => {
    const km = await KnowledgeMap.openNew(page);
    await expect(km.canvas).toBeVisible();
    await expect(km.saveMapButton).toBeVisible();
  });

  test('create entities, connect them, save the map and reopen it', async ({ page }) => {
    const s = uid();
    const alpha = `Alpha ${s}`;
    const beta = `Beta ${s}`;

    const km = await KnowledgeMap.openNew(page);

    const a = await km.createEntity({ name: alpha, image: { name: `Image ${s}`, file: TEST_IMAGE } });
    const b = await km.createEntity({ name: beta });

    await a.expectImageRendered();

    await a.connectTo(b);
    expect(await km.linkCount()).toBeGreaterThan(0);

    await km.saveData();
    const iri = await km.saveMapAs(`E2E Map ${s}`);
    expect(iri).toContain('http');

    await km.reopen();
    await km.expectEntity(alpha);
    await km.expectEntity(beta);
    expect(await km.linkCount()).toBeGreaterThan(0);
    await km.entity(alpha).expectImageRendered();
  });

  test('groups survive saving and reopening the map (regression)', async ({ page }) => {
    const s = uid();
    const alpha = `Grouped Alpha ${s}`;
    const beta = `Grouped Beta ${s}`;
    const km = await KnowledgeMap.openNew(page);

    const a = await km.createEntity({ name: alpha });
    const b = await km.createEntity({ name: beta });
    await km.saveData();

    await km.groupEntities([a, b]);
    await km.expectGroupContaining([alpha, beta]);

    await km.saveMapAs(`E2E Group ${s}`);
    await km.reopen();

    await km.expectGroupContaining([alpha, beta]);
  });

  test('annotations survive saving and reopening the map (regression)', async ({ page }) => {
    const s = uid();
    const km = await KnowledgeMap.openNew(page);
    const target = await km.createEntity({ name: `Annotated ${s}` });
    await km.saveData();

    if (!target.ref.id) throw new Error('created entity has no diagram element id');
    const annotationId = await km.annotateElement(target.ref.id);
    const annotationText = `Annotation ${s}`;
    await km.editAnnotation(annotationId, annotationText);
    await km.expectAnnotation(annotationText);
    expect(await km.annotationLinkCount()).toBe(1);

    await km.saveMapAs(`E2E Annotation ${s}`);
    await km.reopen();

    await km.expectAnnotation(annotationText);
    expect(await km.annotationLinkCount()).toBe(1);
  });

  test('a saved image renders and stays in the edit form in-session (regression)', async ({ page }) => {
    const s = uid();
    const km = await KnowledgeMap.openNew(page);
    const art = await km.createEntity({ name: `Art ${s}`, image: { name: `Image ${s}`, file: TEST_IMAGE } });

    await art.expectImageRendered();
    await km.saveData();

    const form = await art.openEditForm();
    expect(await form.getName()).toBe(`Art ${s}`);
    await form.expectImagePresent();
    await form.cancel();
  });

  test('removing an image clears it from the card immediately (regression)', async ({ page }) => {
    const s = uid();
    const km = await KnowledgeMap.openNew(page);
    const art = await km.createEntity({ name: `Art ${s}`, image: { name: `Image ${s}`, file: TEST_IMAGE } });
    await art.expectImageRendered();
    await km.saveData();
    await art.expectImageRendered();

    const form = await art.openEditForm();
    await form.removeImage();
    await form.save();
    await art.expectNoImage();
  });

  test('instances search shows the entity label, not its IRI (regression)', async ({ page }) => {
    const s = uid();
    const label = `Findme ${s}`;
    const km = await KnowledgeMap.openNew(page);
    await km.createEntity({ name: label });
    await km.saveData();

    const results = await km.searchInstances(label);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.includes(label))).toBe(true);
    expect(results.every((r) => !/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(r.trim()))).toBe(true);
  });

  test('saving data does not recenter the map (regression)', async ({ page }) => {
    const s = uid();
    const km = await KnowledgeMap.openNew(page);
    const node = await km.createEntity({ name: `Node ${s}` });

    const before = await node.locator.boundingBox();
    await km.saveData();
    const after = await node.locator.boundingBox();

    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    expect(Math.abs(after!.x - before!.x)).toBeLessThan(5);
    expect(Math.abs(after!.y - before!.y)).toBeLessThan(5);
  });
});
