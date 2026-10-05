/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { createElement } from 'react';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as Kefir from 'kefir';
import * as Handlebars from 'handlebars';
import { mount } from 'platform-tests/configuredEnzyme';
import { mockConfig } from 'platform-tests/mocks';
import { DashboardComponent } from 'platform/components/dashboard/DashboardComponent';
import { ResourceLinkContainer } from 'platform/api/navigation/components/ResourceLinkContainer';
import * as Navigation from 'platform/api/navigation';
import { ConfigHolder } from 'platform/api/services/config-holder';
import * as Labels from 'platform/api/services/resource-label';
import { Rdf } from 'platform/api/rdf';

const source = require('!!raw-loader!../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FResourceViewButton.html').default;
const framesSource = require('!!raw-loader!../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FThinkingFrames.html').default;
const iri = 'https://example.org/entity/one';
const resourceConfiguration = 'https://example.org/config/person';
const dashboardIri = Rdf.iri('http://www.researchspace.org/resource/ThinkingFrames');
const customTemplate = 'https://example.org/templates/person';
mockConfig();

function viewAction(resourceVisualisationTemplateIRI?: string, configuration = resourceConfiguration) {
  const fragment = document.createElement('div');
  const engine = Handlebars.create();
  engine.registerHelper('eq', (left, right) => left === right);
  fragment.innerHTML = engine.compile(source)({
    iri, resourceConfiguration: configuration, resourceVisualisationTemplateIRI, viewId: 'editor-frame',
  });
  const link = fragment.querySelector('semantic-link-container');
  expect(link, 'View must provide navigation outside the dashboard').not.to.equal(null);
  const props = {uri: link.getAttribute('uri')};
  Array.from(link.attributes).filter(attr => attr.name.startsWith('urlqueryparam-'))
    .forEach(attr => props[attr.name] = attr.value);
  return props;
}

// This initial-view fragment uses only standard Handlebars conditionals and
// urlParam. Exercise its branches without needing the Java template server.
function initialView(params: {[key: string]: string} = {}, context = {}) {
  const fragment = framesSource.slice(framesSource.indexOf('[[#if (urlParam "view")]]'),
    framesSource.indexOf("views='["));
  const engine = Handlebars.create();
  engine.registerHelper('urlParam', (name: string) => params[name] || '');
  // Protect literal JSON braces from becoming triple-brace Handlebars syntax.
  // The HTML parser below decodes these entities when reading the attribute.
  const clientFragment = fragment.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;')
    .replace(/\[\[/g, '{{').replace(/\]\]/g, '}}');
  const rendered = engine.compile(clientFragment)(context);
  expect((rendered.match(/initial-view=/g) || []).length).to.be.at.most(1);
  const element = document.createElement('div');
  element.innerHTML = `<rs-dashboard ${rendered}></rs-dashboard>`;
  const initialViewJson = element.firstElementChild.getAttribute('initial-view');
  return initialViewJson === null ? undefined : JSON.parse(initialViewJson);
}

async function waitFor(check: () => boolean) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (check()) { return; }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('Dashboard did not render the requested view');
}

describe('Resource view navigation', () => {
  let label: sinon.SinonStub;
  beforeEach(() => {
    label = sinon.stub(Labels, 'getLabel').callsFake(() => Kefir.constant('Example entity'));
  });
  afterEach(() => {
    label.restore();
    Navigation.setFrameNavigation(false);
  });

  it('opens the same entity with its configuration in the default resource view', () => {
    expect(viewAction().uri).to.equal(dashboardIri.value);
    expect(Navigation.NavigationUtils.extractParams(viewAction())).to.deep.equal({
      view: 'resource', resource: iri, resourceConfig: resourceConfiguration,
      resourceVisualisationTemplate: '',
    });
  });

  it('uses the configured resource visualisation when available', () => {
    expect(Navigation.NavigationUtils.extractParams(viewAction(customTemplate))).to.deep.equal({
      view: 'resource-detailed-visualisation', resource: iri,
      resourceConfig: resourceConfiguration, resourceVisualisationTemplate: customTemplate,
    });
  });

  it('retains the create-form defaults and URL label when initialising a frame', () => {
    expect(initialView({view: 'resource-editor', entityTypeConfig: resourceConfiguration,
      customLabel: 'New person'})).to.deep.equal({
      view: 'resource-editor', resource: '', data: {
        resourceConfig: '', resourceVisualisationTemplate: '', entityTypeConfig: resourceConfiguration,
        mode: 'new', customLabel: 'New person',
      },
    });
    expect(initialView({view: 'resource-editor', entityTypeConfig: resourceConfiguration,
      mode: 'edit'}).data.mode).to.equal('edit');
  });

  it('leaves the dashboard default unchanged when no initial view is supplied', () => {
    expect(initialView()).to.equal(undefined);
  });

  it('uses the context view when no URL view is supplied', () => {
    expect(initialView({}, {view: 'resource', resource: iri})).to.deep.equal({view: 'resource', resource: iri});
  });

  it('emits one initial view and prefers the URL view over the context view', () => {
    expect(initialView({view: 'resource', resource: iri, resourceConfig: resourceConfiguration},
      {view: 'resource-editor', resource: 'https://example.org/entity/two'})).to.deep.equal({
      view: 'resource', resource: iri,
      data: {resourceConfig: resourceConfiguration, resourceVisualisationTemplate: ''},
    });
  });

  [
    {template: undefined, configuration: resourceConfiguration, view: 'resource'},
    {template: customTemplate, configuration: resourceConfiguration, view: 'resource-detailed-visualisation'},
    {template: customTemplate,
      configuration: 'http://www.researchspace.org/resource/system/resource_configurations_container/data/Authority_document',
      view: 'authority-list'},
  ].forEach(({template, configuration: resourceConfiguration, view}) => {

    it(`opens the ${view} frame from a standalone editor`, async () => {
      const environment = ConfigHolder.getEnvironmentConfig();
      (ConfigHolder.getEnvironmentConfig as sinon.SinonStub).returns({
        resourceUrlMapping: {value: '/resource/'},
      });
      const browserUrl = window.location.href;
      const browserState = window.history.state;
      const previousResource = Navigation.getCurrentResource();
      Navigation.setFrameNavigation(false);
      let requested;
      const unsubscribe = Navigation.listen({eventType: 'NAVIGATED', callback: () => {
        requested = initialView(Navigation.getCurrentUrl().search(true));
      }});
      const action = mount(createElement(ResourceLinkContainer as any, viewAction(template, resourceConfiguration),
        createElement('button', {type: 'button'}, 'View')));
      let dashboard;
      try {
        action.find('button').simulate('click', {button: 0});
        await waitFor(() => Boolean(requested));
        expect(new URL(window.location.href).searchParams.get('uri')).to.equal(dashboardIri.value);
        expect(requested).to.deep.equal({view, resource: iri, data: {
          resourceConfig: resourceConfiguration, resourceVisualisationTemplate: template || '',
        }});
        dashboard = mount(createElement(DashboardComponent, {
          id: 'thinking-frames', dashboardIri, initialView: requested,
          views: [{id: view, label: 'Resource view', template:
            '<p data-resource-view="true">{{iri}}|{{data.resourceConfig}}|{{data.resourceVisualisationTemplate}}</p>'}],
        }));
        await waitFor(() => {
          dashboard.update();
          return dashboard.find('[data-resource-view]').length === 1;
        });
        expect(dashboard.find('[data-resource-view]').text()).to.equal(
          `${iri}|${resourceConfiguration}|${template || ''}`);
      } finally {
        if (dashboard) { dashboard.unmount(); }
        action.unmount();
        unsubscribe();
        (ConfigHolder.getEnvironmentConfig as sinon.SinonStub).returns(environment);
        window.history.replaceState(browserState, '', browserUrl);
        Navigation.init().onValue(() => {});
        Navigation.__unsafe__setCurrentResource(previousResource);
      }
    });

    it(`retains unsaved input when View and Edit reactivate existing ${view} frames`, async () => {
      const host = document.createElement('div');
      host.style.cssText = 'position:relative;width:1000px;height:700px';
      document.body.appendChild(host);
      const dashboard = mount(createElement(DashboardComponent, {
        id: 'thinking-frames', dashboardIri,
        initialView: {view: 'resource-editor', resource: iri, data: {}},
        views: [
          {id: 'resource-editor', label: 'Edit', template: '<input aria-label="Entity label" default-value="Original" />'},
          {id: view, label: 'Resource view', template: '<p data-resource-view="true">{{iri}}</p>'},
        ],
      }), {attachTo: host});
      let action;
      try {
        await waitFor(() => Boolean(host.querySelector('input')));
        const input = host.querySelector('input');
        input.value = 'Unsaved new label';
        action = mount(createElement(ResourceLinkContainer as any, viewAction(template, resourceConfiguration), createElement('button', {type: 'button'}, 'View')));
        action.find('button').simulate('click', {button: 0});
        await waitFor(() => Boolean(host.querySelector('[data-resource-view]')));
        expect(host.querySelector('[data-resource-view]').textContent).to.equal(iri);
        expect(host.contains(input)).to.equal(true);
        expect(dashboard.state('layout').getActiveTabset().getSelectedNode().getId()).to.equal(iri + view);
        action.find('button').simulate('click', {button: 0});
        action.setProps({'urlqueryparam-view': 'resource-editor'});
        action.find('button').simulate('click', {button: 0});
        await waitFor(() => dashboard.state('layout').getActiveTabset().getSelectedNode().getId() === iri + 'resource-editor');
        expect(dashboard.state('items')).to.have.length(2);
        expect(host.querySelector('input')).to.equal(input);
        expect(input.value).to.equal('Unsaved new label');
      } finally {
        if (action) { action.unmount(); }
        dashboard.unmount();
        host.remove();
      }
    });
  });
});
