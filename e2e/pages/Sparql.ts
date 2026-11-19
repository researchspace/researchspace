/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type APIRequestContext, expect } from '@playwright/test';

export type Row = Record<string, string>;

/** Direct access to the platform SPARQL endpoint, to check what the UI left in the database. */
export class Sparql {
  constructor(private readonly request: APIRequestContext) {}

  async select(query: string): Promise<Row[]> {
    const response = await this.request.post('/sparql', {
      form: { query },
      headers: { Accept: 'application/sparql-results+json' },
    });
    expect(response.ok(), `SPARQL query failed: ${await response.text()}`).toBeTruthy();
    const json = await response.json();
    return json.results.bindings.map((binding: Record<string, { value: string }>) =>
      Object.fromEntries(Object.entries(binding).map(([name, term]) => [name, term.value])));
  }

  async ask(query: string): Promise<boolean> {
    const response = await this.request.post('/sparql', {
      form: { query },
      headers: { Accept: 'application/sparql-results+json' },
    });
    expect(response.ok(), `SPARQL query failed: ${await response.text()}`).toBeTruthy();
    return (await response.json()).boolean;
  }

  async update(update: string): Promise<void> {
    const response = await this.request.post('/sparql', { form: { update } });
    expect(response.ok(), `SPARQL update failed: ${await response.text()}`).toBeTruthy();
  }

  graphSize(graph: string): Promise<number> {
    return this.select(`SELECT (COUNT(*) AS ?n) WHERE { GRAPH <${graph}> { ?s ?p ?o } }`)
      .then((rows) => Number(rows[0].n));
  }

  inLdpContainer(iri: string): Promise<boolean> {
    return this.ask(`ASK { ?container <http://www.w3.org/ns/ldp#contains> <${iri}> }`);
  }
}
