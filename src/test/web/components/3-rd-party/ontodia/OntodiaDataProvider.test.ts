/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { expect } from 'chai';
import * as Reactodia from '@reactodia/workspace';

import { upgradeLegacyProviderSettings } from
  'platform/components/3-rd-party/ontodia/data/OntodiaDataProvider';

function makeSettings(elementInfoQuery: string): Reactodia.SparqlDataProviderSettings {
  return {
    defaultPrefix: '',
    schemaLabelProperty: 'rdfs:label',
    dataLabelProperty: 'rdfs:label',
    fullTextSearch: { prefix: '', queryPattern: '' },
    lookupQuery: '',
    elementInfoQuery,
    linksInfoQuery: '',
    imageQueryPattern: '',
    linkTypesOfQuery: '',
    linkTypesStatisticsQuery: '',
    filterRefElementLinkPattern: '',
    filterTypePattern: '',
    filterElementInfoPattern: '',
    filterAdditionalRestriction: '',
    linkConfigurations: [],
    propertyConfigurations: [],
  };
}

describe('OntodiaDataProvider provider settings compatibility', () => {
  it('upgrades the legacy reserved element-info namespace', () => {
    const settings = makeSettings(`
      PREFIX ontodia: <https://ontodia.org/context/v1.json/>
      CONSTRUCT {
        ?inst ontodia:type ?class .
        ?inst ontodia:label ?label .
      } WHERE { VALUES (?inst) {\${ids}} }
    `);

    const upgraded = upgradeLegacyProviderSettings(settings);

    expect(upgraded).not.to.equal(settings);
    expect(upgraded.elementInfoQuery).to.contain('PREFIX ontodia: <urn:reactodia:sparql:>');
    expect(upgraded.elementInfoQuery).not.to.contain('https://ontodia.org/context/v1.json/');
  });

  it('leaves current provider settings unchanged', () => {
    const settings = makeSettings(`
      PREFIX ontodia: <urn:reactodia:sparql:>
      CONSTRUCT { ?inst ontodia:type ?class } WHERE {}
    `);

    expect(upgradeLegacyProviderSettings(settings)).to.equal(settings);
  });

  // Pending: the reactodia fork's SparqlDataProvider hard-codes
  // `private readonly acceptBlankNodes = false` (src/data/sparql/sparqlDataProvider.ts)
  // and never reads the option, so the `acceptBlankNodes` that Ontodia.tsx passes
  // (with the same cast as below) is a no-op. Re-enable once the fork honours it.
  xit('enables blank nodes in Reactodia lookup queries', () => {
    const provider = new Reactodia.SparqlDataProvider(
      { endpointUrl: '', acceptBlankNodes: true } as Reactodia.SparqlDataProviderOptions & { acceptBlankNodes: boolean },
      makeSettings('')
    );
    const query = (provider as any).createRefQueryPart({
      elementId: 'http://example.com/a',
      linkId: 'http://example.com/p',
      direction: 'out',
    }) as string;

    expect(query).to.contain('isBlank(?inst)');
  });
});
