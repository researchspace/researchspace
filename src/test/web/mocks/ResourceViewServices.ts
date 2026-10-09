/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */

import * as sinon from 'sinon';
import * as uri from 'urijs';
import Basil from 'basil.js';
import { Rdf } from 'platform/api/rdf';
import * as ResourceConfig from 'platform/api/services/resource-config';

/** Mock HTTP responses, leaving the Webpack ES-module exports intact. */
export async function mockResourceViewServices(
  configurations: string[], visualisation: string, lookup: sinon.SinonStub
): Promise<() => void> {
  const previousConfigs = { ...ResourceConfig.resourceConfigs };
  const cache = new Basil({ storages: ['local', 'memory'], namespace: 'rs-resource-configuration' });
  const previousCache = cache.keys().map(key => ({ key, value: cache.get(key) }));
  cache.reset();
  const xhr = sinon.useFakeXMLHttpRequest();
  xhr.onCreate = (request: sinon.SinonFakeXMLHttpRequest & { onSend: () => void }) => {
    request.onSend = () => {
      const url = uri(request.url);
      if (url.path() === '/sparql') {
        const graph = configurations.map(iri => `<${iri}>
          a <http://www.researchspace.org/resource/system/resource_configuration> ;
          <http://www.researchspace.org/pattern/system/resource_configuration/resource_name> "Test resource" ;
          <http://www.researchspace.org/pattern/system/resource_configuration/resource_visualisation> <${visualisation}> .`
        ).join('\n');
        request.respond(200, { 'Content-Type': 'text/turtle' }, graph);
      } else if (url.path() === '/rest/data/rdf/utils/getResourceConfiguration') {
        const params = url.search(true);
        Promise.resolve(lookup(Rdf.iri(params.iri), params.repository)).then(
          configuration => request.respond(200, { 'Content-Type': 'text/plain' }, configuration),
          () => request.respond(500, { 'Content-Type': 'text/plain' }, 'Lookup failed')
        );
      } else {
        throw new Error(`Unexpected resource-view test request: ${request.method} ${request.url}`);
      }
    };
  };
  const restore = () => {
    xhr.restore();
    cache.reset();
    previousCache.forEach(({ key, value }) => cache.set(key, value));
    if (ResourceConfig.resourceConfigs) {
      Object.keys(ResourceConfig.resourceConfigs).forEach(key => delete ResourceConfig.resourceConfigs[key]);
      Object.assign(ResourceConfig.resourceConfigs, previousConfigs);
    }
  };
  try {
    await new Promise<void>((resolve, reject) => ResourceConfig.initResourceConfig()
      .observe({ value: () => resolve(), error: reject }));
    return restore;
  } catch (error) {
    restore();
    throw error;
  }
}
