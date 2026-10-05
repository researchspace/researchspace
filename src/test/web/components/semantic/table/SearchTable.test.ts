/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { createElement as h, Component } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Dropdown, MenuItem } from 'react-bootstrap';
import { expect } from 'chai';
import * as Maybe from 'data.maybe';
import * as Either from 'data.either';
import { Table, CellRendererProps } from 'platform/components/semantic/table/Table';
import { SparqlClient } from 'platform/api/sparql';
import { ResourceDropdown } from 'platform/components/ui/resource-dropdown';
import { Pagination } from 'platform/components/semantic/table/Pagination';
import Icon from 'platform/components/ui/icon/Icon';
import { TemplateItem } from 'platform/components/ui/template';
import { escapeRemoteTemplateHtml } from 'platform/api/services/template/TemplateParser';
import { mockConfig } from 'platform-tests/mocks';
import 'platform/styling/main.scss';

mockConfig();

const source = require('!!raw-loader!../../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FResourceSearchTemplate.html').default;
const rawViewDropdown = source.match(/<mp-event-target-template-render id="{{bindings\.0\.viewid\.value}}-search-view-dropdown-area"[\s\S]*?<\/mp-event-target-template-render>/)[0];
const newButtons: string[] = source.match(/<button id="create-new-btn"[\s\S]*?<\/button>/g)
  .map(button => button.replace(/\[\[urlParam ["']resourcelabel["'][^\]]*\]\]/g, 'Authority document'));
const countPartial = source.split('[[#*inline "numberOfResults"]]')[1];
const countTemplate = countPartial.match(/<div class="semantic-search-num-results"[^>]*>/)[0]
  + countPartial.match(/<template id='template'>([\s\S]*?)<\/template>/)[1] + '</div>';
const uri = value => ({ type: 'uri', value });
const literal = value => ({ type: 'literal', value });
const views = ['List', 'Grid', 'Timeline with a deliberately long descriptive label'].map((label, index) => ({
  viewid: literal('responsive-search'), searchViewLabel: literal(label),
  searchViewType: uri(`http://www.researchspace.org/resource/system/vocab/search_view_type/${['list', 'grid', 'timeline'][index]}`),
}));

// Exercise real Griddle, Pagination and ResourceDropdown components and theme
// styles with local rows, without requiring a running SPARQL repository.
describe('Responsive search tables', () => {
  let host: HTMLDivElement;
  let viewDropdown: string;
  let selectedAction: number;
  const find = (selector: string) => host.querySelector<HTMLElement>(selector);
  const tick = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const box = (selector: string) => find(selector).getBoundingClientRect();
  before(async () => { viewDropdown = await escapeRemoteTemplateHtml(rawViewDropdown); });

  class Name extends Component<CellRendererProps> {
    render() {
    const { data } = this.props;
    return h('div', { className: 'rs-search-identity' },
      h('input', { type: 'checkbox', className: 'rs-search-selection' }),
      h('div', { className: 'rs-search-identity-body' },
        h('div', { className: 'resource-thumbnail-small-container', draggable: true }, 'Image'),
        h('div', { className: 'rs-search-title', draggable: true },
          h('span', { className: 'text-truncate-line1' }, data))));
    }
  }

  class Actions extends Component<CellRendererProps> {
    render() {
    const { rowData } = this.props;
    return h('div', { className: 'rs-search-actions' },
      h('button', { className: 'btn btn-default border-none rs-search-drag', draggable: true },
        h(Icon, { iconType: 'rounded', iconName: 'drag_pan', symbol: true })),
      h(ResourceDropdown, { id: `actions-${rowData.name}`, className: 'dropdown-no-caret', toggleClassName: 'border-none' },
        h(Dropdown.Menu, { className: 'resource-actions__dropdown-menu' },
          [0, 1, 2, 3, 4, 5].map(i => h(MenuItem, { key: i, onSelect: () => { selectedAction = i; } }, `Action ${i}`)))));
    }
  }

  function Toolbar({ newVariant = 2 }: { newVariant?: number }) {
    return h('div', { className: 'semantic-search-header-content rs-search-toolbar' },
      h('div', { className: 'semantic-search-header-actions' },
        h('div', { className: 'btn-newDraggableTab-container' },
          h(TemplateItem, { template: { source: newButtons[newVariant] } }),
          h('button', { className: 'btn btn-action btn-textAndIcon btn-newDraggableTab', title: 'Open in new draggable tab' },
            h(Icon, { iconName: 'tab_move', iconType: 'rounded', symbol: true }))),
        h('button', { className: 'btn btn-default btn-textAndIcon' }, 'Import'),
        h('div', { className: 'search-results-header-keyword' },
          h('div', { className: 'keyword-search-container' }, h('div', { className: 'form-group' },
            h('input', { className: 'form-control input-keyword-search', placeholder: 'Search Authority documents' })))),
        h('div', { className: 'search-results-header-tools' },
          h(TemplateItem, { template: { source: viewDropdown, options: { bindings: views } } }),
          h('button', { className: 'btn btn-default btn-textAndIcon search-refresh-button', 'aria-label': 'Refresh results' },
            h(Icon, { iconName: 'refresh', iconType: 'rounded', symbol: true })),
          h(Dropdown, { id: 'search-actions', pullRight: true, className: 'dropdown-no-caret search-actions-dropdown' },
            h(Dropdown.Toggle, { 'aria-label': 'Search actions' }, h(Icon, { iconName: 'more_vert', iconType: 'rounded', symbol: true })),
            h(Dropdown.Menu, {}, h(MenuItem, {}, 'Export selected Authority documents as CSV'))))));
  }

  function draw(width = 340, columns = 2, count = 420, toolbar = false, compactFrame = false,
      totalNumberOfResults?: number, newVariant = 2) {
    const data = Array.from({ length: count }, (_, i) => ({
      name: `Sample ${String(i + 1).padStart(3, '0')} — long descriptive name and identifier`,
      description: 'A long description of the paint layer', method: 'Microscopy', date: '2026-10-05', actions: '',
    }));
    const fields = ['name', 'description', 'method', 'date'].slice(0, columns);
    render(h('div', { className: 'search-page-container', style: { width, height: 540, padding: compactFrame ? 16 : 0 } },
      h('div', { className: 'search-container' }, h('div', { className: 'semantic-search-content' },
        toolbar ? h(Toolbar, { newVariant }) : null,
        // Include the closed filter rail and frame padding in narrow-pane regressions.
        h('div', { style: { display: 'flex', flex: 1, minHeight: 0, minWidth: 0 } },
        h('div', { className: 'search-results-area page__section-container' },
          h('div', { className: 'search-results-summary' },
            h(TemplateItem, { template: { source: countTemplate, options: {
              numberOfResults: count, totalNumberOfResults, hasLimit: totalNumberOfResults !== undefined,
            } } })),
          h('div', { className: 'search-results-views' },
          h('div', { className: 'semantic-table-holder table-fixed-header table-scrollable-content table-expanded search-table-container' },
            h(Table, {
              separatePagination: true, numberOfDisplayedRows: Maybe.Just(30), data: Either.Left<any[], SparqlClient.SparqlSelectResult>(data),
              layout: Maybe.Just({ tupleTemplate: Maybe.Nothing<string>(), showLabels: false, prefetchLabels: false,
                options: { showFilter: false, showSettings: false, useFixedHeader: true } }),
              columnConfiguration: [...fields, 'actions'].map((field, i) => ({
                variableName: field, displayName: field === 'actions' ? '' : field,
                cellComponent: i === 0 ? Name : field === 'actions' ? Actions : undefined,
              })),
            })))), compactFrame ? h('div', { className: 'test-filter-rail',
              style: { flex: '0 0 43px' } }, h(Icon, { iconName: 'filter_alt', iconType: 'outlined' })) : null)))), host);
  }

  beforeEach(() => {
    host = document.createElement('div');
    // The Karma viewport is smaller than the widest pane under test.
    host.style.cssText = 'position:fixed;top:10px;left:10px;z-index:1000';
    document.body.appendChild(host);
    selectedAction = -1;
  });
  afterEach(() => { unmountComponentAtNode(host); host.remove(); });

  async function waitForToolbar() {
    for (let i = 0; i < 100 && (!find('.search-view-dropdown .dropdown-toggle') || !find('#create-new-btn') || !find('.num-results')); i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    expect(Boolean(find('.search-view-dropdown .dropdown-toggle')), find('.search-results-header-tools').textContent).to.equal(true);
    await tick();
    await document.fonts.ready;
    await tick();
  }

  for (const width of [160, 220, 340, 640, 720, 820, 900]) {
    it(`wraps the toolbar and contains open dropdowns in a ${width}px pane`, async () => {
      draw(width, 2, 420, true);
      await waitForToolbar();
      const header = box('.rs-search-toolbar');
      const content = find('.semantic-search-content');
      expect(content.scrollWidth).to.be.at.most(content.clientWidth + 1);
      for (const control of Array.from(host.querySelectorAll<HTMLElement>('.rs-search-toolbar button, .rs-search-toolbar input'))) {
        const bounds = control.getBoundingClientRect();
        expect(bounds.left).to.be.at.least(header.left);
        expect(bounds.right).to.be.at.most(header.right + 1);
      }
      const label = box('.search-view-label');
      const caret = box('.search-view-dropdown .caret');
      expect(label.right).to.be.at.most(caret.left);
      expect(box('.search-results-area').top).to.be.at.least(header.bottom);
      expect(box('.semantic-search-num-results').bottom).to.be.at.most(box('.griddle-body').top);
      expect(box('.table-pagination').bottom).to.be.at.most(box('.search-page-container').bottom);

      find('.search-view-dropdown .dropdown-toggle').click(); await tick();
      const menu = box('.search-view-dropdown .dropdown-menu');
      expect(menu.left).to.be.at.least(header.left);
      expect(menu.right).to.be.at.most(header.right + 1);
      expect(find('.search-view-dropdown .dropdown-menu').scrollWidth).to.be.at.most(menu.width + 1);
      // Use the real event-target template from ResourceSearchTemplate.html.
      const items = host.querySelectorAll<HTMLElement>('.search-view-dropdown [role="menuitem"]');
      items[2].click(); await tick();
      expect(find('.search-view-label').textContent).to.contain('Timeline with a deliberately long descriptive label');
      expect(box('.search-view-label').right).to.be.at.most(box('.search-view-dropdown .caret').left);
      expect(box('.table-pagination').bottom).to.be.at.most(box('.search-page-container').bottom);

      find('.search-actions-dropdown .dropdown-toggle').click(); await tick();
      const actions = box('.search-actions-dropdown .dropdown-menu');
      expect(actions.left).to.be.at.least(header.left - 1);
      expect(actions.right).to.be.at.most(header.right + 1);
      expect(find('.search-actions-dropdown .dropdown-menu').scrollWidth).to.be.at.most(actions.width + 1);
    });
  }

  for (const width of [146, 180, 320, 640]) {
    it(`keeps actual New and count labels on one line with a filter rail in a ${width}px frame`, async () => {
      draw(width, 2, 93, true, true); await waitForToolbar();
      const button = find('#create-new-btn');
      expect(button.title).to.equal('New Authority document');
      expect(button.getAttribute('aria-label')).to.equal(button.title);
      expect(button.getBoundingClientRect().height).to.be.at.most(38);
      expect(button.scrollWidth).to.be.at.most(button.clientWidth + 1);
      expect(box('.btn-newDraggableTab-container').right).to.be.at.most(box('.rs-search-toolbar').right + 1);
      const count = find('.num-results');
      expect(count.title).to.equal('Found 93 results');
      expect(find('.num-results .sr-only').textContent).to.equal(count.title);
      expect(box('.num-results-color').height).to.be.at.most(22);
      expect(find('.num-results-color').scrollWidth).to.be.at.most(find('.num-results-color').clientWidth + 1);
      expect(count.getBoundingClientRect().height).to.be.at.most(22);
      expect(count.getBoundingClientRect().right).to.be.at.most(box('.search-results-summary').right + 1);
      expect(count.getBoundingClientRect().bottom).to.be.at.most(box('.griddle-body').top);
      expect(box('.table-pagination').bottom).to.be.at.most(box('.search-results-area').bottom + 1);
      expect(find('.semantic-search-content').scrollWidth).to.be.at.most(box('.semantic-search-content').width + 1);
    });
  }

  for (const variant of [0, 1]) {
    it(`also compacts the specialized New button variant ${variant}`, async () => {
      draw(146, 2, 93, true, true, undefined, variant); await waitForToolbar();
      expect(box('#create-new-btn').height).to.be.at.most(38);
      expect(getComputedStyle(find('.rs-search-new-label')).display).to.equal('none');
      expect(getComputedStyle(find('.rs-search-new-compact')).display).not.to.equal('none');
      expect(find('#create-new-btn').getAttribute('aria-label')).to.equal('New Authority document');
    });
  }

  it('preserves the exact total when a large count must be truncated in a tiny results area', async () => {
    draw(146, 2, 93, true, true, 123456789); await waitForToolbar();
    const number = find('.num-results-color');
    expect(number.textContent).to.equal('123456789');
    expect(find('.num-results').title).to.equal('Found 123456789 results');
    expect(find('.num-results .sr-only').textContent).to.equal('Found 123456789 results');
    expect(number.getBoundingClientRect().height).to.be.at.most(22);
    expect(getComputedStyle(number).textOverflow).to.equal('ellipsis');
    expect(number.getBoundingClientRect().right).to.be.at.most(box('.search-results-summary').right + 1);
  });

  it('keeps the selected view and fitting controls while the same pane is resized', async () => {
    draw(900, 2, 420, true); await waitForToolbar();
    find('.search-view-dropdown .dropdown-toggle').click(); await tick();
    host.querySelectorAll<HTMLElement>('.search-view-dropdown [role="menuitem"]')[1].click(); await tick();
    for (const width of [340, 160, 640, 900]) {
      find('.search-page-container').style.width = `${width}px`;
      await tick();
      expect(find('.search-view-label').textContent).to.contain('Grid');
      expect(find('.semantic-search-content').scrollWidth).to.be.at.most(width + 1);
      expect(box('.search-view-label').right).to.be.at.most(box('.search-view-dropdown .caret').left);
      expect(box('.semantic-search-num-results').bottom).to.be.at.most(box('.griddle-body').top);
      expect(box('.table-pagination').bottom).to.be.at.most(box('.search-page-container').bottom);
    }
  });

  it('restores full labels when a narrow frame is expanded', async () => {
    draw(640, 2, 93, true, true); await waitForToolbar();
    for (const width of [146, 320, 640]) {
      find('.search-page-container').style.width = `${width}px`; await tick();
      const narrow = width < 640;
      expect(getComputedStyle(find('.rs-search-new-label')).display === 'none').to.equal(narrow);
      expect(getComputedStyle(find('.rs-search-new-compact')).display === 'none').to.equal(!narrow);
      expect(getComputedStyle(find('.rs-search-count-prefix')).display === 'none').to.equal(narrow);
      expect(getComputedStyle(find('.rs-search-count-suffix')).display === 'none').to.equal(width === 146);
      expect(box('#create-new-btn').height).to.be.at.most(38);
      expect(box('.num-results-color').height).to.be.at.most(22);
    }
  });

  for (const columns of [1, 2, 4]) for (const width of [340, 480, 640, 900, 1200]) {
    it(`keeps ${columns} data columns readable and the footer visible in a ${width}px pane`, async () => {
      draw(width, columns);
      await tick();
      const scroll = find('.griddle-body');
      const name = box('tr.standard-row > td');
      const title = box('.rs-search-title');
      expect(name.width).to.be.at.least(259);
      expect(title.width).to.be.at.least(130);
      expect(title.right).to.be.at.most(name.right);
      expect(getComputedStyle(find('.rs-search-drag')).display === 'none').to.equal(width <= 640);
      expect(box('.rs-search-actions').right).to.be.at.most(box('tr.standard-row > td:last-child').right);
      const pager = box('.table-pagination');
      const count = box('.semantic-search-num-results');
      expect(pager.top).to.be.at.least(scroll.getBoundingClientRect().bottom - 1);
      expect(pager.bottom).to.be.at.most(box('.search-results-area').bottom);
      expect(count.bottom).to.be.at.most(scroll.getBoundingClientRect().top);
      expect(count.right).to.equal(box('.search-results-summary').right);
      for (const link of Array.from(host.querySelectorAll<HTMLElement>('.pagination a'))) {
        if (!link.getClientRects().length) continue;
        expect(link.getBoundingClientRect().right).to.be.at.most(pager.right + 1);
      }
      scroll.scrollLeft = 150;
      scroll.scrollTop = 200;
      await tick();
      const headers = host.querySelectorAll('.griddle-body thead tr > *');
      const cells = host.querySelectorAll('tr.standard-row:first-child > td');
      Array.from(headers).forEach((header, i) => {
        expect(Math.abs(header.getBoundingClientRect().left - cells[i].getBoundingClientRect().left)).to.be.lessThan(1);
        expect(Math.abs(header.getBoundingClientRect().width - cells[i].getBoundingClientRect().width)).to.be.lessThan(1);
      });
      expect(box('.griddle-body > div > table').top).to.equal(scroll.getBoundingClientRect().top);
      expect(box('.table-pagination').left).to.equal(pager.left);
      expect(box('.table-pagination').top).to.equal(pager.top);
      expect(box('.semantic-search-num-results').left).to.equal(count.left);
      expect(box('.semantic-search-num-results').top).to.equal(count.top);
    });
  }

  it('changes pages from the separate pager and keeps the count visible', async () => {
    draw(); await tick();
    find('[aria-label="Next page"]').click(); await tick();
    expect(find('.rs-search-title').textContent).to.contain('Sample 031');
    expect(find('[aria-current="page"]').textContent).to.equal('2');
    find('[aria-label="Previous page"]').click(); await tick();
    expect(find('.rs-search-title').textContent).to.contain('Sample 001');
    expect(find('.num-results .sr-only').textContent).to.equal('Found 420 results');
  });

  it('does not leave a blank pager when all rows fit on one page', async () => {
    draw(340, 2, 1); await tick();
    expect(box('.table-pagination').height).to.equal(0);
    expect(host.querySelectorAll('.pagination').length).to.equal(0);
  });

  it('floats menus outside the scrollport, supports keyboard navigation, and closes on selection', async () => {
    draw(); await tick();
    const scroll = find('.griddle-body');
    scroll.scrollLeft = scroll.scrollWidth;
    await tick();
    const left = scroll.scrollLeft;
    find('.dropdown-toggle').click(); await tick();
    const menu = find('.resource-actions__dropdown-menu');
    expect(menu.matches(':popover-open')).to.equal(true);
    expect(scroll.scrollLeft).to.equal(left);
    const bounds = menu.getBoundingClientRect();
    expect(bounds.left).to.be.at.least(8);
    expect(bounds.right).to.be.at.most(document.documentElement.clientWidth - 8);
    expect(bounds.bottom).to.be.at.most(document.documentElement.clientHeight - 8);
    const items = menu.querySelectorAll<HTMLElement>('[role="menuitem"]');
    items[0].focus();
    items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).to.equal(items[1]);
    items[1].click(); await tick();
    expect(selectedAction).to.equal(1);
    expect(menu.matches(':popover-open')).to.equal(false);
  });

  it('closes a menu when its trigger scrolls out of view', async () => {
    draw(); await tick();
    const scroll = find('.griddle-body');
    scroll.scrollLeft = scroll.scrollWidth;
    await tick();
    find('.dropdown-toggle').click(); await tick();
    const menu = find('.resource-actions__dropdown-menu');
    scroll.scrollTop = 300;
    await tick();
    expect(menu.matches(':popover-open')).to.equal(false);
  });

  it('dismisses menus with Escape and an outside click', async () => {
    draw(); await tick();
    const scroll = find('.griddle-body');
    scroll.scrollLeft = scroll.scrollWidth;
    await tick();
    const toggle = find('.dropdown-toggle');
    toggle.click(); await tick();
    const menu = find('.resource-actions__dropdown-menu');
    const item = menu.querySelector<HTMLElement>('[role="menuitem"]');
    item.focus();
    item.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', keyCode: 27, bubbles: true,
    }));
    await tick();
    expect(menu.matches(':popover-open')).to.equal(false);
    expect(document.activeElement).to.equal(toggle);
    toggle.click(); await tick();
    find('.semantic-search-num-results').click(); await tick();
    expect(menu.matches(':popover-open')).to.equal(false);
  });

  it('repositions an open menu after resizing the pane and closes on horizontal scrolling', async () => {
    draw(480); await tick();
    const scroll = find('.griddle-body');
    scroll.scrollLeft = scroll.scrollWidth;
    await tick();
    find('.dropdown-toggle').click(); await tick();
    const menu = find('.resource-actions__dropdown-menu');
    find('.search-page-container').style.width = '340px';
    // Keep the actions visible as a splitter would move the pane boundary.
    scroll.scrollLeft = scroll.scrollWidth;
    await tick();
    expect(menu.matches(':popover-open')).to.equal(true);
    expect(menu.getBoundingClientRect().right).to.be.at.most(document.documentElement.clientWidth - 8);
    scroll.scrollLeft = 0;
    await tick();
    expect(menu.matches(':popover-open')).to.equal(false);
  });

  it('notifies controlled page changes and ignores disabled navigation', () => {
    const changes: number[] = [];
    render(h(Pagination, { currentPage: 0, maxPage: 3, setPage: () => {}, previous: () => {}, next: () => {},
      onPageChange: page => changes.push(page) }), host);
    find('[aria-label="Previous page"]').click();
    find('[aria-label="Next page"]').click();
    expect(changes).to.deep.equal([1]);
  });

  it('accepts a controlled page when the page count increases in the same update', () => {
    const pages: number[] = [];
    const props = { currentPage: 0, maxPage: 3, externalCurrentPage: 0, setPage: page => pages.push(page),
      previous: () => {}, next: () => {}, onPageChange: () => {} };
    render(h(Pagination, props), host);
    render(h(Pagination, { ...props, maxPage: 30, externalCurrentPage: 20 }), host);
    expect(pages).to.deep.equal([20]);
  });
});
