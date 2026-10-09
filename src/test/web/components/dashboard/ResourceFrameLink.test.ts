/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */

import { createElement } from 'react';
import { mount } from 'platform-tests/configuredEnzyme';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as Kefir from 'kefir';
import * as Handlebars from 'handlebars';
import * as uri from 'urijs';

import * as Events from 'platform/api/events';
import * as Navigation from 'platform/api/navigation/Navigation';
import { Rdf } from 'platform/api/rdf';
import { ResourceLink } from 'platform/api/navigation/components/ResourceLink';
import { Draggable } from 'platform/components/dnd/DraggableComponent';
import * as ResourceConfig from 'platform/api/services/resource-config';
import { ResourceFrameLink } from 'platform/components/dashboard/ResourceFrameLink';
import { ResourceViewLink } from 'platform/components/dashboard/ResourceViewLink';
import { ConfigHolder } from 'platform/api/services/config-holder';
import { mockConfig } from 'platform-tests/mocks';
import { mockResourceViewServices } from 'platform-tests/mocks/ResourceViewServices';

mockConfig();

const source = require('!!raw-loader!../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FResourceFieldValueFramesVisualization.html').default;
const noFramesSource = require('!!raw-loader!../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FResourceFieldValueNoFramesVisualization.html').default;
const iri = 'https://example.org/actor/one';
const config = 'https://example.org/config/actor';
const visualisation = 'https://example.org/templates/actor';
const fallback = 'http://www.researchspace.org/resource/ResourceTemplate';
const authorityConfig = 'http://www.researchspace.org/resource/system/resource_configurations_container/data/Authority_document';
const authorityPage = 'http://www.researchspace.org/resource/AuthorityDocumentPage';

function deferred<T>() {
  let resolve: (value: T) => void;
  let reject: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function settle() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

describe('ResourceFrameLink', () => {
  let resolveConfig: sinon.SinonStub;
  let trigger: sinon.SinonSpy;
  let navigate: sinon.SinonStub;
  let dashboard: sinon.SinonStub;
  let restoreServices: () => void;
  let events: Kefir.Subscription;
  let wrapper;

  function render(props = {}, repository?: string) {
    wrapper = mount(createElement(ResourceFrameLink, { iri, target: 'test-frames', ...props },
      createElement('span', {}, 'Linked actor')), {
      context: { semanticContext: { repository } },
    });
    return wrapper;
  }

  beforeEach(async () => {
    resolveConfig = sinon.stub().returns(Promise.resolve(config));
    restoreServices = await mockResourceViewServices([config, authorityConfig], visualisation, resolveConfig);
    trigger = sinon.spy();
    events = Events.listen({ eventType: 'Dashboard.AddFrame' }).observe({ value: trigger });
    navigate = sinon.stub().returns(true);
    Navigation.setFrameNavigation(true, navigate);
    dashboard = sinon.stub(ConfigHolder, 'getDashboard').returns(Rdf.iri('https://example.org/ResearchDashboard'));
  });

  afterEach(() => {
    if (wrapper) { wrapper.unmount(); wrapper = undefined; }
    restoreServices();
    events.unsubscribe();
    Navigation.setFrameNavigation(false);
    dashboard.restore();
  });

  it('does not resolve configurations during rendering', () => {
    render();
    expect(resolveConfig.called).to.equal(false);
    expect(wrapper.find('button').prop('type')).to.equal('button');
    expect(wrapper.text()).to.equal('Linked actor');
  });

  it('resolves the linked IRI in the active repository before opening its configured view', async () => {
    const result = deferred<string>();
    resolveConfig.returns(result.promise);
    render({ id: 'actor-link', target: 'research-frames' }, 'assets');
    const event = { preventDefault: sinon.spy(), stopPropagation: sinon.spy() };
    wrapper.find('button').simulate('click', event);
    expect(event.preventDefault.calledOnce).to.equal(true);
    expect(event.stopPropagation.calledOnce).to.equal(true);
    expect(resolveConfig.firstCall.args[0].value).to.equal(iri);
    expect(resolveConfig.firstCall.args[1]).to.equal('assets');
    expect(trigger.called).to.equal(false);
    expect(wrapper.find('button').prop('disabled')).to.equal(true);

    result.resolve(config);
    await settle();
    expect(trigger.calledOnce).to.equal(true);
    expect(trigger.firstCall.args[0]).to.deep.equal({
      eventType: 'Dashboard.AddFrame', source: 'actor-link', targets: ['research-frames'],
      data: { viewId: 'resource-detailed-visualisation', resourceIri: iri,
        resourceConfig: config, resourceVisualisationTemplate: visualisation },
    });
    wrapper.update();
    expect(wrapper.find('button').prop('disabled')).to.equal(false);
  });

  it('uses the configured dashboard and the generic fallback when no template is configured', async () => {
    delete ResourceConfig.resourceConfigs[config].resourceVisualisationTemplateIRI;
    render({ target: undefined });
    wrapper.find('button').simulate('click');
    await settle();
    expect(resolveConfig.firstCall.args[1]).to.equal('default');
    expect(trigger.called).to.equal(false);
    expect(navigate.calledOnce).to.equal(true);
    expect(navigate.firstCall.args[0].value).to.equal('https://example.org/ResearchDashboard');
    expect(navigate.firstCall.args[1]).to.deep.equal({
      view: 'resource-detailed-visualisation', resource: iri,
      resourceConfig: config, resourceVisualisationTemplate: fallback,
    });
    expect(navigate.firstCall.args[2]).to.equal('default');
  });

  it('passes the configured visualisation and active repository to the configured dashboard', async () => {
    render({ target: undefined }, 'assets');
    wrapper.find('button').simulate('click');
    await settle();
    expect(navigate.firstCall.args[0].value).to.equal('https://example.org/ResearchDashboard');
    expect(navigate.firstCall.args[1].resourceVisualisationTemplate).to.equal(visualisation);
    expect(navigate.firstCall.args[2]).to.equal('assets');
    expect(trigger.called).to.equal(false);
  });

  it('routes authorities through the configured dashboard when no event target is supplied', async () => {
    resolveConfig.returns(Promise.resolve(authorityConfig));
    render({ target: undefined });
    wrapper.find('button').simulate('click');
    await settle();
    expect(navigate.firstCall.args[0].value).to.equal('https://example.org/ResearchDashboard');
    expect(navigate.firstCall.args[1].view).to.equal('authority-list');
    expect(navigate.firstCall.args[1].resource).to.equal(iri);
  });

  it('opens an authority document in the authority-list frame with the document IRI', async () => {
    resolveConfig.returns(Promise.resolve(authorityConfig));
    render();
    wrapper.find('button').simulate('click');
    await settle();
    expect(trigger.calledOnce).to.equal(true);
    const event = trigger.firstCall.args[0];
    expect(event.data.viewId).to.equal('authority-list');
    expect(event.data.resourceIri).to.equal(iri);
    expect(event.data.resourceConfig).to.equal(authorityConfig);
    expect(event.data.resourceVisualisationTemplate).to.equal(visualisation);
  });

  it('ignores repeated clicks while a lookup is pending', async () => {
    const result = deferred<string>();
    resolveConfig.returns(result.promise);
    render();
    wrapper.find('button').simulate('click');
    wrapper.find('button').simulate('click');
    expect(resolveConfig.calledOnce).to.equal(true);
    result.resolve(config);
    await settle();
    expect(trigger.calledOnce).to.equal(true);
  });

  it('shows a lookup failure without navigating and allows retry', async () => {
    resolveConfig.callsFake(() => Promise.reject(new Error('Lookup failed')));
    render();
    wrapper.find('button').simulate('click');
    await settle();
    wrapper.update();
    expect(trigger.called).to.equal(false);
    expect(wrapper.find('[role="alert"]').text()).to.contain('Please try again');
    expect(wrapper.find('button').prop('disabled')).to.equal(false);
    resolveConfig.callsFake(() => Promise.resolve(config));
    wrapper.find('button').simulate('click');
    await settle();
    wrapper.update();
    expect(wrapper.find('[role="alert"]').length).to.equal(0);
    expect(trigger.calledOnce).to.equal(true);
  });

  it('does not navigate after unmounting', async () => {
    const result = deferred<string>();
    resolveConfig.returns(result.promise);
    render();
    wrapper.find('button').simulate('click');
    wrapper.unmount();
    wrapper = undefined;
    result.resolve(config);
    await settle();
    expect(trigger.called).to.equal(false);
  });

  ['iri', 'repository', 'target'].forEach(changed => {
    it(`discards stale results when the ${changed} changes, without disrupting a newer lookup`, async () => {
      const oldResult = deferred<string>();
      const newResult = deferred<string>();
      resolveConfig.onFirstCall().returns(oldResult.promise);
      resolveConfig.onSecondCall().returns(newResult.promise);
      render();
      wrapper.find('button').simulate('click');
      if (changed === 'repository') {
        wrapper.setContext({ semanticContext: { repository: 'assets' } });
      } else {
        wrapper.setProps({ [changed]: changed === 'iri' ? 'https://example.org/actor/two' : 'other-frames' });
      }
      wrapper.update();
      expect(wrapper.find('button').prop('disabled')).to.equal(false);
      wrapper.find('button').simulate('click');
      oldResult.resolve('https://example.org/config/stale');
      await settle();
      wrapper.update();
      expect(trigger.called).to.equal(false);
      expect(wrapper.find('button').prop('disabled')).to.equal(true);
      newResult.resolve(config);
      await settle();
      expect(trigger.calledOnce).to.equal(true);
      expect(trigger.firstCall.args[0].data.resourceConfig).to.equal(config);
      expect(trigger.firstCall.args[0].data.resourceIri).to.equal(wrapper.prop('iri'));
    });
  });
});

describe('ResourceViewLink page navigation', () => {
  let wrapper;
  let resolveConfig: sinon.SinonStub;
  let navigate: sinon.SinonStub;
  let navigateUrl: sinon.SinonSpy;
  let trigger: sinon.SinonSpy;
  let restoreServices: () => void;
  let events: Kefir.Subscription;
  let unsubscribeNavigation: () => void;
  let environment;
  let previousResource: Rdf.Iri;
  let previousUrl: uri.URI;
  function render(props = {}) {
    wrapper = mount(createElement(ResourceViewLink, { iri, navigation: 'page', ...props },
      createElement('span', {}, 'Linked actor')), {
      context: { semanticContext: { repository: 'assets' } },
    });
  }
  beforeEach(async () => {
    resolveConfig = sinon.stub().returns(Promise.resolve(config));
    restoreServices = await mockResourceViewServices([config, authorityConfig], visualisation, resolveConfig);
    environment = ConfigHolder.getEnvironmentConfig();
    (ConfigHolder.getEnvironmentConfig as sinon.SinonStub).returns({ resourceUrlMapping: { value: '/resource/' } });
    previousResource = Navigation.getCurrentResource();
    previousUrl = Navigation.getCurrentUrl();
    Navigation.init({ pathname: '/resource/', search: '?uri=https%3A%2F%2Fexample.org%2Fother', hash: '' } as any)
      .onValue(() => {});
    navigate = sinon.stub().returns(true);
    Navigation.setFrameNavigation(true, navigate);
    // Observe standalone navigation through the public confirmation API and
    // cancel the history change so tests cannot leave the Karma runner page.
    navigateUrl = sinon.spy();
    unsubscribeNavigation = Navigation.listen({ eventType: 'BEFORE_NAVIGATE', callback: (event, proceed) => {
      navigateUrl(event.url);
      proceed(false);
    } });
    trigger = sinon.spy();
    events = Events.listen({ eventType: 'Dashboard.AddFrame' }).observe({ value: trigger });
  });
  afterEach(() => {
    if (wrapper) { wrapper.unmount(); wrapper = undefined; }
    unsubscribeNavigation();
    events.unsubscribe();
    Navigation.setFrameNavigation(false);
    Navigation.init({ pathname: previousUrl.path(), search: previousUrl.search(), hash: previousUrl.hash() } as any)
      .onValue(() => {});
    Navigation.__unsafe__setCurrentResource(previousResource);
    (ConfigHolder.getEnvironmentConfig as sinon.SinonStub).returns(environment);
    restoreServices();
  });

  it('resolves on mount and builds a real semantic link with the complete destination', async () => {
    const result = deferred<string>();
    resolveConfig.returns(result.promise);
    render();
    expect(wrapper.find('a').length).to.equal(0);
    expect(wrapper.text()).to.equal('Linked actor');
    expect(resolveConfig.firstCall.args[0].value).to.equal(iri);
    expect(resolveConfig.firstCall.args[1]).to.equal('assets');
    result.resolve(config);
    await settle();
    wrapper.update();
    const params = uri(wrapper.find('a').prop('href')).search(true);
    expect(params).to.deep.equal({
      uri: iri, repository: 'assets', resourceView: 'page',
      resourceConfig: config, resourceVisualisationTemplate: visualisation,
    });
    expect(wrapper.find(Draggable).prop('iri')).to.equal(iri);
    const drag = document.createEvent('Event');
    drag.initEvent('dragstart', true, true);
    const setData = sinon.spy();
    Object.defineProperty(drag, 'dataTransfer', { value: { setData } });
    wrapper.find(Draggable).getDOMNode().dispatchEvent(drag);
    expect(setData.callCount).to.equal(2);
    expect(setData.getCalls().every(call => call.args[1] === iri)).to.equal(true);
    wrapper.find('a').simulate('click', { button: 0 });
    expect(navigate.called).to.equal(false);
    expect(navigateUrl.calledOnce).to.equal(true);
    const requested = navigateUrl.firstCall.args[0].search(true);
    expect(requested.uri).to.equal(iri);
    expect(requested.resourceVisualisationTemplate).to.equal(visualisation);
    expect(requested.repository).to.equal('assets');
    expect(trigger.called).to.equal(false);
    wrapper.setProps({ className: 'updated-link' });
    expect(resolveConfig.calledOnce).to.equal(true);
  });

  it('retains the generic fallback and permits disabling resource dragging', async () => {
    delete ResourceConfig.resourceConfigs[config].resourceVisualisationTemplateIRI;
    render({ draggable: false });
    await settle();
    wrapper.update();
    expect(uri(wrapper.find('a').prop('href')).search(true).resourceVisualisationTemplate).to.equal(fallback);
    expect(wrapper.find(Draggable).length).to.equal(0);
  });

  it('preserves frame-aware navigation for semantic links without the new opt-out', () => {
    wrapper = mount(createElement(ResourceLink, { resource: Rdf.iri(iri),
      repository: 'assets', draggable: false }, 'Ordinary link'));
    wrapper.find('a').simulate('click', { button: 0 });
    expect(navigate.calledOnce).to.equal(true);
    expect(navigateUrl.called).to.equal(false);
  });

  [ { ctrlKey: true, button: 0 }, { metaKey: true, button: 0 }, { button: 1 } ].forEach(modifiers => {
    it(`preserves native modified-click behavior: ${JSON.stringify(modifiers)}`, async () => {
      render();
      await settle();
      wrapper.update();
      const preventDefault = sinon.spy();
      wrapper.find('a').simulate('click', { ...modifiers, preventDefault });
      expect(preventDefault.called).to.equal(false);
      expect(navigate.called).to.equal(false);
      expect(navigateUrl.called).to.equal(false);
      expect(wrapper.find('a').prop('href')).to.contain('resourceVisualisationTemplate=');
    });
  });

  it('supports a native _blank target', async () => {
    render({ linkTarget: '_blank' });
    await settle();
    wrapper.update();
    const preventDefault = sinon.spy();
    wrapper.find('a').simulate('click', { button: 0, preventDefault });
    expect(wrapper.find('a').prop('target')).to.equal('_blank');
    expect(preventDefault.called).to.equal(false);
    expect(navigate.called).to.equal(false);
    expect(navigateUrl.called).to.equal(false);
  });

  it('offers retry without exposing an incorrect URL after a lookup failure', async () => {
    resolveConfig.callsFake(() => Promise.reject(new Error('Lookup failed')));
    render();
    await settle();
    wrapper.update();
    expect(wrapper.find('a').length).to.equal(0);
    expect(wrapper.find('[role="alert"]').text()).to.contain('Retry');
    resolveConfig.callsFake(() => Promise.resolve(config));
    wrapper.find('button').simulate('click');
    await settle();
    wrapper.update();
    expect(wrapper.find('a').length).to.equal(1);
    expect(wrapper.find('[role="alert"]').length).to.equal(0);
  });

  it('removes the old URL immediately and resolves again when the resource changes', async () => {
    render();
    await settle();
    wrapper.update();
    const result = deferred<string>();
    resolveConfig.returns(result.promise);
    const nextIri = 'https://example.org/actor/two';
    wrapper.setProps({ iri: nextIri });
    wrapper.update();
    expect(wrapper.find('a').length).to.equal(0);
    expect(resolveConfig.secondCall.args[0].value).to.equal(nextIri);
    result.resolve(config);
    await settle();
    wrapper.update();
    expect(uri(wrapper.find('a').prop('href')).search(true).uri).to.equal(nextIri);
    expect(wrapper.find(Draggable).prop('iri')).to.equal(nextIri);
  });

  it('discards a pending page lookup when switched to frame navigation', async () => {
    const result = deferred<string>();
    resolveConfig.returns(result.promise);
    render();
    wrapper.setProps({ navigation: 'frame', target: 'test-frames' });
    result.resolve(config);
    await settle();
    wrapper.update();
    expect(wrapper.find('a').length).to.equal(0);
    expect(wrapper.find('button').prop('disabled')).to.equal(false);
    expect(trigger.called).to.equal(false);
    wrapper.find('button').simulate('click');
    await settle();
    expect(trigger.calledOnce).to.equal(true);
  });

  it('links authorities to their standalone content view, without dashboard parameters', async () => {
    resolveConfig.returns(Promise.resolve(authorityConfig));
    delete ResourceConfig.resourceConfigs[authorityConfig].resourceVisualisationTemplateIRI;
    render();
    await settle();
    wrapper.update();
    const params = uri(wrapper.find('a').prop('href')).search(true);
    expect(params.uri).to.equal(iri);
    expect(params.resourceVisualisationTemplate).to.equal(authorityPage);
    expect(params.resourceConfig).to.equal(authorityConfig);
    expect(params.view).to.equal(undefined);
    expect(params.resourceView).to.equal('page');
    expect(trigger.called).to.equal(false);
  });

  it('prefers an authority configuration\'s visualisation over the built-in standalone fallback', async () => {
    resolveConfig.returns(Promise.resolve(authorityConfig));
    render();
    await settle();
    wrapper.update();
    const params = uri(wrapper.find('a').prop('href')).search(true);
    expect(params.uri).to.equal(iri);
    expect(params.resourceVisualisationTemplate).to.equal(visualisation);
    expect(trigger.called).to.equal(false);
    expect(navigate.called).to.equal(false);
  });
});

[
  { name: 'ResourceFieldValueFramesVisualization', template: source, navigation: 'frame' },
  { name: 'ResourceFieldValueNoFramesVisualization', template: noFramesSource, navigation: 'page' },
].forEach(({ name, template, navigation }) => describe(name, () => {
  function renderValue(datatype: string, node: object) {
    const engine = Handlebars.create();
    engine.registerHelper('ifCond', function (left, operator, right, options) {
      expect(operator).to.equal('==');
      return left === right ? options.fn(this) : options.inverse(this);
    });
    const fragment = document.createElement('div');
    fragment.innerHTML = engine.compile(template)({
      field: { xsdDatatype: { value: 'http://www.w3.org/2001/XMLSchema#' + datatype } },
      value: { value: node },
      // Parent-resource metadata must not determine a field value's view.
      resourceConfig: 'https://example.org/config/painting',
      resourceTemplate: 'https://example.org/templates/painting',
    });
    return fragment;
  }

  it('passes the linked resource IRI and navigation mode without parent view metadata', () => {
    const fragment = renderValue('anyURI', { value: iri });
    const link = fragment.querySelector('rs-resource-view-link');
    expect(link.getAttribute('iri')).to.equal(iri);
    expect(link.getAttribute('navigation')).to.equal(navigation);
    if (navigation === 'frame') {
      expect(link.getAttribute('target')).to.equal(null);
      expect(link.attributes.length).to.equal(2);
    } else {
      expect(link.getAttribute('draggable')).to.equal('true');
      expect(link.attributes.length).to.equal(3);
    }
    expect(fragment.querySelector('mp-event-trigger')).to.equal(null);
  });

  [
    { type: 'string', node: { value: 'Example' } },
    { type: 'langString', node: { value: 'Example', language: 'en' } },
    { type: 'dateTime', node: { value: '2026-10-09T12:00:00Z' } },
    { type: 'anyURI', node: { value: iri, datatype: { value: 'http://www.w3.org/2001/XMLSchema#anyURI' } } },
  ].forEach(({ type, node }) => {
    it(`preserves ${type} literal rendering without creating a resource link`, () => {
      const fragment = renderValue(type, node);
      expect(fragment.querySelector('rs-resource-view-link')).to.equal(null);
      expect(fragment.textContent).to.contain(node.value);
    });
  });
}));
