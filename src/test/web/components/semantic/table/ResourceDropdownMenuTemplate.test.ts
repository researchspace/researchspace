/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { createElement as h, Component } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { expect } from 'chai';
import { mockConfig } from 'platform-tests/mocks';
import { TemplateScope } from 'platform/api/services/template';
import { TemplateContextTypes } from 'platform/api/components/TemplateContext';
import { escapeRemoteTemplateHtml } from 'platform/api/services/template/TemplateParser';
import { TemplateItem } from 'platform/components/ui/template';
import { ResourceDropdown } from 'platform/components/ui/resource-dropdown';
import 'platform/styling/main.scss';

mockConfig();

class TemplateProvider extends Component<{ scope: TemplateScope }, {}> {
  static childContextTypes = TemplateContextTypes;
  getChildContext() { return { templateScope: this.props.scope, templateDataContext: undefined }; }
  render() { return this.props.children; }
}

const tick = () => new Promise(resolve => setTimeout(resolve, 50));

describe('rs-resource-dropdown menu-template', () => {
  let host: HTMLDivElement;
  let scope: TemplateScope;
  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    scope = TemplateScope.create({ partials: {
      menu: `<bs-dropdown-menu class-name="resource-actions__dropdown-menu">
               <bs-menu-item><span class="lazy-action">Action A</span></bs-menu-item>
               <bs-menu-item><span class="lazy-action">Action B</span></bs-menu-item>
             </bs-dropdown-menu>`,
    } });
  });
  afterEach(() => {
    unmountComponentAtNode(host);
    host.remove();
  });

  it('renders the menu template only after the first open', async () => {
    render(h(TemplateProvider, { scope },
      h('div', { style: { padding: '40px' } },
        h(ResourceDropdown, { id: 'lazy-actions', className: 'dropdown-no-caret', menuTemplate: '{{> menu}}' }))), host);
    await tick();
    expect(host.querySelectorAll('.lazy-action').length).to.equal(0);
    host.querySelector<HTMLElement>('.dropdown-toggle').click();
    for (let i = 0; i < 40 && host.querySelectorAll('.lazy-action').length === 0; i++) { await tick(); }
    const items = host.querySelectorAll<HTMLElement>('.resource-actions__dropdown-menu [role="menuitem"]');
    expect(items.length).to.equal(2);
    expect(items[0].textContent.trim()).to.equal('Action A');
    const menu = host.querySelector<HTMLElement>('.resource-actions__dropdown-menu');
    expect(menu.getClientRects().length).to.be.greaterThan(0);
    // closing keeps the rendered menu mounted; it is not re-rendered per open
    items[0].click(); await tick();
    expect(host.querySelectorAll('.lazy-action').length).to.equal(2);
  });

  it('resolves outer template variables inside a markup menu template', async () => {
    // the shape used by result rows, cards and knowledge-map nodes: the menu
    // partial parameters refer to the row's own context (iri, viewId, ...)
    const row = await escapeRemoteTemplateHtml(`
      <div class="row-probe">
        <rs-resource-dropdown id='{{viewId}}-{{iri}}-actions' menu-template='{{> menu}}'>
          <template id='menu'>
            <bs-dropdown-menu class-name="resource-actions__dropdown-menu">
              <bs-menu-item><span class="lazy-action" data-iri="{{iri}}">Open {{label}} in {{viewId}}</span></bs-menu-item>
            </bs-dropdown-menu>
          </template>
        </rs-resource-dropdown>
      </div>`);
    render(h(TemplateProvider, { scope },
      h(TemplateItem, { template: { source: row, options: { iri: 'https://example.org/a', viewId: 'frame-1', label: 'Thing A' } } })), host);
    for (let i = 0; i < 40 && !host.querySelector('.dropdown-toggle'); i++) { await tick(); }
    expect(host.querySelectorAll('.lazy-action').length).to.equal(0);
    host.querySelector<HTMLElement>('.dropdown-toggle').click();
    for (let i = 0; i < 40 && host.querySelectorAll('.lazy-action').length === 0; i++) { await tick(); }
    const action = host.querySelector<HTMLElement>('.lazy-action');
    expect(action.textContent.trim()).to.equal('Open Thing A in frame-1');
    expect(action.getAttribute('data-iri')).to.equal('https://example.org/a');
  });
});
