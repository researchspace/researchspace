/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */

import { expect } from 'chai';
import * as sinon from 'sinon';
import * as Kefir from 'kefir';
import { Rdf } from 'platform/api/rdf';
import * as Navigation from 'platform/api/navigation';
import * as Events from 'platform/api/events';
import { DashboardComponent } from 'platform/components/dashboard/DashboardComponent';

describe('Configured dashboard event routing', () => {
  let trigger: sinon.SinonSpy;
  let events: Kefir.Subscription;
  const dashboardIri = Rdf.iri('https://example.org/ResearchDashboard');
  const componentId = 'research-workspace';
  beforeEach(() => {
    trigger = sinon.spy();
    events = Events.listen({ eventType: 'Dashboard.AddFrame' }).observe({ value: trigger });
    // Exercise the actual registration method without mounting the layout UI.
    DashboardComponent.prototype.componentDidMount.call({
      props: { id: componentId, dashboardIri },
      cancellation: { map: () => ({ observe: () => {} }) },
      onAddNewItem: () => {},
    });
  });
  afterEach(() => { Navigation.setFrameNavigation(false); events.unsubscribe(); });

  [
    { iri: dashboardIri.value, params: { view: 'authority-list', resource: 'https://example.org/authority' } },
    { iri: dashboardIri.value, params: {} },
    { iri: 'https://example.org/entity/one', params: {} },
    { iri: 'http://www.researchspace.org/instances/narratives/example', params: {} },
    { iri: 'https://example.org/OverlayImages', params: {} },
  ].forEach(({ iri, params }) => {
    it(`targets the mounted dashboard ID for ${iri} ${JSON.stringify(params)}`, () => {
      Navigation.navigateToResource(Rdf.iri(iri), params).onValue(() => {});
      expect(trigger.calledOnce).to.equal(true);
      expect(trigger.firstCall.args[0].targets).to.deep.equal([componentId]);
      if (params['view']) {
        expect(trigger.firstCall.args[0].data.viewId).to.equal('authority-list');
        expect(trigger.firstCall.args[0].data.resourceIri).to.equal(params['resource']);
      }
    });
  });
});
