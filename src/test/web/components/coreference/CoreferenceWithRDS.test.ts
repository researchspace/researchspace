/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { expect } from 'chai';
import { Parser as HtmlParser, Node } from 'html-to-react';
import { GenericFunctions } from 'platform/api/services/template/functions/GenericFunctions';
import { extractTemplateScope } from 'platform/api/module-loader/Registry';

const source: string = require('!!raw-loader!../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FCoreferenceWithRDS.html').default;

const recordIri = 'https://example.org/place/berlin';

function findNode(node: Node, matches: (node: Node) => boolean): Node | undefined {
  if (matches(node)) { return node; }
  for (const child of node.children || []) {
    const found = findNode(child, matches);
    if (found) { return found; }
  }
  return undefined;
}

/**
 * Renders the groups of the result query the way the platform does: the markup
 * is parsed into nodes, the <template> elements of the <semantic-query> are
 * registered in its template scope, and the 'groups' partial is rendered with
 * the query results. Server-side comments are removed like on the server.
 */
async function render(bindings: Array<{[variable: string]: {value: string}}>) {
  const markup = source.replace(/\[\[!--[\s\S]*?--\]\]/g, '');
  // the processing instruction returns the parsed nodes instead of React elements,
  // like TemplateParser.escapeRemoteTemplateHtml
  const root = (await new HtmlParser(null).parseWithInstructions(`<div>${markup}</div>`, () => true, [{
    shouldProcessNode: () => true,
    processNode: (node: Node) => node as any,
  }])) as any as Node;
  const resultQuery = findNode(root, node => node.name === 'semantic-query'
    && /-coreference-result-query$/.test(node.attribs.id || ''));
  expect(resultQuery, 'result query').not.to.equal(undefined);
  const scope = extractTemplateScope(resultQuery);
  const template = await scope.compile('{{> groups}}');
  const element = document.createElement('div');
  element.innerHTML = template({bindings, viewId: 'rds', recordIri});
  return element;
}

/** Packs an entry like the result query: position|~|IRI|~|dataset|~|record id|~|is reference|~|name|~|description */
function entry(position: number, iri: string, dataset: string, isReference: boolean, name: string) {
  return [('0000' + position).slice(-4), iri, dataset, '', isReference ? '1' : '0', name, ''].join('|~|');
}

function group(members: string[], match = 'true', entries = String(members.length)) {
  return {
    reference: {value: 'http://www.wikidata.org/entity/Q64'},
    groupScore: {value: '134.69397'},
    groupOrdinal: {value: '0'},
    groupMatch: {value: match},
    groupType: {value: 'Place'},
    entries: {value: entries},
    members: {value: members.join('|#|')},
  };
}

const wikidata = entry(0, 'http://www.wikidata.org/entity/Q64', 'wikidata', true, 'Berlin');
const geonames = entry(2, 'https://sws.geonames.org/2950159/', 'geonames', false, 'Land Berlin');
const gnd = entry(10, 'https://d-nb.info/gnd/4005728-8', 'gnd', false, 'Berlin (GND)');

describe('sort template helper', () => {
  it('returns a sorted copy and leaves the input unchanged', () => {
    const input = ['0010|b', '0002|a', '0000|c'];
    expect(GenericFunctions.sort(input)).to.deep.equal(['0000|c', '0002|a', '0010|b']);
    expect(input).to.deep.equal(['0010|b', '0002|a', '0000|c']);
  });

  it('returns an empty array for anything but an array', () => {
    expect(GenericFunctions.sort(undefined)).to.deep.equal([]);
    expect(GenericFunctions.sort('0002|a')).to.deep.equal([]);
  });
});

describe('Coreference with RDS result groups', () => {
  it('lists the entries of a group in the order of the RDS response', async () => {
    const element = await render([group([gnd, wikidata, geonames])]);
    const links = Array.from(element.querySelectorAll('.rds-group__name a'));
    expect(links.map(link => link.textContent)).to.deep.equal(['Berlin', 'Land Berlin', 'Berlin (GND)']);
    expect(links.map(link => link.getAttribute('href'))).to.deep.equal([
      'http://www.wikidata.org/entity/Q64', 'https://sws.geonames.org/2950159/', 'https://d-nb.info/gnd/4005728-8',
    ]);
    const names = Array.from(element.querySelectorAll('.rds-group__name'));
    expect(names.map(name => Boolean(name.querySelector('.rds-group__reference')))).to.deep.equal([true, false, false]);
    expect(Array.from(element.querySelectorAll('.rds-group__dataset-name')).map(cell => cell.textContent))
      .to.deep.equal(['wikidata', 'geonames', 'gnd']);
  });

  it('renders each group as a collapsible card, folded by default', async () => {
    const element = await render([group([wikidata, geonames]), group([gnd], 'false')]);
    const cards = Array.from(element.querySelectorAll('.rds-groups > .rds-group'));
    expect(cards).to.have.length(2);
    expect(cards[0].classList.contains('rds-group--match')).to.equal(true);
    expect(cards[1].classList.contains('rds-group--candidate')).to.equal(true);
    cards.forEach(card => {
      const collapsible = card.querySelector('mp-collapsible-div');
      expect(collapsible.getAttribute('expanded')).to.equal('false');
      expect(collapsible.querySelector('mp-collapsible-div-trigger .rds-group__header')).not.to.equal(null);
      expect(collapsible.querySelector('mp-collapsible-div-content .rds-group__entries')).not.to.equal(null);
    });
    expect(cards[0].querySelector('.rds-group__header').textContent)
      .to.contain('2 equivalent entries').and.to.contain('score 134.7').and.to.contain('confident match');
    expect(cards[1].querySelector('.rds-group__header').textContent)
      .to.contain('1 equivalent entry').and.to.contain('candidate');
  });

  it('adds all the entries of a group, in order, from outside the trigger', async () => {
    const element = await render([group([gnd, wikidata, geonames])]);
    const addAll = element.querySelector('.rds-group > .rds-group__add-all mp-event-trigger');
    expect(addAll, '"Add all in group" must not be inside the trigger').not.to.equal(null);
    expect(JSON.parse(addAll.getAttribute('data')).references).to.deep.equal([
      'http://www.wikidata.org/entity/Q64', 'https://sws.geonames.org/2950159/', 'https://d-nb.info/gnd/4005728-8',
    ]);
  });

  it('offers no "Add all in group" for a single entry', async () => {
    const element = await render([group([gnd], 'false')]);
    expect(element.querySelector('.rds-group__add-all')).to.equal(null);
  });

  it('counts the coreferenced entries of a group in its header', async () => {
    const element = await render([group([gnd, wikidata])]);
    const refresh = element.querySelector('.rds-group__header mp-event-target-refresh');
    expect(refresh.getAttribute('id')).to.equal('rds-coreference-status');
    const query = refresh.querySelector('semantic-query').getAttribute('query');
    expect(query).to.contain('"http://www.wikidata.org/entity/Q64"');
    expect(query).to.contain('"https://d-nb.info/gnd/4005728-8"');
    expect(query).to.contain(`<${recordIri}> crm:P1_is_identified_by ?identifier`);
  });

  it('refreshes the coreference states without re-running the RDS search', async () => {
    const element = await render([group([wikidata, geonames])]);
    const rowStates = Array.from(element.querySelectorAll('.rds-group__actions > mp-event-target-refresh'));
    expect(rowStates).to.have.length(2);
    rowStates.forEach(state => expect(state.getAttribute('id')).to.equal('rds-coreference-status'));
    expect(source).not.to.contain('-coreference-results');
    const proxies = source.match(/proxy-event-type='Component.Refresh'\s*proxy-targets='([^']*)'/g);
    expect(proxies).to.have.length(2);
    proxies.forEach(proxy => expect(proxy).to.contain(`["{{viewId}}-coreference-status"]`));
  });
});
