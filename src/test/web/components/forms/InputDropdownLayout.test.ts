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

describe('Readable input dropdowns', () => {
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
    host.style.cssText = 'position:fixed;left:16px;top:16px;width:240px;height:170px;overflow:auto';
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

  function containedMenu() {
    const popup = menu(), rect = popup.getBoundingClientRect();
    expect(popup.matches(':popover-open')).to.equal(true);
    expect(rect.left).to.be.at.least(7);
    expect(rect.right).to.be.at.most(document.documentElement.clientWidth - 7);
    expect(rect.top).to.be.at.least(7);
    expect(rect.bottom).to.be.at.most(document.documentElement.clientHeight - 7);
    expect(popup.scrollWidth).to.be.at.most(popup.clientWidth + 1);
    expect(getComputedStyle(popup).backgroundColor).to.equal('rgb(255, 255, 255)');
  }

  for (const kind of ['select', 'autocomplete', 'tree'] as const) {
    it(`${kind}: escapes a narrow clipping panel with readable wrapped options`, async () => {
      await draw(kind); containedMenu();
      const popup = menu(), rect = popup.getBoundingClientRect();
      expect(rect.width).to.equal(320);
      expect(rect.bottom).to.be.greaterThan(host.getBoundingClientRect().bottom);
      const point = document.elementFromPoint(rect.left + 20, Math.min(rect.bottom - 20, host.getBoundingClientRect().bottom + 10));
      expect(popup.contains(point), 'menu remains above surrounding form fields').to.equal(true);
      const options = host.querySelectorAll<HTMLElement>('.Select-option, .LazyTreeSelector--itemContent');
      const long = options[1], short = options[0];
      expect(long.getBoundingClientRect().height).to.be.greaterThan(short.getBoundingClientRect().height);
      for (const option of Array.from(options)) expect(option.scrollWidth).to.be.at.most(option.clientWidth + 1);
      const scroll = find('.Select-menu, .ReactVirtualized__List');
      expect(scroll.getBoundingClientRect().bottom).to.be.at.most(rect.bottom);
      expect(scroll.scrollHeight).to.be.greaterThan(scroll.clientHeight);
    });

    it(`${kind}: flips above a low field and follows width changes without losing its state`, async () => {
      host.style.top = `${document.documentElement.clientHeight - 75}px`;
      await draw(kind); containedMenu();
      const popup = menu(), trigger = find('.Select-control, .SemanticTreeInput--inputAndButtons');
      expect(popup.getBoundingClientRect().bottom).to.be.at.most(trigger.getBoundingClientRect().top);
      host.style.width = '500px'; host.style.top = '16px'; await settle();
      expect(menu()).to.equal(popup); containedMenu();
      expect(popup.getBoundingClientRect().width).to.equal(500);
      expect(popup.getBoundingClientRect().top).to.be.at.least(trigger.getBoundingClientRect().bottom);
      if (kind === 'autocomplete') expect((find('input') as HTMLInputElement).value).to.equal('stone');
      if (kind === 'tree') {
        const rows = Array.from(host.querySelectorAll<HTMLElement>('.LazyTreeSelector--item'));
        for (let i = 1; i < rows.length; i++) {
          expect(rows[i].getBoundingClientRect().top).to.be.at.least(rows[i - 1].getBoundingClientRect().bottom - 1);
        }
      }
      const spacer = document.createElement('div'); spacer.style.height = '900px'; host.appendChild(spacer);
      host.scrollTop = 300; await settle();
      expect(menu()).to.equal(null);
      expect(host.scrollTop).to.equal(300);
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
    host.style.width = '500px'; await settle();
    expect((find('input[type="checkbox"]') as HTMLInputElement).checked).to.equal(true);
    apply.click(); await settle();
    expect(menu()).to.equal(null);
    expect(find('.SemanticTreeInput--textInput').textContent).to.contain('Limestone');
    find('.SemanticTreeInput--browseButton').click(); await settle();
    find('input[type="checkbox"]').click(); await settle();
    find('.SemanticTreeInput--dropdown').dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    await settle();
    expect(menu()).to.equal(null);
    expect(find('.SemanticTreeInput--textInput').textContent).to.contain('Limestone');
    expect(document.activeElement).to.equal(find('.SemanticTreeInput--browseButton'));
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
