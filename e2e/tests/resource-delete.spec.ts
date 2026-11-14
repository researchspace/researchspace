/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { test, expect } from '@playwright/test';
import { Clipboard, KnowledgeMap } from '../pages';
import { KnowledgeMapSearch } from '../pages/KnowledgeMapSearch';
import { ResourceSearch } from '../pages/ResourceSearch';
import { Sparql } from '../pages/Sparql';

const uid = () => Date.now().toString(36);
const CRM = 'http://www.cidoc-crm.org/cidoc-crm/';
const KM_CONFIG = 'http://www.researchspace.org/resource/system/resource_configurations_container/data/Knowledge_map';
const RESOURCE_FORM = 'http://www.researchspace.org/pattern/system/resource_configuration/resource_form';
const KM_FORM = 'http://www.researchspace.org/resource/system/forms/KnowledgeMap';

test.describe('Deleting resources from the delete dialog', () => {
  test('a knowledge map is removed by one click, with progress shown at once', async ({ page }) => {
    const sparql = new Sparql(page.request);
    const token = uid();
    const name = `Delete Once ${token}`;
    const km = await KnowledgeMap.openNew(page);
    await km.createEntity({ name: `Node ${token}` });
    await km.saveData();
    const iri = await km.saveMapAs(name);

    const search = await KnowledgeMapSearch.open(page);
    await search.find(token);
    const ldpDeletes: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'DELETE' && request.url().includes('/container')) ldpDeletes.push(request.url());
    });
    const dialog = await search.openDeleteDialog(name);
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(dialog.getByText('Deleting resource')).toBeVisible({ timeout: 2_000 });
    await expect(dialog).toHaveCount(0, { timeout: 30_000 });

    expect(ldpDeletes).toHaveLength(1);
    expect(await sparql.inLdpContainer(iri)).toBe(false);
    expect(await sparql.graphSize(`${iri}/context`)).toBe(0);
    expect(await sparql.ask(`ASK { <${iri}> ?p ?o }`)).toBe(false);
  });

  test('a place is removed with all of its statements', async ({ page }) => {
    const sparql = new Sparql(page.request);
    const token = uid();
    const name = `Place ${token}`;
    const km = await KnowledgeMap.openNew(page);
    await km.createEntity({ name, type: 'Place' });
    await km.saveData();
    const [{ place }] = await sparql.select(`SELECT ?place WHERE {
      ?place <${CRM}P1_is_identified_by>/<${CRM}P190_has_symbolic_content> ${JSON.stringify(name)} }`);

    const search = await ResourceSearch.open(page, 'Place');
    await search.find(token);
    await search.delete(name);

    await search.find(token);
    await search.expectNotListed(name);
    expect(await sparql.ask(`ASK { <${place}> ?p ?o }`)).toBe(false);
  });

  test('a knowledge map in the clipboard is removed together with its clipboard entry', async ({ page }) => {
    const sparql = new Sparql(page.request);
    const token = uid();
    const name = `Clipboard Entry ${token}`;
    const member = `Member ${token}`;
    const km = await KnowledgeMap.openNew(page);
    await km.createEntity({ name: member });
    await km.saveData();
    const iri = await km.saveMapAs(name);
    const clipboard = await new Clipboard(page).open();
    await clipboard.drop(km.dragHandle);
    await clipboard.expectMap(name);
    const entry = `ASK { ?item <http://www.researchspace.org/resource/system/setItem> <${iri}> }`;
    expect(await sparql.ask(entry)).toBe(true);

    const search = await KnowledgeMapSearch.open(page);
    await search.find(token);
    await search.delete(name);

    expect(await sparql.inLdpContainer(iri)).toBe(false);
    await expect.poll(() => sparql.ask(entry), 'the clipboard entry is removed').toBe(false);
    expect(await sparql.ask(`ASK { <${iri}> ?p ?o }`)).toBe(false);
    expect(await sparql.ask(`ASK { ?entity <${CRM}P1_is_identified_by>/<${CRM}P190_has_symbolic_content> ${JSON.stringify(member)} }`),
      'the resource shown on the knowledge map is kept').toBe(true);
  });

  test('says that a resource cannot be deleted when its form cannot be loaded', async ({ page }) => {
    const sparql = new Sparql(page.request);
    const token = uid();
    const name = `Broken Form ${token}`;
    const km = await KnowledgeMap.openNew(page);
    await km.createEntity({ name: `Node ${token}` });
    await km.saveData();
    const iri = await km.saveMapAs(name);

    const missing = 'http://www.researchspace.org/resource/system/forms/DoesNotExist';
    const pointFormTo = (from: string, to: string) => sparql.update(`
      DELETE { GRAPH ?g { <${KM_CONFIG}> <${RESOURCE_FORM}> <${from}> } }
      INSERT { GRAPH ?g { <${KM_CONFIG}> <${RESOURCE_FORM}> <${to}> } }
      WHERE { GRAPH ?g { <${KM_CONFIG}> <${RESOURCE_FORM}> <${from}> } }`);
    await pointFormTo(KM_FORM, missing);
    try {
      const search = await KnowledgeMapSearch.open(page);
      await search.find(token);
      const dialog = await search.openDeleteDialog(name);
      await expect(dialog.getByText('This resource cannot be deleted from here')).toBeVisible({ timeout: 30_000 });
      await expect(dialog.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
      await dialog.getByRole('button', { name: 'Close', exact: true }).last().click();
      await expect(dialog).toHaveCount(0);
      expect(await sparql.inLdpContainer(iri)).toBe(true);
    } finally {
      await pointFormTo(missing, KM_FORM);
    }
  });
});
