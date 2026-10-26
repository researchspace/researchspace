/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { createElement as h, Component } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Simulate } from 'react-dom/test-utils';
import { expect } from 'chai';
import { mockConfig } from 'platform-tests/mocks';
import { RsTabs } from 'platform/components/ui/tabs/Tabs';
import { RsTab } from 'platform/components/ui/tabs/Tab';
import 'platform/styling/main.scss';

mockConfig();

let mounts: string[] = [];
class Pane extends Component<{ name: string }> {
  componentDidMount() { mounts.push(this.props.name); }
  render() { return h('div', { className: 'pane-' + this.props.name }, this.props.name); }
}

const tick = () => new Promise(resolve => setTimeout(resolve, 30));

describe('rs-tabs badges and mount-on-enter', () => {
  let host: HTMLDivElement;
  beforeEach(() => {
    mounts = [];
    host = document.createElement('div');
    document.body.appendChild(host);
  });
  afterEach(() => { unmountComponentAtNode(host); host.remove(); });

  function draw(mountOnEnter: boolean) {
    render(h(RsTabs, { id: 'related-' + String(mountOnEnter), className: 'rs-secondary-tabs', mountOnEnter },
      h(RsTab, { eventKey: 'maps', title: 'Knowledge maps', icon: 'account_tree', badge: 3 }, h(Pane, { name: 'maps' })),
      h(RsTab, { eventKey: 'narratives', title: 'Semantic narratives', badge: '1' }, h(Pane, { name: 'narratives' })),
      h(RsTab, { eventKey: 'sets', title: 'Sets', icon: 'topic', badge: 0, muted: true }, h(Pane, { name: 'sets' }))), host);
  }

  it('renders count badges and a muted title', async () => {
    draw(false);
    await tick();
    const titles = Array.from(host.querySelectorAll<HTMLElement>('.nav-tabs > li > a'));
    expect(titles.map(t => t.querySelector('.rs-tab-title__label').textContent)).to.deep.equal([
      'Knowledge maps', 'Semantic narratives', 'Sets',
    ]);
    expect(titles.map(t => t.querySelector('.rs-tab-title__badge').textContent)).to.deep.equal(['3', '1', '0']);
    expect(titles[1].querySelector('.rs-tab-title__icon')).to.equal(null);
    expect(host.querySelectorAll('.rs-tab-title__badge').length).to.equal(3);
    expect(titles[0].querySelector('.rs-tab-title__badge').textContent).to.equal('3');
    expect(titles[2].querySelector('.rs-tab-title--muted')).to.not.equal(null);
    expect(titles[0].querySelector('.rs-tab-title--muted')).to.equal(null);
  });

  it('mounts every pane up front without mount-on-enter', async () => {
    draw(false);
    await tick();
    expect(mounts.slice().sort()).to.deep.equal(['maps', 'narratives', 'sets']);
  });

  it('mounts panes on first activation and keeps them with mount-on-enter', async () => {
    draw(true);
    await tick();
    expect(mounts).to.deep.equal(['maps']);
    const tabs = host.querySelectorAll<HTMLElement>('.nav-tabs > li > a');
    Simulate.click(tabs[1]); await tick();
    expect(mounts).to.deep.equal(['maps', 'narratives']);
    expect(host.querySelector('.pane-maps')).to.not.equal(null);        // still mounted
    Simulate.click(tabs[0]); await tick();
    expect(mounts).to.deep.equal(['maps', 'narratives']);               // no remount
    expect(host.querySelector('.pane-sets')).to.equal(null);            // never activated
  });
});
