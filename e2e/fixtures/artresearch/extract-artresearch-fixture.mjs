#!/usr/bin/env node

/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixtureDirectory = dirname(fileURLToPath(import.meta.url));

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const CRM = 'http://www.cidoc-crm.org/cidoc-crm/';
const CUSTOM = 'https://artresearch.net/custom/';
const E22 = `${CRM}E22_Human-Made_Object`;
const P1 = `${CRM}P1_is_identified_by`;
const P2 = `${CRM}P2_has_type`;
const P4 = `${CRM}P4_has_time-span`;
const P7 = `${CRM}P7_took_place_at`;
const P9 = `${CRM}P9_consists_of`;
const P14 = `${CRM}P14_carried_out_by`;
const P43 = `${CRM}P43_has_dimension`;
const P45 = `${CRM}P45_consists_of`;
const P50 = `${CRM}P50_has_current_keeper`;
const P55 = `${CRM}P55_has_current_location`;
const P78 = `${CRM}P78_is_identified_by`;
const P79 = `${CRM}P79_beginning_is_qualified_by`;
const P80 = `${CRM}P80_end_is_qualified_by`;
const P81 = `${CRM}P81_ongoing_throughout`;
const P82A = `${CRM}P82a_begin_of_the_begin`;
const P82B = `${CRM}P82b_end_of_the_end`;
const P90 = `${CRM}P90_has_value`;
const P91 = `${CRM}P91_has_unit`;
const P108I = `${CRM}P108i_was_produced_by`;
const P190 = `${CRM}P190_has_symbolic_content`;
const THUMBNAIL_URL = `${CUSTOM}thumbnail_url`;
const WORK_PREFERRED_PHOTO = `${CUSTOM}work_preferred_photo`;

// A role defines the predicates retained for a resource and which connected
// resources should be traversed next. ArtResearch labels are always followed
// through P1/P190; rdfs:label and SKOS are intentionally not used.
const roleRules = {
  work: new Map([
    [RDF_TYPE, null],
    [P1, 'appellation'],
    [P2, 'entity'],
    [P43, 'dimension'],
    [P45, 'entity'],
    [P50, 'entity'],
    [P55, 'entity'],
    [P108I, 'activity'],
    [WORK_PREFERRED_PHOTO, 'photo'],
  ]),
  appellation: new Map([
    [RDF_TYPE, null],
    [P2, null],
    [P190, null],
  ]),
  dimension: new Map([
    [RDF_TYPE, null],
    [P1, 'appellation'],
    [P2, 'entity'],
    [P90, null],
    [P91, 'entity'],
  ]),
  activity: new Map([
    [RDF_TYPE, null],
    [P1, 'appellation'],
    [P2, 'entity'],
    [P4, 'timespan'],
    [P7, 'entity'],
    [P9, 'activity'],
    [P14, 'entity'],
  ]),
  timespan: new Map([
    [RDF_TYPE, null],
    [P1, 'appellation'],
    [P2, 'entity'],
    [P78, 'appellation'],
    [P79, null],
    [P80, null],
    [P81, null],
    [P82A, null],
    [P82B, null],
  ]),
  entity: new Map([
    [RDF_TYPE, null],
    [P1, 'appellation'],
  ]),
  photo: new Map([[THUMBNAIL_URL, null]]),
};

function parseArguments(argv) {
  const options = {
    endpoint: process.env.ARTRESEARCH_SPARQL_ENDPOINT || 'https://dev.artresearch.net/sparql',
    manifest: resolve(fixtureDirectory, 'selected-works.tsv'),
    output: resolve(fixtureDirectory, '../../../src/main/webapp/samples/sample-search.ttl'),
    concurrency: 4,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--endpoint') options.endpoint = argv[++index];
    else if (argument === '--manifest') options.manifest = resolve(argv[++index]);
    else if (argument === '--output') options.output = resolve(argv[++index]);
    else if (argument === '--concurrency') options.concurrency = Number(argv[++index]);
    else if (argument === '--help') {
      console.log(`Usage: node extract-artresearch-fixture.mjs [options]

Options:
  --endpoint URL       SPARQL endpoint (default: dev.artresearch.net)
  --manifest FILE      TSV work manifest
  --output FILE        Generated Turtle-compatible N-Triples sample
  --concurrency N      Concurrent requests (default: 4)
`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 12) {
    throw new Error('--concurrency must be an integer between 1 and 12');
  }
  return options;
}

function parseManifest(contents) {
  const entries = contents
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line, index) => {
      const [id, iri, expectedTitle, imageExpectation, coverage] = line.split('\t');
      if (!id || !iri || !expectedTitle || !imageExpectation || !coverage) {
        throw new Error(`Invalid manifest row ${index + 1}: expected five tab-separated columns`);
      }
      if (!['required', 'optional'].includes(imageExpectation)) {
        throw new Error(`Invalid image expectation for ${id}: expected required or optional`);
      }
      validateIri(iri);
      return { id, iri, expectedTitle, imageExpectation, coverage };
    });

  const uniqueIris = new Set(entries.map((entry) => entry.iri));
  if (uniqueIris.size !== entries.length) throw new Error('Manifest contains duplicate work IRIs');
  if (entries.length === 0) throw new Error('Manifest contains no works');
  return entries;
}

function validateIri(iri) {
  if (!/^https?:\/\/[^<>"{}\s]+$/.test(iri)) throw new Error(`Unsafe or unsupported IRI: ${iri}`);
}

function parseNTriples(contents, requestedIri) {
  return contents
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^<([^>]*)> <([^>]*)> (.+) \.$/);
      if (!match) throw new Error(`Cannot parse N-Triples line for ${requestedIri}: ${line}`);
      if (match[1] !== requestedIri) {
        throw new Error(`CONSTRUCT returned unexpected subject ${match[1]} for ${requestedIri}`);
      }
      const objectIriMatch = match[3].match(/^<([^>]*)>$/);
      return {
        line,
        subject: match[1],
        predicate: match[2],
        object: match[3],
        objectIri: objectIriMatch ? objectIriMatch[1] : null,
      };
    });
}

async function requestConstruct(endpoint, query, iri) {
  const attempts = 5;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/n-triples',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: new URLSearchParams({ query }),
      });
      const body = await response.text();
      if (response.ok) return body;

      const error = new Error(
        `SPARQL request for ${iri} returned HTTP ${response.status}: ${body.slice(0, 1000) || '<empty body>'}`,
      );
      error.retryable = response.status === 429 || response.status >= 500;
      throw error;
    } catch (error) {
      const retryable = error.retryable !== false;
      if (!retryable || attempt === attempts) throw error;
      const delay = 500 * 2 ** (attempt - 1);
      console.warn(`Retrying ${iri} after request failure (${attempt}/${attempts}): ${error.message}`);
      await new Promise((resolveDelay) => setTimeout(resolveDelay, delay));
    }
  }
  throw new Error(`Exhausted retries for ${iri}`);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const [manifestContents, queryTemplate] = await Promise.all([
    readFile(options.manifest, 'utf8'),
    readFile(resolve(fixtureDirectory, 'queries/construct-resource.rq'), 'utf8'),
  ]);
  const works = parseManifest(manifestContents);
  if (!queryTemplate.includes('{{RESOURCE_IRI}}') || !queryTemplate.includes('{{PREDICATE_IRI}}')) {
    throw new Error('CONSTRUCT query template is missing a resource or predicate placeholder');
  }

  const responseCache = new Map();
  const fetchPredicate = (iri, predicate) => {
    const key = `${iri}\t${predicate}`;
    if (!responseCache.has(key)) {
      const query = queryTemplate
        .replaceAll('{{RESOURCE_IRI}}', iri)
        .replaceAll('{{PREDICATE_IRI}}', predicate);
      const request = requestConstruct(options.endpoint, query, `${iri} <${predicate}>`).then((body) =>
        parseNTriples(body, iri),
      );
      responseCache.set(key, request);
    }
    return responseCache.get(key);
  };

  const queue = works.map((work) => ({ iri: work.iri, role: 'work' }));
  const queued = new Set(queue.map(({ iri, role }) => `${role}\t${iri}`));
  const output = new Set();
  let cursor = 0;

  while (cursor < queue.length) {
    const batch = queue.slice(cursor, cursor + options.concurrency);
    cursor += batch.length;
    const results = await Promise.all(
      batch.map(async (item) => {
        const predicates = [...roleRules[item.role].keys()];
        const byPredicate = [];
        for (const predicate of predicates) {
          byPredicate.push(await fetchPredicate(item.iri, predicate));
        }
        return { item, triples: byPredicate.flat() };
      }),
    );

    for (const { item, triples } of results) {
      const rules = roleRules[item.role];
      for (const triple of triples) {
        if (!rules.has(triple.predicate)) continue;
        output.add(triple.line);

        const nextRole = rules.get(triple.predicate);
        if (nextRole && triple.objectIri) {
          validateIri(triple.objectIri);
          const key = `${nextRole}\t${triple.objectIri}`;
          if (!queued.has(key)) {
            queued.add(key);
            queue.push({ iri: triple.objectIri, role: nextRole });
          }
        }
      }
    }

    if (cursor % 40 === 0 || cursor >= queue.length) {
      console.log(`Processed ${Math.min(cursor, queue.length)}/${queue.length} queued resources`);
    }
  }

  const sortedLines = [...output].sort();
  validateFixture(sortedLines, works);
  await mkdir(dirname(options.output), { recursive: true });
  await writeFile(options.output, `${sortedLines.join('\n')}\n`, 'utf8');

  console.log(`Wrote ${sortedLines.length} triples for ${works.length} works to ${options.output}`);
  console.log(`Executed ${responseCache.size} bounded CIDOC-CRM predicate requests against ${options.endpoint}`);
}

function validateFixture(lines, works) {
  const triples = lines.map((line) => {
    const match = line.match(/^<([^>]*)> <([^>]*)> (.+) \.$/);
    return { subject: match[1], predicate: match[2], object: match[3] };
  });

  for (const work of works) {
    const isE22 = triples.some(
      (triple) =>
        triple.subject === work.iri && triple.predicate === RDF_TYPE && triple.object === `<${E22}>`,
    );
    if (!isE22) throw new Error(`${work.id} is missing its crm:E22_Human-Made_Object type`);

    const identifiers = triples
      .filter((triple) => triple.subject === work.iri && triple.predicate === P1)
      .map((triple) => triple.object.match(/^<([^>]*)>$/)?.[1])
      .filter(Boolean);
    const hasSymbolicContent = triples.some(
      (triple) => identifiers.includes(triple.subject) && triple.predicate === P190,
    );
    if (!hasSymbolicContent) throw new Error(`${work.id} has no P1/P190 title or identifier`);
  }

  const begins = new Map();
  const ends = new Map();
  for (const triple of triples) {
    if (triple.predicate === P82A) begins.set(triple.subject, triple.object);
    if (triple.predicate === P82B) ends.set(triple.subject, triple.object);
  }
  if (![...begins.values()].some((value) => value.startsWith('"-'))) {
    throw new Error('Fixture does not contain a BCE begin value');
  }
  if (![...begins].some(([subject, value]) => ends.get(subject) === value)) {
    throw new Error('Fixture does not contain a zero-width time-span');
  }
  if (![...begins.keys()].some((subject) => !ends.has(subject))) {
    throw new Error('Fixture does not contain a begin-only time-span');
  }
  if (![...ends.keys()].some((subject) => !begins.has(subject))) {
    throw new Error('Fixture does not contain an end-only time-span');
  }

  const thumbnails = new Set(
    triples
      .filter(
        (triple) =>
          triple.predicate === THUMBNAIL_URL &&
          triple.object.startsWith('"/cache/images/thumbnails/'),
      )
      .map((triple) => triple.subject),
  );
  for (const work of works.filter(({ imageExpectation }) => imageExpectation === 'required')) {
    const hasThumbnail = triples.some(
      (triple) =>
        triple.subject === work.iri &&
        triple.predicate === WORK_PREFERRED_PHOTO &&
        thumbnails.has(triple.object.match(/^<([^>]*)>$/)?.[1]),
    );
    if (!hasThumbnail) throw new Error(`${work.id} has no ArtResearch preferred-photo thumbnail`);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
