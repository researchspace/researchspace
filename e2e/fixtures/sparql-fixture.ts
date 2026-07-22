/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { APIRequestContext } from '@playwright/test';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';

export const ARTRESEARCH_GRAPH = 'urn:researchspace:e2e:artresearch-semantic-search';
export const ARTRESEARCH_FIXTURE_PATH = path.join(
  __dirname,
  'artresearch',
  'artresearch-semantic-search.nt'
);

type FixtureServer = {
  fixtureUrl: string;
  close: () => Promise<void>;
};

async function startFixtureServer(filePath: string): Promise<FixtureServer> {
  const fixtureName = path.basename(filePath);
  const fixture = fs.readFileSync(filePath);
  const server = http.createServer((request, response) => {
    if (request.url !== `/${fixtureName}`) {
      response.writeHead(404).end();
      return;
    }

    response.writeHead(200, {
      'Content-Type': 'application/n-triples',
      'Content-Length': fixture.byteLength,
    });
    response.end(fixture);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '0.0.0.0', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Could not determine the fixture HTTP server port');
  }

  const advertisedHost = process.env.RS_FIXTURE_HOST ?? '127.0.0.1';
  return {
    fixtureUrl: `http://${advertisedHost}:${address.port}/${fixtureName}`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      ),
  };
}

async function sparqlUpdate(request: APIRequestContext, update: string): Promise<void> {
  const response = await request.post('/sparql', {
    headers: {
      Accept: 'text/boolean',
      'Content-Type': 'application/sparql-update; charset=UTF-8',
    },
    data: update,
  });

  if (!response.ok()) {
    throw new Error(`SPARQL update failed (${response.status()}): ${await response.text()}`);
  }
}

export async function selectJson(request: APIRequestContext, query: string): Promise<any> {
  const response = await request.post('/sparql', {
    headers: {
      Accept: 'application/sparql-results+json',
      'Content-Type': 'application/sparql-query; charset=UTF-8',
    },
    data: query,
  });

  if (!response.ok()) {
    throw new Error(`SPARQL query failed (${response.status()}): ${await response.text()}`);
  }
  return response.json();
}

async function graphSize(request: APIRequestContext): Promise<number> {
  const result = await selectJson(
    request,
    `SELECT (COUNT(*) AS ?count) WHERE { GRAPH <${ARTRESEARCH_GRAPH}> { ?s ?p ?o } }`
  );
  return Number(result.results.bindings[0].count.value);
}

/**
 * Replaces the deterministic E2E named graph using SPARQL LOAD. The temporary
 * HTTP server is necessary because LOAD is executed by the repository, not by
 * the Playwright process. Call the returned cleanup in afterAll.
 */
export async function loadArtResearchFixture(request: APIRequestContext): Promise<() => Promise<void>> {
  const fixtureServer = await startFixtureServer(ARTRESEARCH_FIXTURE_PATH);
  try {
    await sparqlUpdate(request, `DROP SILENT GRAPH <${ARTRESEARCH_GRAPH}>`);
    await sparqlUpdate(
      request,
      `LOAD <${fixtureServer.fixtureUrl}> INTO GRAPH <${ARTRESEARCH_GRAPH}>`
    );

    const size = await graphSize(request);
    if (size !== 1668) {
      throw new Error(`Expected 1668 fixture triples after LOAD, found ${size}`);
    }
  } catch (error) {
    try {
      await sparqlUpdate(request, `DROP SILENT GRAPH <${ARTRESEARCH_GRAPH}>`);
    } finally {
      await fixtureServer.close();
    }
    throw error;
  }

  return async () => {
    try {
      await sparqlUpdate(request, `DROP SILENT GRAPH <${ARTRESEARCH_GRAPH}>`);
      const size = await graphSize(request);
      if (size !== 0) {
        throw new Error(`Fixture graph still contains ${size} triples after DROP`);
      }
    } finally {
      await fixtureServer.close();
    }
  };
}
