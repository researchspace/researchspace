/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { createElement } from 'react';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { mount } from 'platform-tests/configuredEnzyme';
import { mockConfig } from 'platform-tests/mocks';
import { listen } from 'platform/api/events';
import {
  SemanticTable, SemanticTableResultsLoaded, SemanticTableResultsLoadedData,
} from 'platform/components/semantic/table';

mockConfig();

function sparqlJson(rows: Array<[string, string]>) {
  return JSON.stringify({
    head: { vars: ['subject', 'description'] },
    results: {
      bindings: rows.map(([subject, description]) => ({
        subject: { type: 'uri', value: subject }, description: { type: 'literal', value: description },
      })),
    },
  });
}

describe('semantic-table results count event', () => {
  let server: sinon.SinonFakeServer;
  let wrapper;
  let queries = 0;
  beforeEach(() => {
    queries = 0;
    server = sinon.fakeServer.create();
    server.autoRespond = true;
    server.respondWith('POST', /\/sparql/, xhr => {
      queries++;
      if (/\?relevance/.test(xhr.requestBody)) {
        // a leading projected variable that is unbound in every row, as a
        // ranking subquery can produce: it must not drive the count
        xhr.respond(200, { 'Content-Type': 'application/sparql-results+json' }, JSON.stringify({
          head: { vars: ['relevance', 'subject', 'iri'] },
          results: { bindings: ['a', 'b', 'c'].map(x => ({
            subject: { type: 'uri', value: 'https://example.org/' + x }, iri: { type: 'uri', value: 'https://example.org/' + x },
          })) },
        }));
        return;
      }
      xhr.respond(200, { 'Content-Type': 'application/sparql-results+json' }, sparqlJson([
        ['https://example.org/a', 'first'],
        ['https://example.org/a', 'second description of the same subject'],
        ['https://example.org/b', 'third'],
      ]));
    });
  });
  afterEach(() => {
    if (wrapper) { wrapper.unmount(); wrapper = undefined; }
    server.restore();
  });

  it('reports distinct subjects and raw rows from the one query the table runs', async () => {
    const received: SemanticTableResultsLoadedData[] = [];
    const subscription = listen({ eventType: SemanticTableResultsLoaded, source: 'count-table' })
      .observe({ value: event => received.push(event.data as SemanticTableResultsLoadedData) });
    wrapper = mount(createElement(SemanticTable, {
      id: 'count-table', query: 'SELECT ?subject ?description WHERE { ?subject ?p ?description }',
      columnConfiguration: [{ variableName: 'subject', displayName: 'Subject' }],
    } as any));
    for (let i = 0; i < 200 && received.length === 0; i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    subscription.unsubscribe();
    expect(received).to.have.length(1);
    expect(received[0].numberOfResults).to.equal(2);
    expect(received[0].numberOfRows).to.equal(3);
    expect(received[0].variable).to.equal('subject');
    expect(received[0].hasResultsCount).to.equal(true);
    expect(received[0].limit).to.equal(undefined);
    expect(received[0].isTruncated).to.equal(false);
    expect(queries).to.equal(1);
  });

  it('flags a result set that filled the query LIMIT as truncated', async () => {
    const received: SemanticTableResultsLoadedData[] = [];
    const subscription = listen({ eventType: SemanticTableResultsLoaded, source: 'limited-table' })
      .observe({ value: event => received.push(event.data as SemanticTableResultsLoadedData) });
    wrapper = mount(createElement(SemanticTable, {
      id: 'limited-table', query: 'SELECT ?subject ?description WHERE { ?subject ?p ?description } LIMIT 3',
      columnConfiguration: [{ variableName: 'subject', displayName: 'Subject' }],
    } as any));
    for (let i = 0; i < 200 && received.length === 0; i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    subscription.unsubscribe();
    expect(received).to.have.length(1);
    expect(received[0].limit).to.equal(3);
    expect(received[0].numberOfRows).to.equal(3);
    expect(received[0].isTruncated).to.equal(true);
  });

  it('counts ?subject even when an unbound variable is projected first', async () => {
    const received: SemanticTableResultsLoadedData[] = [];
    const subscription = listen({ eventType: SemanticTableResultsLoaded, source: 'ranked-table' })
      .observe({ value: event => received.push(event.data as SemanticTableResultsLoadedData) });
    wrapper = mount(createElement(SemanticTable, {
      id: 'ranked-table', query: 'SELECT ?relevance ?subject (?subject AS ?iri) WHERE { ?subject ?p ?o }',
      columnConfiguration: [{ variableName: 'subject', displayName: 'Subject' }],
    } as any));
    for (let i = 0; i < 200 && received.length === 0; i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    subscription.unsubscribe();
    expect(received).to.have.length(1);
    expect(received[0].variable).to.equal('subject');
    expect(received[0].numberOfResults).to.equal(3);
  });
});
