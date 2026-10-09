/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */

import { expect } from 'chai';
import * as sinon from 'sinon';
import { Rdf } from 'platform/api/rdf';
import * as Navigation from 'platform/api/navigation';
import * as Events from 'platform/api/events';
import { DashboardComponent } from 'platform/components/dashboard/DashboardComponent';

describe('Configured dashboard event routing', () => {
  let registration: sinon.SinonStub;
  let trigger: sinon.SinonStub;
  const dashboardIri = Rdf.iri('https://example.org/ResearchDashboard');
  const componentId = 'research-workspace';
  beforeEach(() => {
    registration = sinon.stub(Navigation, 'setFrameNavigation');
    trigger = sinon.stub(Events, 'trigger');
    // Exercise the actual registration method without mounting the layout UI.
    DashboardComponent.prototype.componentDidMount.call({
      props: { id: componentId, dashboardIri },
      cancellation: { map: () => ({ observe: () => {} }) },
      onAddNewItem: () => {},
    });
  });
  afterEach(() => { registration.restore(); trigger.restore(); });

  [
    { iri: dashboardIri.value, params: { view: 'authority-list', resource: 'https://example.org/authority' } },
    { iri: dashboardIri.value, params: {} },
    { iri: 'https://example.org/entity/one', params: {} },
    { iri: 'http://www.researchspace.org/instances/narratives/example', params: {} },
    { iri: 'https://example.org/OverlayImages', params: {} },
  ].forEach(({ iri, params }) => {
    it(`targets the mounted dashboard ID for ${iri} ${JSON.stringify(params)}`, () => {
      const handler = registration.firstCall.args[1];
      expect(handler(Rdf.iri(iri), params)).to.equal(true);
      expect(trigger.calledOnce).to.equal(true);
      expect(trigger.firstCall.args[0].targets).to.deep.equal([componentId]);
      if (params['view']) {
        expect(trigger.firstCall.args[0].data.viewId).to.equal('authority-list');
        expect(trigger.firstCall.args[0].data.resourceIri).to.equal(params['resource']);
      }
    });
  });
});
