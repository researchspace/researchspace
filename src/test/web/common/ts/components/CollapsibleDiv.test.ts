/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { createElement } from 'react';
import { expect } from 'chai';
import { mount } from 'platform-tests/configuredEnzyme';
import { CollapsibleDivComponent } from 'platform/components/ui/collapsible-div/CollapsibleDivComponent';
import { CollapsibleDivTriggerComponent } from 'platform/components/ui/collapsible-div/CollapsibleDivTriggerComponent';
import { CollapsibleDivContentComponent } from 'platform/components/ui/collapsible-div/CollapsibleDivContentComponent';

function collapsible() {
  return mount(createElement(CollapsibleDivComponent, {expanded: false},
    createElement(CollapsibleDivTriggerComponent, {},
      createElement('div', {}, 'Group', createElement('button', {type: 'button'}, 'Nested'))),
    createElement(CollapsibleDivContentComponent, {expanded: false, renderHidden: false},
      createElement('p', {className: 'collapsible-test-content'}, 'Entries'))));
}

describe('mp-collapsible-div trigger', () => {
  it('is a focusable button that reports whether it is expanded', () => {
    const wrapper = collapsible();
    const trigger = wrapper.find('.collapsible-panel-trigger').hostNodes();
    expect(trigger.prop('role')).to.equal('button');
    expect(trigger.prop('tabIndex')).to.equal(0);
    expect(trigger.prop('aria-expanded')).to.equal(false);
    trigger.simulate('click');
    expect(wrapper.find('.collapsible-panel-trigger').hostNodes().prop('aria-expanded')).to.equal(true);
    expect(wrapper.find('.collapsible-test-content')).to.have.length(1);
  });

  it('toggles with Enter and Space', () => {
    const wrapper = collapsible();
    wrapper.find('.collapsible-panel-trigger').hostNodes().simulate('keydown', {key: 'Enter'});
    expect(wrapper.find('.collapsible-test-content')).to.have.length(1);
    wrapper.find('.collapsible-panel-trigger').hostNodes().simulate('keydown', {key: ' '});
    expect(wrapper.find('.collapsible-test-content')).to.have.length(0);
  });

  it('ignores keys pressed on a nested control and other keys', () => {
    const wrapper = collapsible();
    wrapper.find('.collapsible-panel-trigger button').simulate('keydown', {key: 'Enter'});
    wrapper.find('.collapsible-panel-trigger').hostNodes().simulate('keydown', {key: 'a'});
    expect(wrapper.find('.collapsible-test-content')).to.have.length(0);
  });
});
