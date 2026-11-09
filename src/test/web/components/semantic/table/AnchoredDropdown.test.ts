/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { createElement as h } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { expect } from 'chai';
import { Tab, NavItem } from 'react-bootstrap';
import { listen } from 'platform/api/events';
import { TemplateItem } from 'platform/components/ui/template';
import { AnchoredMenuOverlay } from 'platform/components/ui/dropdown/AnchoredMenuOverlay';
import ResponsiveAssetNavigation from 'platform/components/forms/ResponsiveAssetNavigation';
import { mockConfig } from 'platform-tests/mocks';
import 'platform/styling/main.scss';
import 'platform/components/forms/forms.scss';

mockConfig();
describe('Shared anchored dropdown', () => {
  let host: HTMLDivElement;
  const tick = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const find = (selector: string) => host.querySelector<HTMLElement>(selector);
  const source = `<rs-dropdown id="shared-search-actions" pull-right=true class="dropdown-no-caret" menu-width=280>
    <bs-dropdown-toggle aria-label="Search actions">Actions</bs-dropdown-toggle>
    <bs-dropdown-menu>
      <mp-event-trigger id="disabled-selection" type="Component.TemplateUpdate" targets='["search-action-probe"]'>
        <bs-menu-item disabled=true><span>New set with selection</span></bs-menu-item>
      </mp-event-trigger>
      <mp-event-trigger id="save-results" type="Component.TemplateUpdate" targets='["search-action-probe"]'
          data='{"selection": "{{selection}}"}'>
        <bs-menu-item><rs-icon icon-name="create_new_folder" icon-type="rounded" class="icon-left" symbol=true></rs-icon>
          <span>New set with results</span></bs-menu-item>
      </mp-event-trigger>
      <mp-event-trigger id="export-results" type="Component.TemplateUpdate" targets='["search-action-probe"]'
          data='{"selection": "{{selection}}", "format": "csv"}'>
        <bs-menu-item><rs-icon icon-name="file_download" icon-type="rounded" class="icon-left" symbol=true></rs-icon>
          <span>Export selected resources as CSV</span></bs-menu-item>
      </mp-event-trigger>
    </bs-dropdown-menu>
  </rs-dropdown>`;
  beforeEach(() => {
    host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:10px;top:10px;width:180px;height:160px;overflow:auto';
    document.body.appendChild(host);
  });
  afterEach(() => { unmountComponentAtNode(host); host.remove(); });

  async function draw() {
    render(h(TemplateItem, {template: {source, options: {selection: 'current-search-selection'}}}), host);
    for (let i = 0; i < 100 && !find('[role="menuitem"]'); i++) await new Promise(resolve => setTimeout(resolve, 10));
    expect(Boolean(find('[role="menuitem"]')), host.textContent).to.equal(true);
    find('.dropdown-toggle').click(); await tick();
  }

  it('escapes a narrow clipping panel and retains template context for wrapped actions', async () => {
    await draw();
    const menu = find('.dropdown-menu');
    expect(menu.matches(':popover-open')).to.equal(true);
    expect(menu.getBoundingClientRect().width).to.equal(280);
    expect(menu.getBoundingClientRect().right).to.be.greaterThan(host.getBoundingClientRect().right);
    let payload;
    const subscription = listen({eventType: 'Component.TemplateUpdate', target: 'search-action-probe'})
      .observe({value: event => {payload = event.data;}});
    try {
      const items = host.querySelectorAll<HTMLElement>('[role="menuitem"]');
      items[0].click(); await tick();
      expect(payload).to.equal(undefined);
      expect(menu.matches(':popover-open')).to.equal(true);
      items[2].click(); await tick();
      expect(payload).to.deep.equal({selection: 'current-search-selection', format: 'csv'});
      expect(menu.matches(':popover-open')).to.equal(false);
    } finally { subscription.unsubscribe(); }
  });

  it('navigates wrapped items, skips disabled items, and dismisses with Escape, Tab and outside click', async () => {
    await draw();
    const menu = find('.dropdown-menu'), toggle = find('.dropdown-toggle');
    const items = host.querySelectorAll<HTMLElement>('[role="menuitem"]');
    const key = (name: string) => (document.activeElement as HTMLElement)
      .dispatchEvent(new KeyboardEvent('keydown', {key: name, bubbles: true, cancelable: true}));
    items[1].focus(); key('ArrowDown'); expect(document.activeElement).to.equal(items[2]);
    key('ArrowDown'); expect(document.activeElement).to.equal(items[1]);
    key('End'); expect(document.activeElement).to.equal(items[2]);
    key('Home'); expect(document.activeElement).to.equal(items[1]);
    key('Escape'); await tick();
    expect(menu.matches(':popover-open')).to.equal(false);
    expect(document.activeElement).to.equal(toggle);
    toggle.click(); await tick(); items[1].focus(); key('Tab'); await tick();
    expect(menu.matches(':popover-open')).to.equal(false);
    toggle.focus();
    toggle.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', keyCode: 40, bubbles: true}));
    await tick();
    expect(document.activeElement).to.equal(items[1]);
    document.body.click(); await tick();
    expect(menu.matches(':popover-open')).to.equal(false);
  });

  it('flips above a low trigger, follows panel movement and closes when the trigger scrolls away', async () => {
    host.style.top = `${document.documentElement.clientHeight - 65}px`;
    await draw();
    const menu = find('.dropdown-menu'), toggle = find('.dropdown-toggle');
    expect(menu.getBoundingClientRect().bottom).to.be.at.most(toggle.getBoundingClientRect().top);
    host.style.top = '10px'; host.style.width = '240px'; await tick(); await tick();
    expect(menu.getBoundingClientRect().top).to.be.at.least(toggle.getBoundingClientRect().bottom);
    const spacer = document.createElement('div'); spacer.style.height = '600px'; host.appendChild(spacer);
    host.scrollTop = 200; await tick();
    expect(menu.matches(':popover-open')).to.equal(false);
    expect(host.scrollTop).to.equal(200);
  });

  it('fits within clipping ancestors when native popovers are unavailable and restores menu styles', () => {
    host.style.height = '300px';
    host.innerHTML = '<div style="position:relative"><button class="dropdown-toggle">Actions</button>' +
      '<ul class="dropdown-menu" style="display:block"><li><a role="menuitem"><span>New set with results</span></a></li></ul></div>';
    const menu = find('.dropdown-menu');
    const original = menu.getAttribute('style');
    Object.defineProperty(menu, 'showPopover', {value: undefined});
    const overlay = new AnchoredMenuOverlay(menu, {width: 280});
    try {
      expect(overlay.position(find('.dropdown-toggle'))).to.equal(true);
      const bounds = menu.getBoundingClientRect(), panel = host.getBoundingClientRect();
      expect(bounds.left).to.be.at.least(panel.left);
      expect(bounds.right).to.be.at.most(panel.right);
      expect(menu.scrollWidth).to.be.at.most(menu.clientWidth);
    } finally { overlay.dispose(); }
    expect(menu.getAttribute('style')).to.equal(original);
    expect(menu.hasAttribute('popover')).to.equal(false);
  });

  it('preserves the form media overflow menu and tab selection', async () => {
    render(h(Tab.Container, {id: 'asset-tabs', defaultActiveKey: 'images'},
      h(ResponsiveAssetNavigation, {}, ['images', 'documents', 'videos', 'links'].map(name =>
        h(NavItem, {eventKey: name, key: name}, name)))), host);
    await tick(); await document.fonts.ready; await tick();
    const toggle = find('button.form-asset-navigation__more');
    expect(toggle.hidden).to.equal(false);
    toggle.click(); await tick();
    const menu = find('.form-asset-navigation__menu');
    expect(menu.matches(':popover-open')).to.equal(true);
    const item = menu.querySelector<HTMLButtonElement>('[role="menuitem"]');
    const selected = item.textContent;
    item.click(); await tick();
    expect(menu.matches(':popover-open')).to.equal(false);
    expect(find('[role="tab"][aria-selected="true"]').textContent).to.equal(selected);
  });
});
