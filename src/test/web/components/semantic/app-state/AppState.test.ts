/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createElement } from 'react';
import * as D from 'react-dom-factories';
import { expect } from 'chai';

import { listen, trigger } from 'platform/api/events';
import { AppState } from 'platform/components/semantic/app-state/AppState';
import { ApplyState, UpdateSharedState, RegisterComponent } from 'platform/components/semantic/app-state/AppStateEvents';
import { parseStatesParam, serializeStates } from 'platform/components/semantic/app-state/AppStateUrlCodec';
import {
  SharedStateComponent,
  SharedStateProps,
  SharedStateSyncOptions,
} from 'platform/components/semantic/app-state/SharedStateComponent';

import { mount, ReactWrapper } from 'platform-tests/configuredEnzyme';

interface TestState {
  value?: string;
}

class TestComponent extends SharedStateComponent<SharedStateProps, TestState> {
  resolvedWith: boolean[] = [];
  syncOptions: SharedStateSyncOptions[] = [];

  constructor(props: SharedStateProps, context: any) {
    super(props, context);
    this.state = { value: 'default' };
  }

  protected handleSharedStateSync(state, options: SharedStateSyncOptions) {
    this.syncOptions.push(options);
    super.handleSharedStateSync(state, options);
  }

  protected onSharedStateResolved(hasStoredState: boolean) {
    this.resolvedWith.push(hasStoredState);
  }

  setValue(value: string) {
    this.setState({ value });
  }

  render() {
    return D.div({}, this.state.value);
  }
}

function setSearch(search: string) {
  window.history.replaceState(window.history.state, '', window.location.pathname + search);
}

function wait(ms = 10) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('AppState', () => {
  let wrappers: ReactWrapper<any, any>[] = [];
  const mountTracked = (element) => {
    const wrapper = mount(element);
    wrappers.push(wrapper);
    return wrapper;
  };
  const child = (wrapper: ReactWrapper<any, any>, id = 'c1') =>
    wrapper.find(TestComponent).filterWhere((w) => w.prop('id') === id).instance() as TestComponent;

  beforeEach(() => setSearch(''));
  afterEach(() => {
    wrappers.forEach((wrapper) => wrapper.unmount());
    wrappers = [];
    setSearch('');
  });

  it('restores the state of a child from the URL', () => {
    setSearch('?states=' + encodeURIComponent(serializeStates({ c1: { value: 'restored' } })));
    const wrapper = mountTracked(
      createElement(AppState, { id: 'as1' }, createElement(TestComponent, { id: 'c1', sharedStateVars: 'value' }))
    );
    const component = child(wrapper);
    expect(component.state.value).to.equal('restored');
    expect(component.resolvedWith).to.deep.equal([true]);
    expect(component.syncOptions[0].origin).to.equal('url');
  });

  it('resolves children without a stored state', () => {
    const wrapper = mountTracked(
      createElement(AppState, { id: 'as1' }, createElement(TestComponent, { id: 'c1', sharedStateVars: 'value' }))
    );
    const component = child(wrapper);
    expect(component.state.value).to.equal('default');
    expect(component.resolvedWith).to.deep.equal([false]);
  });

  it('sends only the shared variables that changed', () => {
    const updates = [];
    const subscription = listen({ eventType: UpdateSharedState }).observe({ value: (e) => updates.push(e.data) });
    const wrapper = mountTracked(
      createElement(AppState, { id: 'as1' }, createElement(TestComponent, { id: 'c1', sharedStateVars: 'value' }))
    );
    const component = child(wrapper);
    component.setValue('default');
    expect(updates).to.have.length(0);
    component.setValue('changed');
    expect(updates).to.deep.equal([{ componentId: 'c1', stateUpdates: { value: 'changed' } }]);
    subscription.unsubscribe();
  });

  it('applies states from the ApplyState event and updates the URL', async () => {
    const wrapper = mountTracked(
      createElement(
        AppState,
        { id: 'as1', autoSync: true, urlUpdateDelay: 0 },
        createElement(TestComponent, { id: 'c1', sharedStateVars: 'value' })
      )
    );
    trigger({
      eventType: ApplyState,
      source: 'test',
      targets: ['as1'],
      data: { states: { c1: { value: 'applied' } }, mode: 'replace', transition: { animate: true } },
    });
    const component = child(wrapper);
    expect(component.state.value).to.equal('applied');
    expect(component.syncOptions[0]).to.deep.equal({ mode: 'replace', origin: 'apply', transition: { animate: true } });

    await wait();
    const params = new URLSearchParams(window.location.search);
    expect(parseStatesParam(params.get('states'))).to.deep.equal({ c1: { value: 'applied' } });
  });

  it('keeps the states of other app-state components in the URL', async () => {
    setSearch('?states=' + encodeURIComponent(serializeStates({ other: { value: 'x' } })) + '&uri=keep');
    const wrapper = mountTracked(
      createElement(
        AppState,
        { id: 'as1', autoSync: true, urlUpdateDelay: 0 },
        createElement(TestComponent, { id: 'c1', sharedStateVars: 'value' })
      )
    );
    child(wrapper).setValue('changed');
    await wait();
    const params = new URLSearchParams(window.location.search);
    expect(params.get('uri')).to.equal('keep');
    expect(parseStatesParam(params.get('states'))).to.deep.equal({ other: { value: 'x' }, c1: { value: 'changed' } });
  });

  it('delivers states applied before a component mounts', () => {
    mountTracked(createElement(AppState, { id: 'as1' }, D.div({})));
    trigger({ eventType: ApplyState, source: 'test', targets: ['as1'], data: { states: { late: { value: 'early' } } } });
    // a component outside the app-state tree refers to it with app-state-id
    const wrapper = mountTracked(createElement(TestComponent, { id: 'late', sharedStateVars: 'value', appStateId: 'as1' }));
    const component = wrapper.instance() as TestComponent;
    expect(component.state.value).to.equal('early');
    expect(component.resolvedWith).to.deep.equal([true]);
  });

  it('ignores components outside an app-state', () => {
    const registrations = [];
    const subscription = listen({ eventType: RegisterComponent }).observe({ value: (e) => registrations.push(e) });
    const wrapper = mountTracked(createElement(TestComponent, { id: 'alone', sharedStateVars: 'value' }));
    expect(registrations).to.have.length(0);
    expect((wrapper.instance() as TestComponent).resolvedWith).to.deep.equal([false]);
    subscription.unsubscribe();
  });

  it('ignores undeclared variables', () => {
    const wrapper = mountTracked(
      createElement(AppState, { id: 'as1' }, createElement(TestComponent, { id: 'c1', sharedStateVars: 'other' }))
    );
    trigger({ eventType: ApplyState, source: 'test', targets: ['as1'], data: { states: { c1: { value: 'no' } } } });
    expect(child(wrapper).state.value).to.equal('default');
  });
});
