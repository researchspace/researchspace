/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { createElement } from 'react';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as Kefir from 'kefir';
import * as Handlebars from 'handlebars';
import { mount } from 'platform-tests/configuredEnzyme';
import { mockConfig } from 'platform-tests/mocks';
import { DashboardComponent } from 'platform/components/dashboard/DashboardComponent';
import { EventTrigger } from 'platform/components/events/EventTrigger';
import * as Labels from 'platform/api/services/resource-label';
import { Rdf } from 'platform/api/rdf';

const source = require('!!raw-loader!../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FResourceViewButton.html').default;
const iri = 'https://example.org/entity/one';
const resourceConfiguration = 'https://example.org/config/person';
mockConfig();

function viewAction(resourceVisualisationTemplateIRI?: string) {
  const fragment = document.createElement('div');
  fragment.innerHTML = Handlebars.compile(source)({
    iri, resourceConfiguration, resourceVisualisationTemplateIRI, viewId: 'editor-frame',
  });
  const trigger = fragment.querySelector('mp-event-trigger');
  return {
    id: trigger.getAttribute('id'), type: trigger.getAttribute('type'),
    targets: JSON.parse(trigger.getAttribute('targets')),
    data: JSON.parse(trigger.getAttribute('data')),
  };
}

async function waitFor(check: () => boolean) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (check()) { return; }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('Dashboard did not render the requested view');
}

describe('Resource view navigation', () => {
  it('opens the same entity with its configuration in the default resource view', () => {
    expect(viewAction().data).to.deep.equal({viewId: 'resource', resourceIri: iri, resourceConfig: resourceConfiguration});
  });

  it('uses the configured resource visualisation when available', () => {
    const template = 'https://example.org/templates/person';
    expect(viewAction(template).data).to.deep.equal({
      viewId: 'resource-detailed-visualisation', resourceIri: iri,
      resourceConfig: resourceConfiguration, resourceVisualisationTemplate: template,
    });
  });

  it('retains unsaved input when View resource and Edit reactivate existing frames', async () => {
    const label = sinon.stub(Labels, 'getLabel').callsFake(() => Kefir.constant('Example entity'));
    const host = document.createElement('div');
    host.style.cssText = 'position:relative;width:1000px;height:700px';
    document.body.appendChild(host);
    const dashboard = mount(createElement(DashboardComponent, {
      id: 'thinking-frames', dashboardIri: Rdf.iri('http://www.researchspace.org/resource/ThinkingFrames'),
      initialView: {view: 'resource-editor', resource: iri, data: {}},
      views: [
        {id: 'resource-editor', label: 'Edit', template: '<input aria-label="Entity label" value="Original" />'},
        {id: 'resource', label: 'Resource view', template: '<p data-resource-view="true">{{iri}}</p>'},
      ],
    }), {attachTo: host});
    let action;
    try {
      await waitFor(() => Boolean(host.querySelector('input')));
      const input = host.querySelector('input');
      input.value = 'Unsaved new label';
      action = mount(createElement(EventTrigger as any, viewAction(), createElement('button', {}, 'View resource')));
      action.find('button').simulate('click');
      await waitFor(() => Boolean(host.querySelector('[data-resource-view]')));
      expect(host.querySelector('[data-resource-view]').textContent).to.equal(iri);
      expect(host.contains(input)).to.equal(true);
      action.find('button').simulate('click');
      action.setProps({data: {viewId: 'resource-editor', resourceIri: iri}});
      action.find('button').simulate('click');
      await waitFor(() => dashboard.state('layout').getActiveTabset().getSelectedNode().getId() === iri + 'resource-editor');
      expect(dashboard.state('items')).to.have.length(2);
      expect(host.querySelector('input')).to.equal(input);
      expect(input.value).to.equal('Unsaved new label');
    } finally {
      if (action) { action.unmount(); }
      dashboard.unmount();
      host.remove();
      label.restore();
    }
  });
});
