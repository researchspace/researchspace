/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { createElement as h } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Simulate } from 'react-dom/test-utils';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Rdf } from 'platform/api/rdf';
import { SelectInput, AutocompleteInput, FieldValue, DataState, normalizeFieldDefinition } from 'platform/components/forms';
import SemanticTreeInput from 'platform/components/semantic/lazy-tree/SemanticTreeInput';
import { mockConfig } from 'platform-tests/mocks';
import 'platform/styling/main.scss';
import 'platform/components/forms/forms.scss';

mockConfig();
const labels = ['Limestone', 'Microcline / green feldspar / amazon-stone with a long descriptive authority label',
  'Mudstone', 'Sandstone', 'Siltstone', 'Steatite / soap stone',
  'AnUnbrokenAuthorityIdentifierThatMustRemainReadableEvenInsideANarrowFormPanel0123456789',
  ...Array.from({length: 24}, (_, i) => `Material ${i + 8}`)];
const bindings = labels.map((label, i) => ({
  value: Rdf.iri(`https://example.org/material/${i}`), item: Rdf.iri(`https://example.org/material/${i}`),
  label: Rdf.literal(label), hasChildren: Rdf.literal(false), score: Rdf.literal('1'),
}));
const definition = normalizeFieldDefinition({ id: 'material', label: 'Material',
  xsdDatatype: Rdf.iri('http://www.w3.org/2001/XMLSchema#anyURI'), minOccurs: 0, maxOccurs: 1,
  valueSetPattern: 'SELECT ?value ?label WHERE { ?value <https://example.org/label> ?label }',
  autosuggestionPattern: 'SELECT ?value ?label WHERE { ?value <https://example.org/label> ?label FILTER(CONTAINS(?label, ?__token__)) }',
});

describe('Input dropdown rollback', () => {
  let host: HTMLDivElement;
  let server: sinon.SinonFakeServer;
  let selected: FieldValue;
  const tick = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const find = (selector: string) => host.querySelector<HTMLElement>(selector);
  const menu = () => find('.Select-menu-outer, .SemanticTreeInput--dropdown');
  async function settle() { await tick(); await tick(); }
  async function waitFor(selector: string) {
    for (let i = 0; i < 100 && !find(selector); i++) await new Promise(resolve => setTimeout(resolve, 10));
    expect(Boolean(find(selector)), selector).to.equal(true); await settle();
  }
  beforeEach(() => {
    host = document.createElement('div');
    host.className = 'semantic-form';
    host.style.cssText = 'position:fixed;left:16px;top:16px;width:500px;height:500px;overflow:visible';
    document.body.appendChild(host);
    selected = FieldValue.empty;
    server = sinon.fakeServer.create();
    server.autoRespond = true;
    server.autoRespondAfter = 1;
    server.respondWith('POST', /\/sparql(?:\?|$)/, xhr => {
      const text = decodeURIComponent(String(xhr.requestBody));
      const rows = text.includes('parentLabel') || text.includes('resourceFormIri') ? [] : bindings;
      const json = rows.map(row => Object.keys(row).reduce((result, key) => {
        const node = row[key];
        result[key] = {type: node.isIri() ? 'uri' : 'literal', value: node.value};
        if (key === 'hasChildren') result[key].datatype = 'http://www.w3.org/2001/XMLSchema#boolean';
        return result;
      }, {}));
      xhr.respond(200, {'Content-Type': 'application/sparql-results+json'}, JSON.stringify({
        head: {vars: ['value', 'item', 'label', 'hasChildren']}, results: {bindings: json},
      }));
    });
  });
  afterEach(() => { unmountComponentAtNode(host); host.remove(); server.restore(); });

  async function draw(kind: 'select' | 'autocomplete' | 'tree') {
    const updateValue = change => { selected = change(selected); };
    const baseInputProps = {for: 'material', dataState: DataState.Ready};
    if (kind === 'tree') {
      render(h(SemanticTreeInput, {
        rootsQuery: 'SELECT ?item ?label ?hasChildren WHERE { ?item <https://example.org/label> ?label }',
        childrenQuery: 'SELECT ?item ?label ?hasChildren WHERE { ?item <https://example.org/parent> ?parent }',
        parentsQuery: 'SELECT ?item ?parent ?parentLabel WHERE { ?item <https://example.org/parent> ?parent }',
        searchQuery: 'SELECT ?item ?label ?hasChildren WHERE { ?item <https://example.org/label> ?label FILTER(CONTAINS(?label, ?__token__)) }',
        placeholder: 'Select material', openDropdownOnFocus: true, multipleSelection: true,
      }), host);
      find('.SemanticTreeInput--browseButton').click();
      await waitFor('.LazyTreeSelector--itemContent');
    } else if (kind === 'select') {
      render(h(SelectInput, {...baseInputProps, definition,
        handler: SelectInput.makeHandler({definition, baseInputProps}), value: FieldValue.empty,
        updateValue, readonlyResource: true}), host);
      await settle();
      Simulate.mouseDown(find('.Select-control'), {button: 0});
      await waitFor('.Select-option');
    } else {
      render(h(AutocompleteInput, {...baseInputProps, definition,
        handler: AutocompleteInput.makeHandler({definition, baseInputProps}), value: FieldValue.empty,
        updateValue, readonlyResource: true, autofocus: false}), host);
      const input = find('input') as HTMLInputElement;
      input.focus(); input.value = 'stone'; Simulate.change(input);
      await waitFor('.Select-option');
    }
    await document.fonts.ready; await settle();
  }

  for (const kind of ['select', 'autocomplete', 'tree'] as const) {
    it(`${kind}: uses the original in-place dropdown without a native popover`, async () => {
      await draw(kind);
      const popup = menu();
      expect(popup).not.to.equal(null);
      expect(popup.hasAttribute('popover')).to.equal(false);
      expect(getComputedStyle(popup).position).to.equal('absolute');
      expect(host.contains(popup)).to.equal(true);
      const scroll = find('.Select-menu, .ReactVirtualized__List');
      expect(scroll.clientHeight).to.be.greaterThan(0);
      expect(scroll.scrollHeight).to.be.greaterThan(scroll.clientHeight);
      if (kind === 'tree') {
        const rows = Array.from(host.querySelectorAll<HTMLElement>('.LazyTreeSelector--item'));
        for (const row of rows) expect(row.parentElement.getBoundingClientRect().height).to.equal(30);
        expect(find('.LazyTreeSelector--wrapped')).to.equal(null);
      }
    });
  }

  for (const kind of ['select', 'autocomplete'] as const) {
    it(`${kind}: preserves keyboard selection, inner scrolling and Escape dismissal`, async () => {
      await draw(kind);
      const input = find('input');
      for (let i = 0; i < 12; i++) Simulate.keyDown(input, {key: 'ArrowDown', keyCode: 40});
      await settle();
      const scroll = find('.Select-menu'), focused = find('.Select-option.is-focused');
      expect(scroll.scrollTop).to.be.greaterThan(0);
      expect(focused.getBoundingClientRect().bottom).to.be.at.most(scroll.getBoundingClientRect().bottom + 1);
      Simulate.keyDown(input, {key: 'Enter', keyCode: 13}); await settle();
      expect(FieldValue.isAtomic(selected)).to.equal(true);
      expect(menu()).to.equal(null);
      Simulate.mouseDown(find('.Select-control'), {button: 0}); await settle();
      expect(menu()).not.to.equal(null);
      Simulate.keyDown(input, {key: 'Escape', keyCode: 27}); await settle();
      expect(menu()).to.equal(null);
    });
  }

  it('tree: retains pending selection through resize, then applies or cancels it', async () => {
    await draw('tree');
    const checkbox = find('input[type="checkbox"]') as HTMLInputElement;
    checkbox.click(); await settle();
    const apply = find('.SemanticTreeInput--dropdownFooter .btn-action') as HTMLButtonElement;
    expect(apply.disabled).to.equal(false);
    host.style.width = '600px'; await settle();
    expect((find('input[type="checkbox"]') as HTMLInputElement).checked).to.equal(true);
    apply.click(); await settle();
    expect(menu()).to.equal(null);
    expect(find('.SemanticTreeInput--textInput').textContent).to.contain('Limestone');
    find('.SemanticTreeInput--browseButton').click(); await settle();
    find('input[type="checkbox"]').click(); await settle();
    find('.SemanticTreeInput--dropdownFooter button:not(.btn-action)').click(); await settle();
    expect(menu()).to.equal(null);
    expect(find('.SemanticTreeInput--textInput').textContent).to.contain('Limestone');
  });

  it('tree: keeps search and Apply visible while scrolling and renders filtered results', async () => {
    await draw('tree');
    const input = find('.SemanticTreeInput--dropdown input[type="text"]') as HTMLInputElement;
    input.focus(); input.value = 'stone'; Simulate.change(input);
    await new Promise(resolve => setTimeout(resolve, 700)); await settle();
    expect(menu().textContent).to.contain('Limestone');
    const scroll = find('.ReactVirtualized__List'); scroll.scrollTop = scroll.scrollHeight;
    scroll.dispatchEvent(new Event('scroll')); await settle();
    const rect = menu().getBoundingClientRect(), footer = find('.SemanticTreeInput--dropdownFooter').getBoundingClientRect();
    expect(footer.bottom).to.be.at.most(rect.bottom);
    expect(input.getBoundingClientRect().top).to.be.at.least(rect.top);
    document.body.click(); await settle(); expect(menu()).to.equal(null);
  });
});
