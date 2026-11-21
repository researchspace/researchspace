/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { createElement as h } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as Maybe from 'data.maybe';
import * as Either from 'data.either';
import { TemplateItem } from 'platform/components/ui/template';
import { TemplateScope } from 'platform/api/services/template/TemplateScope';
import { escapeRemoteTemplateHtml } from 'platform/api/services/template/TemplateParser';
import { Table } from 'platform/components/semantic/table/Table';
import { SparqlClient } from 'platform/api/sparql';
import { trigger } from 'platform/api/events';
import { mockConfig } from 'platform-tests/mocks';
import 'platform/styling/main.scss';
import 'platform/components/forms/forms.scss';

const browserSource = require('!!raw-loader!../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FSimpleCollectionBrowser.html').default;
const viewSource = require('!!raw-loader!../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FResourceViewButton.html').default;
const menuSource = require('!!raw-loader!../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FResourceDropdownActions.html').default;
const entriesSource = require('!!raw-loader!../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2Fsystem%2Fforms%2FAuthorityDocument_partial.html').default;
const listSource = require('!!raw-loader!../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FAuthorityList.html').default;
const contentSource = require('!!raw-loader!../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FCollectionBrowserContent.html').default;
const authority = 'http://www.researchspace.org/resource/vocab/appellation_alternative_form';
const authorityConfig = 'http://www.researchspace.org/resource/system/resource_configurations_container/data/Authority_document';
const typeConfig = 'http://www.researchspace.org/resource/system/resource_configurations_container/data/Type';
const stripServer = (source: string) => source.replace(/\[\[!--[\s\S]*?--\]\]/g, '').replace(/\[\[>[\s\S]*?\]\]/g, '');
const termArea = browserSource.slice(browserSource.indexOf("<mp-event-target-template-render id='{{viewId}}-term-forms'"));
const headerFragment = termArea.slice(termArea.indexOf("<template id='template'>") + "<template id='template'>".length,
  termArea.indexOf('[[!-- Update Search page if a particular resource is created --]]'));
const formFragment = browserSource.match(/<inline-template template-iri='{{resourceForm}}'[\s\S]*?<\/inline-template>/)[0];
const menuFragment = menuSource.slice(menuSource.indexOf('{{#if hideDetailedView}}'), menuSource.indexOf('{{#switch resourceConfig}}'));
mockConfig();

// Render the actual header/empty-state templates and real table with local data.
// Only service data and unrelated import/dropdown contents are stubbed.
describe('Authority browser and entries layout', () => {
  let host: HTMLDivElement;
  let header: string;
  let server: sinon.SinonFakeServer;
  const find = (selector: string) => host.querySelector<HTMLElement>(selector);
  const box = (selector: string) => find(selector).getBoundingClientRect();
  const tick = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  async function ready(selector: string) {
    for (let i = 0; i < 100 && !find(selector); i++) await new Promise(resolve => setTimeout(resolve, 10));
    expect(Boolean(find(selector)), host.textContent).to.equal(true);
    await tick(); await document.fonts.ready; await tick();
  }
  before(async () => {
    header = await escapeRemoteTemplateHtml(stripServer(headerFragment)
      .replace('{{> rsp:ResourceViewButton}}', stripServer(viewSource))
      .replace(/{{> rsp:ResourceDropdownActions[\s\S]*?}}/g, '<bs-dropdown-menu><bs-menu-item>Action</bs-menu-item></bs-dropdown-menu>'));
  });
  beforeEach(() => {
    host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:10px;top:10px;z-index:1000';
    document.body.appendChild(host);
    server = sinon.fakeServer.create();
    server.autoRespond = true;
    server.respondWith('POST', /\/rest\/data\/rdf\/utils\/getLabelsForRdfValue/, xhr => {
      const labels = {};
      JSON.parse(xhr.requestBody).forEach(iri => { labels[iri] = 'Appellation alternative form'; });
      xhr.respond(200, {'Content-Type': 'application/json'}, JSON.stringify(labels));
    });
    server.respondWith('POST', '/sparql', xhr => {
      xhr.respond(200, {'Content-Type': 'application/sparql-results+json'}, JSON.stringify({head: {vars: ['systemUser']},
        results: {bindings: [{systemUser: {type: 'uri', value: 'https://example.org/user'}}]}}));
    });
  });
  afterEach(() => { unmountComponentAtNode(host); host.remove(); server.restore(); });

  function drawHeader(width: number, options: object) {
    render(h('div', {className: 'resource-editView-container', style: {width, height: 600}},
      h('div', {className: 'resource-editView-form-container'},
        h(TemplateItem, {template: {source: header, options: {viewId: 'authority-frame', editable: true, ...options}}}))), host);
  }

  for (const width of [280, 480, 900, 1400]) {
    it(`keeps the actual authority header actions separate at ${width}px`, async () => {
      drawHeader(width, {mode: 'edit', iri: authority, resourceConfiguration: authorityConfig,
        resourceName: 'Authority document', resourceIcon: 'dictionary'});
      await ready('[aria-label="List of resources"]');
      await ready('.text-type-subheader');
      expect(find('.resource-record-header-title').textContent).to.contain('Appellation alternative form');
      const actions = Array.from(host.querySelectorAll<HTMLElement>('.btn-inline-container button'));
      expect(actions.length).to.equal(5);
      actions.forEach(button => {
        const bounds = button.getBoundingClientRect();
        expect(bounds.right).to.be.at.most(box('.resource-record-header').right);
        expect(button.scrollWidth).to.be.at.most(button.clientWidth + 1);
        actions.filter(other => other !== button).forEach(other => {
          const next = other.getBoundingClientRect();
          const overlaps = bounds.left < next.right && bounds.right > next.left && bounds.top < next.bottom && bounds.bottom > next.top;
          expect(overlaps, 'Header buttons must not overlap').to.equal(false);
        });
      });
      expect(find('[aria-label="List of resources"]').querySelector('span')).to.equal(null);
      expect(find('[aria-label="List of resources"]').title).to.equal('List of resources');
    });
  }

  it('opens the New form in the current authority and preserves selection/save transitions', async () => {
    // Follow the actual entry-point options and configured/read-only branches.
    const entry = await TemplateScope.default.compile(listSource);
    const element = document.createElement('div');
    element.innerHTML = entry({iri: authority, dashboardId: 'authority-frame'});
    const initial = JSON.parse(element.querySelector('inline-template').getAttribute('options'));
    expect(initial).to.include({mode: 'new', iri: null, broader: null, useConfig: authority});
    const contentScope = TemplateScope.create({partials: {
      browserMode: '<div data-mode="{{mode}}" data-collection="{{collection}}" data-config="{{resourceConfiguration}}"></div>',
    }});
    const contentTemplate = contentSource.match(/<template id='template'>([\s\S]*?)<\/template>/)[1]
      .replace(/rsp:SimpleCollectionBrowser/g, 'browserMode');
    const content = await contentScope.compile(contentTemplate);
    const bindings = [{managedByResourceConfig: {value: 'true'}, collection: {value: authority}, resourceConfiguration: {value: typeConfig}}];
    element.innerHTML = content({...initial, bindings});
    expect(element.querySelector('div').dataset).to.include({mode: 'new', collection: authority, config: typeConfig});
    bindings[0].managedByResourceConfig.value = 'false';
    element.innerHTML = content({...initial, bindings});
    expect(element.querySelector('div').dataset.mode).to.equal('');

    // Render the actual event target/header and expose the real form's options.
    const formProbe = formFragment.replace("<inline-template template-iri='{{resourceForm}}'", '<div class="authority-form-probe"')
      .replace('options=', 'data-options=').replace('</inline-template>', '</div>');
    const createdProxy = browserSource.match(/<mp-event-proxy id='{{viewId}}-view-update-on-created'[\s\S]*?<\/mp-event-proxy>/)[0];
    const selectedProxy = browserSource.match(/<mp-event-proxy id='{{viewId}}-selected-tree-element'[\s\S]*?<\/mp-event-proxy>/)[0];
    const newButton = browserSource.match(/<mp-event-trigger id='{{viewId}}-form-new-trigger'[\s\S]*?<\/mp-event-trigger>/)[0];
    const fragment = await escapeRemoteTemplateHtml(`${selectedProxy}${newButton}
      <mp-event-target-template-render id="{{viewId}}-term-forms" template="{{> termForm}}">
        <template id="termForm">${header}${createdProxy}{{#if mode}}${formProbe}{{/if}}</template>
      </mp-event-target-template-render>`);
    render(h('div', {className: 'resource-editView-container', style: {width: 700}},
      h(TemplateItem, {template: {source: fragment, options: {...initial, editable: true,
        collection: authority, resourceConfiguration: typeConfig, resourceName: 'Type'}}})), host);
    await ready('.authority-form-probe');
    const options = () => JSON.parse(find('.authority-form-probe').getAttribute('data-options'));
    expect(find('.resource-record-header-title').textContent).to.contain('New');
    expect(options()).to.include({mode: 'new', scheme: authority, resourceConfig: typeConfig, viewId: 'authority-frame'});
    expect(options()).not.to.have.property('node');
    expect(options()).not.to.have.property('broader');
    expect(find('.authority-browser-empty-state')).to.equal(null);

    const item = 'https://example.org/authority-item';
    trigger({eventType: 'LazyTree.ItemSelected', source: 'authority-frame-scheme-tree', data: {iri: item}});
    await tick(); await ready('.authority-form-probe');
    expect(options()).to.include({mode: 'edit', node: item, scheme: authority});
    find('button.btn-action').click(); await tick(); await ready('.authority-form-probe');
    expect(options()).to.include({mode: 'new', scheme: authority, viewId: 'authority-frame'});
    expect(options()).not.to.have.property('node');
    trigger({eventType: 'Form.ResourceCreated', source: 'authority-frame-resource-form', data: {iri: item}});
    await tick(); await ready('.authority-form-probe');
    expect(options()).to.include({mode: 'edit', node: item, scheme: authority});
  });

  it('keeps read-only authorities free of creation controls', async () => {
    drawHeader(700, {collection: authority, editable: false});
    await ready('.authority-browser-empty-state');
    expect(find('.authority-browser-empty-state button')).to.equal(null);
    expect(find('.resource-record-header')).to.equal(null);
  });

  for (const customView of [undefined, 'http://example.org/custom-view']) {
    it(`routes the dropdown View to authority-list ${customView ? 'with' : 'without'} a custom visualisation`, async () => {
      const template = await TemplateScope.default.compile(menuFragment);
      const element = document.createElement('div');
      element.innerHTML = template({iri: authority, resourceConfig: authorityConfig, resourceVisualisationTemplateIRI: customView});
      const link = element.querySelector('semantic-link-container');
      expect(link.getAttribute('urlqueryparam-view')).to.equal('authority-list');
      expect(link.getAttribute('urlqueryparam-resource')).to.equal(authority);
      expect(element.querySelectorAll('bs-menu-item')).to.have.length(1);
    });
  }

  for (const [width, height] of [[340, 540], [1100, 900]]) {
    it(`keeps the entries search beside its heading and table at ${width} by ${height}`, async () => {
      // Class names and structural wrappers come from the authority's entries tab.
      const entriesClass = entriesSource.match(/<rs-tab event-key="lists"[\s\S]*?<div class="([^"]+)"/)[1];
      const data = ['alternative spelling', 'transcription', 'transliteration'].map(name => ({name, listed: 'Appellation alternative form', actions: '⋮'}));
      render(h('div', {className: 'resource-editView-container', style: {width, height}},
        h('div', {className: 'resource-editView-form-container'}, h('div', {className: 'semantic-form'},
          h('div', {className: entriesClass},
            h('div', {className: 'customFormHeader'}, 'Resource type'),
            h('div', {className: 'select-text-field'}, h('select', {className: 'form-control', disabled: true}, h('option', {}, 'Type'))),
            h('div', {className: 'customFormHeader entries-heading'}, 'List of resources'),
            h('div', {className: 'semantic-search-table-container semantic-search-table-container-in-form'},
              h('div', {className: 'search-container'},
                h('div', {className: 'semantic-search-header-actions'},
                  h('div', {className: 'keyword-search-container'}, h('div', {className: 'form-group'},
                    h('input', {className: 'form-control input-keyword-search', placeholder: 'Search by resource name'}))),
                  h('button', {className: 'btn btn-default'}, '⋮')),
                h('div', {className: 'search-results-area', 'data-flex-layout': 'row stretch-stretch'},
                  h('div', {'data-flex-self': 'md-full'},
                    h('div', {className: 'semantic-table-holder table-fixed-header table-scrollable-content table-expanded search-table-container'},
                      h(Table, {numberOfDisplayedRows: Maybe.Just(10), data: Either.Left<any[], SparqlClient.SparqlSelectResult>(data),
                        layout: Maybe.Just({tupleTemplate: Maybe.Nothing<string>(), showLabels: false, prefetchLabels: false,
                          options: {showFilter: false, showSettings: false, useFixedHeader: true}}),
                        columnConfiguration: [{variableName: 'name', displayName: 'Type name'}, {variableName: 'listed', displayName: 'Listed in'},
                          {variableName: 'actions', displayName: ''}],
                      })))))))))), host);
      await ready('.standard-row');
      const heading = box('.entries-heading'), toolbar = box('.semantic-search-header-actions'), table = box('thead');
      expect(toolbar.height).to.be.at.most(60);
      expect(toolbar.top - heading.bottom).to.be.within(0, 20);
      expect(table.top - toolbar.bottom).to.be.within(0, 32);
      expect(box('.standard-row').top - table.bottom).to.be.within(0, 32);
      expect(find('.semantic-search-header-actions').scrollWidth).to.be.at.most(toolbar.width + 1);
    });
  }
});
