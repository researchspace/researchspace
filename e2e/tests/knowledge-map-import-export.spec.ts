/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { writeFile } from 'node:fs/promises';

import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { KnowledgeMap } from '../pages';
import { DataImportPage } from '../pages/DataImportPage';
import { KnowledgeMapSearch } from '../pages/KnowledgeMapSearch';
import { Sparql } from '../pages/Sparql';

const uid = () => Date.now().toString(36);

async function keep(testInfo: TestInfo, file: { fileName: string; text: string }): Promise<void> {
  const path = testInfo.outputPath(file.fileName);
  await writeFile(path, file.text);
  await testInfo.attach(file.fileName, { path, contentType: 'application/trig' });
}

interface AuthoredMap {
  token: string;
  name: string;
  iri: string;
  source: string;
  target: string;
  /** Number of links and position of the target card relative to the source card, as reopened. */
  links: number;
  delta: { x: number; y: number };
}

async function authorMap(page: Page): Promise<AuthoredMap> {
  const token = uid();
  const source = `Source ${token}`;
  const target = `Target ${token}`;
  const km = await KnowledgeMap.openNew(page);
  const a = await km.createEntity({ name: source });
  const b = await km.createEntity({ name: target });
  await a.connectTo(b);
  await km.saveData();
  const name = `Roundtrip ${token}`;
  const iri = await km.saveMapAs(name);
  await km.reopen();
  await km.expectEntity(source);
  await km.expectEntity(target);
  const from = await km.entity(source).position();
  const to = await km.entity(target).position();
  const links = await km.linkCount();
  return { token, name, iri, source, target, links, delta: { x: to.x - from.x, y: to.y - from.y } };
}

test.describe('Knowledge map download, delete and import', () => {
  test('a downloaded knowledge map is deleted completely and imported back with its IRI and layout', async ({ page }, testInfo) => {
    const sparql = new Sparql(page.request);
    const map = await authorMap(page);
    const contextGraph = `${map.iri}/context`;
    expect(await sparql.inLdpContainer(map.iri)).toBe(true);
    expect(await sparql.graphSize(contextGraph)).toBeGreaterThan(0);

    const search = await KnowledgeMapSearch.open(page);
    await search.find(map.token);
    await search.expectListed(map.name);

    const mapFile = await search.downloadMap(map.name);
    await keep(testInfo, mapFile);
    expect(mapFile.fileName).toBe(`Roundtrip-${map.token}.trig`);
    expect(mapFile.text).toContain(`<${contextGraph}>`);
    expect(mapFile.text).toContain(`<${map.iri}>`);
    expect(mapFile.text).toContain('http://ontodia.org/schema/v1#Diagram');

    const dataFile = await search.downloadData(map.name);
    await keep(testInfo, dataFile);
    expect(dataFile.fileName).toBe(`Roundtrip-${map.token}-data.trig`);
    expect(dataFile.text).toContain(`<${map.iri}/data>`);
    expect(dataFile.text).not.toContain('ontodia.org');

    await search.delete(map.name);
    await search.find(map.token);
    await search.expectNotListed(map.name);
    expect(await sparql.inLdpContainer(map.iri), 'container entry is removed').toBe(false);
    expect(await sparql.graphSize(contextGraph), 'layout graph is removed').toBe(0);
    expect(await sparql.ask(`ASK { <${map.iri}> ?p ?o }`), 'no statements about the map remain').toBe(false);

    const report = await search.importFile({ name: mapFile.fileName, content: mapFile.text });
    expect(report).toContain(`Imported knowledge map "${map.name}".`);
    expect(report).not.toContain('automatic layout');
    await search.closeImport();
    expect(await sparql.inLdpContainer(map.iri), 'the map is back under its IRI').toBe(true);
    await search.find(map.token);
    await search.expectListed(map.name);

    const again = await search.importFile({ name: mapFile.fileName, content: mapFile.text });
    expect(again).toContain(`The knowledge map "${map.name}" already exists, so it was not imported.`);
    await search.closeImport();

    const reopened = await KnowledgeMap.open(page, map.iri);
    await reopened.expectEntity(map.source);
    await reopened.expectEntity(map.target);
    expect(await reopened.linkCount()).toBe(map.links);
    const from = await reopened.entity(map.source).position();
    const to = await reopened.entity(map.target).position();
    expect(Math.abs((to.x - from.x) - map.delta.x)).toBeLessThan(8);
    expect(Math.abs((to.y - from.y) - map.delta.y)).toBeLessThan(8);
  });

  test('groups, annotations and their links survive download and import', async ({ page }, testInfo) => {
    const token = uid();
    const memberA = `Member A ${token}`;
    const memberB = `Member B ${token}`;
    const note = `Note ${token}`;
    const km = await KnowledgeMap.openNew(page);
    const a = await km.createEntity({ name: memberA });
    const b = await km.createEntity({ name: memberB });
    const c = await km.createEntity({ name: `Noted C ${token}` });
    await a.connectTo(c);
    await km.saveData();
    if (!c.ref.id) throw new Error('created entity has no diagram element id');
    await km.editAnnotation(await km.annotateElement(c.ref.id), note);
    await km.groupEntities([a, b]);
    const name = `Rich ${token}`;
    const iri = await km.saveMapAs(name);
    await km.reopen();
    await km.expectGroupContaining([memberA, memberB]);
    await km.expectAnnotation(note);
    const links = await km.linkCount();
    const annotationLinks = await km.annotationLinkCount();

    const search = await KnowledgeMapSearch.open(page);
    await search.find(token);
    const mapFile = await search.downloadMap(name);
    await keep(testInfo, mapFile);
    await search.delete(name);
    const report = await search.importFile({ name: mapFile.fileName, content: mapFile.text });
    expect(report).toContain(`Imported knowledge map "${name}".`);
    expect(report).not.toContain('automatic layout');
    await search.closeImport();

    const reopened = await KnowledgeMap.open(page, iri);
    await reopened.expectGroupContaining([memberA, memberB]);
    await reopened.expectAnnotation(note);
    expect(await reopened.linkCount()).toBe(links);
    expect(await reopened.annotationLinkCount()).toBe(annotationLinks);
  });

  test('the data download opens as a new knowledge map from its named graph', async ({ page }, testInfo) => {
    const sparql = new Sparql(page.request);
    const map = await authorMap(page);
    const dataGraph = `${map.iri}/data`;
    const search = await KnowledgeMapSearch.open(page);
    await search.find(map.token);
    const dataFile = await search.downloadData(map.name);
    await keep(testInfo, dataFile);

    const dataImport = await DataImportPage.open(page);
    try {
      await dataImport.upload({ name: dataFile.fileName, content: dataFile.text });
      await expect.poll(() => sparql.graphSize(dataGraph), { timeout: 60_000 }).toBeGreaterThan(0);
      const open = dataImport.openInKnowledgeMap(await dataImport.row(dataGraph));
      await expect(open).toBeEnabled();
      const resources = Number(/Open the (\d+) resources/.exec((await open.getAttribute('title')) ?? '')?.[1]);
      await open.click();
      await expect(page).toHaveURL(/ThinkingFrames\?graph=/);

      // the entities and their appellations carry the same label
      const km = await KnowledgeMap.current(page);
      await expect(km.entity(map.source).locator).toHaveCount(2);
      await expect(km.entity(map.target).locator).toHaveCount(2);
      await expect.poll(() => km.nodeCount()).toBe(resources);
      expect(await km.linkCount()).toBeGreaterThan(0);
      await expect(km.saveMapButton).toBeEnabled();
    } finally {
      await sparql.update(`DROP SILENT GRAPH <${dataGraph}>`);
    }
  });

  test('the data download has the statements of links that end at a grouped resource', async ({ page }, testInfo) => {
    const sparql = new Sparql(page.request);
    const token = uid();
    const km = await KnowledgeMap.openNew(page);
    const a = await km.createEntity({ name: `Grouped A ${token}` });
    const b = await km.createEntity({ name: `Grouped B ${token}` });
    const c = await km.createEntity({ name: `Outside C ${token}` });
    await a.connectTo(c);
    await km.saveData();
    await km.groupEntities([a, b]);
    const name = `Grouped ${token}`;
    await km.saveMapAs(name);
    const [statement] = await sparql.select(`SELECT ?s ?p ?o WHERE {
      ?s ?p ?o .
      ?s <http://www.cidoc-crm.org/cidoc-crm/P1_is_identified_by>/<http://www.cidoc-crm.org/cidoc-crm/P190_has_symbolic_content> "Grouped A ${token}" .
      ?o <http://www.cidoc-crm.org/cidoc-crm/P1_is_identified_by>/<http://www.cidoc-crm.org/cidoc-crm/P190_has_symbolic_content> "Outside C ${token}" }`);
    expect(statement, 'the link is stored in the database').toBeTruthy();

    const search = await KnowledgeMapSearch.open(page);
    await search.find(token);
    const dataFile = await search.downloadData(name);
    await keep(testInfo, dataFile);
    const mapFile = await search.downloadMap(name);
    await keep(testInfo, mapFile);
    expect(dataFile.text).toContain(`<${statement.s}> <${statement.p}> <${statement.o}>`);
  });

  test('a named graph with more than 200 resources is not opened as a knowledge map', async ({ page }) => {
    const sparql = new Sparql(page.request);
    const graph = `http://example.org/km-graph/large-${uid()}`;
    const statements = Array.from({ length: 130 }, (_, i) => `<${graph}/s${i}> <http://example.org/p> <${graph}/o${i}> .`);
    await sparql.update(`INSERT DATA { GRAPH <${graph}> { ${statements.join(' ')} } }`);
    try {
      const dataImport = await DataImportPage.open(page);
      const open = dataImport.openInKnowledgeMap(await dataImport.row(graph));
      await expect(open).toBeDisabled();
      await expect(open).toHaveAttribute('title', /more than 200 resources/);

      // the link itself is refused as well, not only the button
      await page.goto(`/resource/ThinkingFrames?graph=${encodeURIComponent(graph)}`);
      const km = await KnowledgeMap.current(page);
      await expect(page.getByText('This graph has more than 200 resources, too many for a readable knowledge map').first())
        .toBeVisible();
      expect(await km.nodeCount()).toBe(0);
    } finally {
      await sparql.update(`DROP SILENT GRAPH <${graph}>`);
    }
  });
});
