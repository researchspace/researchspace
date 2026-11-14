/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { test, expect } from '@playwright/test';
import { KnowledgeMap, sel } from '../pages';
import { KnowledgeMapSearch } from '../pages/KnowledgeMapSearch';
import { Sparql } from '../pages/Sparql';

// Import files are exchanged between people and installations, so a file is untrusted input:
// whatever it contains, an import may only add the layout of knowledge maps, under an IRI
// that does not name anything yet.

const uid = () => Date.now().toString(36);
const O = 'http://ontodia.org/schema/v1#';
const CRM = 'http://www.cidoc-crm.org/cidoc-crm/';
const OWL = 'http://www.w3.org/2002/07/owl#';
const EX = 'http://example.org/km-import/';

/** A knowledge map with one positioned node, in the RDF format of the knowledge map container. */
function mapTrig(options: { iri: string; label: string; graph: string; element?: string; extra?: string }): string {
  const element = options.element ?? `urn:reactodia:e:${uid()}`;
  return `
<${options.graph}> {
  <${options.iri}> a <${O}Diagram> ;
    <${CRM}P190_has_symbolic_content> ${JSON.stringify(options.label)} ;
    <${O}layoutData> _:layout .
  _:layout a <${O}Layout> ; <${O}hasElement> <${element}> .
  <${element}> a <${O}Element> ;
    <${O}resource> <${EX}shown-resource> ;
    <${O}position> [ <${O}xCoordValue> 100 ; <${O}yCoordValue> 100 ] .
  ${options.extra ?? ''}
}`;
}

/** A stand-in ontology, stored like the real ones: in the graph <ontology IRI> + "context", not an LDP resource. */
async function withOntology(
  sparql: Sparql,
  body: (ontology: { iri: string; graph: string; isIntact: () => Promise<boolean> }) => Promise<void>
): Promise<void> {
  const iri = `${EX}ontology-${uid()}/`;
  const graph = `${iri}context`;
  await sparql.update(`INSERT DATA { GRAPH <${graph}> {
    <${iri}> a <${OWL}Ontology> .
    <${iri}Thing> a <${OWL}Class> ; <http://www.w3.org/2000/01/rdf-schema#label> "Thing" .
  } }`);
  try {
    await body({ iri, graph, isIntact: async () => (await sparql.graphSize(graph)) === 3 });
  } finally {
    await sparql.update(`DROP SILENT GRAPH <${graph}>`);
  }
}

test.describe('Knowledge map import of untrusted files', () => {
  test('does not write into a named graph that belongs to something else', async ({ page }) => {
    const sparql = new Sparql(page.request);
    await withOntology(sparql, async (ontology) => {
      const token = uid();
      const search = await KnowledgeMapSearch.open(page);
      const report = await search.importFile({
        name: 'overview.trig',
        content: mapTrig({ iri: ontology.iri, label: `Overview ${token}`, graph: `${EX}file-graph-${token}` }),
      });
      await search.closeImport();

      expect(report).toContain(`Failed to import knowledge map "Overview ${token}"`);
      expect(report).toContain(`its identifier ${ontology.iri} is already used by another resource`);
      expect(report).not.toContain('Open');
      expect(await sparql.inLdpContainer(ontology.iri)).toBe(false);
      expect(await ontology.isIntact()).toBe(true);
    });
  });

  test('does not turn an existing resource into a knowledge map', async ({ page }) => {
    const sparql = new Sparql(page.request);
    const token = uid();
    const name = `Person ${token}`;
    const km = await KnowledgeMap.openNew(page);
    await km.createEntity({ name });
    await km.saveData();
    const [{ entity }] = await sparql.select(`SELECT ?entity WHERE {
      ?entity <${CRM}P1_is_identified_by>/<${CRM}P190_has_symbolic_content> ${JSON.stringify(name)} }`);
    const statements = () => sparql.select(`SELECT ?p ?o WHERE { <${entity}> ?p ?o } ORDER BY ?p ?o`);
    const before = await statements();

    const search = await KnowledgeMapSearch.open(page);
    const report = await search.importFile({
      name: 'hijack.trig',
      content: mapTrig({ iri: entity, label: `Hijack ${token}`, graph: `${EX}file-graph-${token}` }),
    });
    await search.closeImport();

    expect(report).toContain(`its identifier ${entity} is already used by another resource`);
    expect(await statements()).toEqual(before);
    await search.find(token);
    await search.expectNotListed(name);
  });

  test('imports the layout only, no other statements', async ({ page }) => {
    const sparql = new Sparql(page.request);
    const token = uid();
    const iri = `${EX}map-${token}`;
    const label = `Layout ${token}`;
    const other = `${EX}other-${token}`;
    const search = await KnowledgeMapSearch.open(page);
    const report = await search.importFile({
      name: 'layout.trig',
      content: mapTrig({
        iri,
        label,
        graph: `${iri}/context`,
        // an "element" of the layout that is some other resource, with statements and state of its own
        element: other,
        extra: `<${other}> <http://www.w3.org/2000/01/rdf-schema#label> "not layout" ;
          <${EX}anyProperty> <${EX}anyValue> ;
          <${O}elementStateJson> ${JSON.stringify(JSON.stringify({
            'urn:reactodia:expanded': true,
            [`${EX}stateProperty`]: { '@id': `${other}/state`, [`${EX}anyProperty`]: 'x' },
          }))} .`,
      }),
    });
    await search.closeImport();
    try {
      expect(report).toContain(`Imported knowledge map "${label}".`);
      expect(await sparql.select(`SELECT ?s ?p ?o WHERE {
        ?s ?p ?o FILTER(STRSTARTS(STR(?s), "${other}"))
      }`), 'no statement about the other resource is stored').toEqual([]);
      // the graph of the knowledge map is about the map and its own elements only
      expect(await sparql.select(`SELECT DISTINCT ?s WHERE {
        GRAPH <${iri}/context> { ?s ?p ?o }
        FILTER(isIRI(?s) && ?s != <${iri}> && !STRSTARTS(STR(?s), "urn:reactodia:")
          && ?s != <http://www.researchspace.org/resource/system/ontodiaDiagramContainer>)
      }`)).toEqual([]);

      // the layout itself is there
      const km = await KnowledgeMap.open(page, iri);
      await expect.poll(() => km.nodeCount()).toBe(1);
    } finally {
      const cleanup = await KnowledgeMapSearch.open(page);
      await cleanup.find(token);
      await cleanup.delete(label);
    }
  });

  test('does not import a knowledge map without layout', async ({ page }) => {
    const sparql = new Sparql(page.request);
    const token = uid();
    const iri = `${EX}empty-${token}`;
    const label = `Empty ${token}`;
    const search = await KnowledgeMapSearch.open(page);
    const report = await search.importFile({
      name: 'empty.trig',
      content: `<${iri}/context> { <${iri}> a <${O}Diagram> ; <${CRM}P190_has_symbolic_content> ${JSON.stringify(label)} . }`,
    });
    await search.closeImport();

    expect(report).toContain(`Failed to import knowledge map "${label}": it has no layout in the file`);
    expect(await sparql.inLdpContainer(iri)).toBe(false);
  });

  test('a label with markup is shown as text', async ({ page }) => {
    const token = uid();
    const iri = `${EX}markup-${token}`;
    const label = `<img src=x onerror="window.__kmImportXss=1"> ${token}`;
    const search = await KnowledgeMapSearch.open(page);
    const report = await search.importFile({
      name: 'markup.trig',
      content: mapTrig({ iri, label, graph: `${iri}/context` }),
    });
    expect(report).toContain(label);
    await search.closeImport();
    try {
      await search.find(token);
      await search.expectListed(token);
      await KnowledgeMap.open(page, iri);
      expect(await page.evaluate(() => (window as any).__kmImportXss)).toBeUndefined();
    } finally {
      const cleanup = await KnowledgeMapSearch.open(page);
      await cleanup.find(token);
      await cleanup.delete(token);
    }
  });

  test('reports each knowledge map of a file and a file that cannot be read', async ({ page }) => {
    const sparql = new Sparql(page.request);
    const token = uid();
    const first = `${EX}first-${token}`;
    const second = `${EX}second-${token}`;
    const search = await KnowledgeMapSearch.open(page);
    await search.importFile({
      name: 'first.trig',
      content: mapTrig({ iri: first, label: `First ${token}`, graph: `${first}/context` }),
    });
    await search.closeImport();
    try {
      const report = await search.importFile({
        name: 'both.trig',
        content: `<${EX}both-${token}> {
          <${first}> a <${O}Diagram> ; <${CRM}P190_has_symbolic_content> "First ${token}" .
          <${second}> a <${O}Diagram> ; <${CRM}P190_has_symbolic_content> "Second ${token}" ;
            <${O}layoutData> [ a <${O}Layout> ; <${O}hasElement> <urn:reactodia:e:${token}> ] .
          <urn:reactodia:e:${token}> a <${O}Element> ; <${O}resource> <${EX}shown-resource> .
          <${EX}shown-resource> <${EX}anyProperty> <${EX}anyValue> .
        }`,
      });
      expect(report).toContain(`The knowledge map "First ${token}" already exists, so it was not imported.`);
      expect(report).toContain(`Imported knowledge map "Second ${token}".`);
      expect(report).toContain('Some of its nodes had no position, so an automatic layout was applied.');
      expect(report).toContain('Other data in the file was not imported.');
      await search.closeImport();
      expect(await sparql.ask(`ASK { <${EX}shown-resource> <${EX}anyProperty> ?o }`)).toBe(false);

      const broken = await search.importFile({ name: 'broken.trig', content: 'this is not trig' });
      expect(broken).toMatch(/broken\.trig could not be read: .*[^.]\. Nothing was imported\./);
      await search.closeImport();
    } finally {
      await search.find(token);
      for (const label of [`First ${token}`, `Second ${token}`]) {
        if (await search.row(label).count()) await search.delete(label);
      }
    }
  });

  // the server keeps the same rule for a name typed in the editor, which is used as IRI when it is one
  test('Save Map does not take the IRI of something else as the name', async ({ page }) => {
    const sparql = new Sparql(page.request);
    await withOntology(sparql, async (ontology) => {
      const km = await KnowledgeMap.openNew(page);
      await km.saveMapButton.click();
      const dialog = page.getByRole('dialog', { name: sel.saveMapModal.dialogName });
      await dialog.getByPlaceholder(sel.saveMapModal.namePlaceholder).fill(ontology.iri);
      const response = page.waitForResponse(
        (r) => r.request().method() === 'POST' && r.url().includes('/container'),
      );
      await dialog.getByRole('button', { name: sel.saveMapModal.saveButton, exact: true }).click();

      expect((await response).status()).toBeGreaterThanOrEqual(400);
      expect(await sparql.inLdpContainer(ontology.iri)).toBe(false);
      expect(await ontology.isIntact()).toBe(true);
    });
  });
});
