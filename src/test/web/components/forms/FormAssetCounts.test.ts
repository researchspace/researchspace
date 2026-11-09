/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import * as React from 'react';
import * as Immutable from 'immutable';
import * as Handlebars from 'handlebars';
import { render, unmountComponentAtNode } from 'react-dom';
import { Simulate } from 'react-dom/test-utils';
import { Tab, NavItem } from 'react-bootstrap';
import { expect } from 'chai';
import { mockConfig } from 'platform-tests/mocks';
import { Rdf } from 'platform/api/rdf';
import { TemplateScope } from 'platform/api/services/template';
import { FieldValue, CompositeValue, DataState, FieldError } from 'platform/components/forms/FieldValues';
import { renderFields } from 'platform/components/forms/FieldMapping';
import { countFieldValues, parseCountFields } from 'platform/components/forms/FormAssetCounts';
import ResponsiveAssetNavigation from 'platform/components/forms/ResponsiveAssetNavigation';
import { InputDecorator } from 'platform/components/forms/inputs/Decorations';
import 'platform/styling/main.scss';
import 'platform/components/forms/forms.scss';

mockConfig();

const h = React.createElement;
const sidebar: string = require('!!raw-loader!../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FFormAssetSidebar.html').default;

/** Waits until `check` stops throwing (up to 1s), instead of a fixed delay. */
async function until(check: () => void, timeout = 1000) {
  const start = Date.now();
  for (;;) {
    try { check(); return; } catch (error) {
      if (Date.now() - start > timeout) throw error;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}
/** For "nothing changes" assertions: let pending renders and effects settle. */
const settle = () => new Promise(resolve => setTimeout(resolve, 50));

const iri = (name: string) => FieldValue.fromLabeled({ value: Rdf.iri('https://example.org/' + name) });

function composite(subject: string, fields: { [id: string]: FieldValue[] }): CompositeValue {
  return {
    type: CompositeValue.type,
    subject: Rdf.iri(subject),
    definitions: Immutable.Map<string, any>(),
    fields: Immutable.Map(Object.keys(fields).map(id =>
      [id, { values: Immutable.List(fields[id]), errors: FieldError.noErrors }] as [string, any])),
    errors: FieldError.noErrors,
  };
}
const model = (fields: { [id: string]: FieldValue[] }) => composite('https://example.org/painting/A_72', fields);
/** A row of the visual representation composite; '' is the subject of an unsaved row. */
const representation = (subject: string, visualItem?: string, mode?: string) => composite(subject, {
  classtype: [FieldValue.fromLabeled({ value: Rdf.iri('http://www.cidoc-crm.org/cidoc-crm/PC138_represents') })],
  represents_visualItem_domain: visualItem ? [iri(visualItem)] : [FieldValue.empty],
  mode_of_representation: mode ? [iri(mode)] : [],
});
const REPRESENTATIONS = 'entity_represents_range/represents_visualItem_domain';

const a72 = model({
  entity_image_main_representation: [iri('A_72_main.jpg')],
  entity_image: [iri('A_72_1.jpg'), iri('A_72_2.jpg'), iri('A_72_main.jpg'), FieldValue.empty],
  entity_document: [iri('A_72_condition_report.doc')],
  entity_video: [FieldValue.empty],
  entity_represents_range: [representation('https://example.org/PC138_represents/saved', 'sketch'),
    representation('', 'study')],
});

const TABS: Array<[string, string, string[]]> = [
  ['images', 'Images', ['entity_image_main_representation', 'entity_image']],
  ['docs', 'Documents', ['entity_document']],
  ['videos', 'Videos', ['entity_video']],
  ['representations', 'Visual representation', [REPRESENTATIONS]],
  ['links', 'Web URL link', ['entity_web_URL']],
];

describe('form asset counts', () => {
  describe('countFieldValues', () => {
    it('counts distinct non-empty values across fields', () => {
      expect(countFieldValues(a72, ['entity_image_main_representation', 'entity_image'])).to.equal(3);
      expect(countFieldValues(a72, ['entity_document'])).to.equal(1);
    });
    it('treats empty placeholders and missing fields as 0', () => {
      expect(countFieldValues(a72, ['entity_video'])).to.equal(0);
      expect(countFieldValues(a72, ['entity_web_URL'])).to.equal(0);
      expect(countFieldValues(FieldValue.empty, ['entity_image'])).to.equal(0);
      expect(countFieldValues(a72, [])).to.equal(0);
    });
    it('counts saved and unsaved composite rows by what they link to', () => {
      expect(countFieldValues(a72, [REPRESENTATIONS])).to.equal(2);
      const rows = (...values: CompositeValue[]) => model({ entity_represents_range: values });
      // two new rows count one by one, even though both have the placeholder subject
      expect(countFieldValues(rows(representation('', 'a'), representation('', 'b')), [REPRESENTATIONS])).to.equal(2);
      // an empty row, or one with only a mode of representation, counts 0
      expect(countFieldValues(rows(representation(''), representation('', undefined, 'symbolic')), [REPRESENTATIONS])).to.equal(0);
      // two new rows linking the same visual item count once
      expect(countFieldValues(rows(representation('', 'a'), representation('', 'a')), [REPRESENTATIONS])).to.equal(1);
      // saved rows count by their own IRI, one per row
      expect(countFieldValues(rows(representation('x', 'a'), representation('y', 'a')), [REPRESENTATIONS])).to.equal(2);
      // removing a row lowers the count
      expect(countFieldValues(rows(representation('x', 'a')), [REPRESENTATIONS])).to.equal(1);
    });
    it('counts saved rows before their nested fields have loaded', () => {
      // right after the form loads, saved rows are plain IRIs ...
      const unexpanded = model({ entity_represents_range: [iri('PC138/1'), iri('PC138/2')] });
      expect(countFieldValues(unexpanded, [REPRESENTATIONS])).to.equal(2);
      // ... then raw composites whose fields are still empty while they load
      const loading = model({ entity_represents_range: [composite('https://example.org/PC138/1', {})] });
      expect(countFieldValues(loading, [REPRESENTATIONS])).to.equal(1);
    });
    it('never counts unsaved rows by their placeholder subject', () => {
      const rows = model({ entity_represents_range: [representation('', 'a'), representation('', 'b')] });
      expect(countFieldValues(rows, ['entity_represents_range'])).to.equal(0);
    });
    it('parses count-fields as an array or a separated list', () => {
      expect(parseCountFields(['a', 'b/c'])).to.deep.equal(['a', 'b/c']);
      expect(parseCountFields('a b,c')).to.deep.equal(['a', 'b', 'c']);
      expect(parseCountFields(undefined)).to.deep.equal([]);
    });
  });

  describe('rs-form-asset-navigation', () => {
    let host: HTMLDivElement;
    beforeEach(() => {
      host = document.createElement('div');
      host.style.width = '1200px';
      host.className = 'form-assets-sidebar';
      document.body.appendChild(host);
    });
    afterEach(() => { unmountComponentAtNode(host); host.remove(); });

    function draw(props: any, defaultActiveKey: string | null = 'images', onSelect?: (key: any) => void) {
      render(h(Tab.Container, { id: 'asset-counts', defaultActiveKey, onSelect } as any,
        h('div', {},
          h(ResponsiveAssetNavigation, props, TABS.map(([key, label, fields]) =>
            h(NavItem, { eventKey: key, key, countFields: fields } as any, label))),
          h(Tab.Content, { mountOnEnter: true } as any, TABS.map(([key]) => h(Tab.Pane, { eventKey: key, key }, key))))), host);
    }
    const tabs = () => Array.from(host.querySelectorAll<HTMLElement>('.form-asset-media-nav [role="tab"]'));
    const active = () => tabs().filter(t => t.getAttribute('aria-selected') === 'true')
      .map(t => t.querySelector('.form-asset-navigation__label').textContent);
    const counts = () => tabs().map(t => t.querySelector('.form-asset-navigation__count').textContent);

    it('shows a count badge per tab and mutes empty tabs', async () => {
      draw({ model: a72, dataState: DataState.Ready });
      await until(() => expect(counts()).to.deep.equal(['3 items', '1 item', '0 items', '2 items', '0 items']));
      expect(tabs().map(t => t.classList.contains('form-asset-navigation__tab--empty')))
        .to.deep.equal([false, false, true, false, true]);
      expect(tabs()[1].getAttribute('title')).to.equal('Documents');
    });

    it('keeps empty tabs readable (AA contrast) and distinct from disabled ones', async () => {
      draw({ model: a72, dataState: DataState.Ready });
      await until(() => expect(counts().length).to.equal(5));
      const videos = getComputedStyle(tabs()[2]);
      expect(videos.opacity).to.equal('1');
      expect(videos.color).to.equal('rgb(108, 107, 113)');
      const badge = getComputedStyle(tabs()[2].querySelector('.form-asset-navigation__count'));
      expect(badge.backgroundColor).to.equal('rgba(0, 0, 0, 0)');
    });

    it('shows no counts while loading, when turned off, or without count-fields', async () => {
      draw({ model: a72, dataState: DataState.Loading });
      await settle();
      expect(host.querySelectorAll('.form-asset-navigation__count').length).to.equal(0);
      draw({ model: a72, dataState: DataState.Ready, showCounts: false });
      await settle();
      expect(host.querySelectorAll('.form-asset-navigation__count').length).to.equal(0);
      unmountComponentAtNode(host);
      render(h(Tab.Container, { id: 'plain', defaultActiveKey: 'a' },
        h(ResponsiveAssetNavigation, { model: a72, dataState: DataState.Ready }, h(NavItem, { eventKey: 'a' }, 'A'))), host);
      await settle();
      expect(host.querySelectorAll('.form-asset-navigation__count').length).to.equal(0);
    });

    it('keeps the tablist keyboard-reachable while no tab is open', async () => {
      draw({ model: a72, dataState: DataState.Loading, selectFirstWithItems: true }, null);
      await settle();
      expect(active()).to.deep.equal([]);
      expect(tabs().map(t => t.tabIndex)).to.deep.equal([0, -1, -1, -1, -1]);
    });

    it('shows counts in the More menu for tabs that do not fit', async () => {
      host.style.width = '260px';
      draw({ model: a72, dataState: DataState.Ready });
      await until(() => expect(host.querySelector('.form-asset-navigation__more').hasAttribute('hidden')).to.equal(false));
      const menu = Array.from(host.querySelectorAll<HTMLElement>('.form-asset-navigation__menu [role="menuitem"]'));
      expect(menu.length).to.be.greaterThan(0);
      const hidden = tabs().filter(t => t.hidden).map(t => t.querySelector('.form-asset-navigation__label').textContent);
      expect(menu.map(item => item.querySelector('.form-asset-navigation__label').textContent)).to.deep.equal(hidden);
      menu.forEach(item => expect(item.querySelector('.form-asset-navigation__count')).to.not.equal(null));
      const empty = menu.filter(item => item.classList.contains('form-asset-navigation__menu-item--empty'))
        .map(item => item.querySelector('.form-asset-navigation__count').textContent);
      expect(empty.length).to.be.greaterThan(0);
      empty.forEach(text => expect(text).to.equal('0 items'));
      menu.filter(item => item.classList.contains('form-asset-navigation__menu-item--empty'))
        .forEach(item => expect(getComputedStyle(item).color).to.equal('rgb(108, 107, 113)'));
    });

    describe('without default-tab (select-first-with-items)', () => {
      it('opens no tab while loading, then the first tab with items', async () => {
        const noImages = model({ entity_document: [iri('d1')], entity_video: [iri('v1')] });
        draw({ model: noImages, dataState: DataState.Loading, selectFirstWithItems: true }, null);
        await settle();
        expect(active()).to.deep.equal([]);
        expect(host.querySelector('.tab-pane')).to.equal(null);   // no pane mounted yet
        draw({ model: noImages, dataState: DataState.Ready, selectFirstWithItems: true }, null);
        await until(() => expect(active()).to.deep.equal(['Documents']));
        // once the open tab has items, later model changes do not move it
        draw({ model: model({ entity_video: [iri('v1')] }), dataState: DataState.Ready, selectFirstWithItems: true }, null);
        await settle();
        expect(active()).to.deep.equal(['Documents']);
      });

      it('opens the first tab when every tab is empty, and moves for values that arrive later', async () => {
        draw({ model: model({}), dataState: DataState.Ready, selectFirstWithItems: true }, null);
        await until(() => expect(active()).to.deep.equal(['Images']));
        // e.g. a recovered draft applied after the initial load
        draw({ model: model({ entity_document: [iri('d1')] }), dataState: DataState.Ready, selectFirstWithItems: true }, null);
        await until(() => expect(active()).to.deep.equal(['Documents']));
      });

      it('never overrides a tab the user picked', async () => {
        draw({ model: model({}), dataState: DataState.Ready, selectFirstWithItems: true }, null);
        await until(() => expect(active()).to.deep.equal(['Images']));
        Simulate.click(tabs()[2]);
        await until(() => expect(active()).to.deep.equal(['Videos']));
        draw({ model: model({ entity_document: [iri('d1')] }), dataState: DataState.Ready, selectFirstWithItems: true }, null);
        await settle();
        expect(active()).to.deep.equal(['Videos']);
      });

      it('stops once the user adds items to the open tab', async () => {
        draw({ model: model({}), dataState: DataState.Ready, selectFirstWithItems: true }, null);
        await until(() => expect(active()).to.deep.equal(['Images']));
        draw({ model: model({ entity_image: [iri('i1')] }), dataState: DataState.Ready, selectFirstWithItems: true }, null);
        await settle();
        draw({ model: model({ entity_image: [iri('i1')], entity_document: [iri('d1')] }), dataState: DataState.Ready,
          selectFirstWithItems: true }, null);
        await settle();
        expect(active()).to.deep.equal(['Images']);
      });

      it('opens the first tab straight away outside a form', async () => {
        const selected: any[] = [];
        draw({ selectFirstWithItems: true }, null, key => selected.push(key));
        await until(() => expect(active()).to.deep.equal(['Images']));
        expect(selected).to.deep.equal(['images']);
      });

      it('keeps an explicit default tab when not asked to select', async () => {
        draw({ model: model({ entity_document: [iri('d1')] }), dataState: DataState.Ready, selectFirstWithItems: false }, 'videos');
        await settle();
        expect(active()).to.deep.equal(['Videos']);
      });
    });

    it('receives the form model when nested inside form markup', async () => {
      const markup = h(Tab.Container, { id: 'nested', defaultActiveKey: 'images' },
        h('div', { className: 'form-assets-sidebar__tabs' },
          h(ResponsiveAssetNavigation, {}, TABS.map(([key, label, fields]) =>
            h(NavItem, { eventKey: key, key, countFields: fields } as any, label)))));
      const drawWith = (state: DataState) => render(h('div', {},
        renderFields(markup, a72, Immutable.Map(), () => state, () => undefined, () => undefined)), host);
      drawWith(DataState.Loading);
      await settle();
      expect(host.querySelectorAll('.form-asset-navigation__count').length).to.equal(0);
      drawWith(DataState.Ready);
      await until(() => expect(counts()).to.deep.equal(['3 items', '1 item', '0 items', '2 items', '0 items']));
    });
  });

  describe('section heading count', () => {
    let host: HTMLDivElement;
    beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
    afterEach(() => { unmountComponentAtNode(host); host.remove(); });
    const definition: any = { id: 'entity_image', label: [], minOccurs: 0, maxOccurs: 100 };
    const draw = (values: Immutable.List<FieldValue>, extra: any) =>
      render(h(InputDecorator, { definition, label: 'More images', values, errors: FieldError.noErrors, ...extra }, 'input'), host);
    const count = () => {
      const badge = host.querySelector('.semantic-form-input-decorator__count');
      return badge ? badge.textContent : null;
    };

    it('shows the number of values next to the label when show-count is set', () => {
      const values = Immutable.List([iri('A_72_1.jpg'), iri('A_72_2.jpg'), FieldValue.empty]);
      draw(values, { dataState: DataState.Ready, showCount: true });
      expect(count()).to.equal('2 items');
      // styled outside the sidebar too
      expect(getComputedStyle(host.querySelector('.semantic-form-input-decorator__count')).borderRadius).to.equal('10px');
      draw(Immutable.List([iri('one')]), { dataState: DataState.Ready, showCount: true });
      expect(count()).to.equal('1 item');
      draw(values, { dataState: DataState.Ready });
      expect(count()).to.equal(null);
    });

    it('keeps the count during validation and hides it only while loading', () => {
      const values = Immutable.List([iri('A_72_1.jpg')]);
      draw(values, { dataState: DataState.Verifying, showCount: true });
      expect(count()).to.equal('1 item');
      draw(values, { dataState: DataState.Loading, showCount: true });
      expect(count()).to.equal(null);
    });
  });

  describe('FormAssetSidebar template', () => {
    const navItems = sidebar.match(/<bs-nav-item [^>]*>[^<]*<\/bs-nav-item>/g) as string[];
    const bindings = sidebar.match(/<div class="form-asset-model-bindings" hidden>[\s\S]*?\n  <\/div>/)[0];

    it('declares count-fields on every countable tab, bound in the model', () => {
      for (const item of navItems) {
        if (/resourceForm-map"/.test(item)) {
          expect(item).to.not.contain('count-fields');
          continue;
        }
        const fields = JSON.parse(item.match(/count-fields='([^']+)'/)[1]) as string[];
        expect(fields.length).to.be.greaterThan(0);
        // the first step of a path is the field bound in the model
        fields.forEach(field => expect(bindings).to.contain(`for="${field.split('/')[0]}"`));
      }
      expect(bindings).to.contain(`for="represents_visualItem_domain"`);
    });

    it('turns counts on by default; hideCounts turns them off', () => {
      expect(sidebar).to.contain(`show-counts="[[#if hideCounts]]false[[else]]true[[/if]]"`);
      expect(sidebar.match(/\[\[#unless hideCounts\]\]show-count="true"\[\[\/unless\]\]/g).length).to.equal(2);
    });

    /**
     * Renders an attribute of the tab container / navigation the way the platform does:
     * server-side [[ ]] Handlebars with the caller's parameters, then client-side {{ }}.
     */
    async function renderAttribute(name: string, params: object) {
      const raw = sidebar.match(new RegExp(`\\s${name}="([^"]*)"`))[1];
      const server = Handlebars.create();
      server.registerHelper('lookup', (value: any) => (typeof value === 'string' ? value : ''));
      const protectedClient = raw.replace(/\{\{/g, '\u0001').replace(/\}\}/g, '\u0002')
        .replace(/\[\[/g, '{{').replace(/\]\]/g, '}}');
      const serverOutput = server.compile(protectedClient, { noEscape: true })(params)
        .replace(/\u0001/g, '{{').replace(/\u0002/g, '}}');
      const client = await TemplateScope.default.compile(serverOutput);
      return client({ viewId: 'v' }).trim();
    }

    it('starts with no tab and selects the first with items when default-tab is omitted', async () => {
      expect(await renderAttribute('default-active-key', {})).to.equal('');
      expect(await renderAttribute('select-first-with-items', {})).to.equal('true');
    });

    it('opens the requested tab when default-tab is given', async () => {
      expect(await renderAttribute('default-active-key', { 'default-tab': 'docs' })).to.equal('v-resourceForm-docs');
      expect(await renderAttribute('select-first-with-items', { 'default-tab': 'docs' })).to.equal('false');
      // as passed by the Place and Organisation forms
      const map = { 'default-tab': '{{viewId}}-resourceForm-map', map: true };
      expect(await renderAttribute('default-active-key', map)).to.equal('v-resourceForm-map');
      expect(await renderAttribute('select-first-with-items', map)).to.equal('false');
      // an unknown or hidden tab falls back to the first visible tab
      expect(await renderAttribute('default-active-key', { 'default-tab': 'map' })).to.equal('v-resourceForm-images');
      expect(await renderAttribute('default-active-key', { 'default-tab': 'docs', hideDocuments: true }))
        .to.equal('v-resourceForm-images');
    });
  });
});
