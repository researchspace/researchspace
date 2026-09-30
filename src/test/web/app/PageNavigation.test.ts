/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { createElement, ReactElement } from 'react';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as Kefir from 'kefir';
import { mount } from 'platform-tests/configuredEnzyme';
import { mockConfig } from 'platform-tests/mocks';
import { Rdf } from 'platform/api/rdf';
import { PageService } from 'platform/api/services/page';
import * as Navigation from 'platform/api/navigation';
import { PageViewerComponent } from 'platform/app/page/PageViewer';
import { ModuleRegistry } from 'platform/api/module-loader';
import { ConfigHolder } from 'platform/api/services/config-holder';
import { ResourceLink } from 'platform/api/navigation/components/ResourceLink';
import DuplicateResource from 'platform/components/ldp/DuplicateResource';
import { LdpService } from 'platform/api/services/ldp';
import { getOverlaySystem, registerOverlaySystem } from 'platform/components/ui/overlay';

mockConfig();
const original = Rdf.iri('https://example.org/pattern/original');
const duplicate = Rdf.iri('https://example.org/pattern/duplicate');

async function waitFor(check: () => boolean, details: () => string = () => '') {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (check()) { return; }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error(`The requested page content was not displayed. ${details()}`);
}

// Matches the outer wrapper and unchanged partial invocation on the real KP page.
function patternPage(iri: string) {
  return `<mp-event-target-template-render id="kp-form-page" template="{{> template}}">
    <template id="template"><p data-pattern="true">${iri}</p></template>
  </mp-event-target-template-render>`;
}

describe('Page navigation', () => {
  let load: sinon.SinonStub;
  let page;

  beforeEach(() => {
    load = sinon.stub(PageService, 'loadRenderedTemplate').callsFake((iri: Rdf.Iri) =>
      Kefir.constant({templateHtml: patternPage(iri.value), jsurls: []}));
  });

  afterEach(() => {
    if (page) { page.unmount(); page = undefined; }
    load.restore();
  });

  it('replaces the old knowledge-pattern content when the resource changes', async () => {
    page = mount(createElement(PageViewerComponent, {iri: original, noScroll: true, noBackdrop: true}));
    await waitFor(() => page.text() === original.value);
    page.setProps({iri: duplicate});
    await waitFor(() => !page.state('loading'));
    await waitFor(() => page.text() === duplicate.value);
    expect(load.lastCall.args[0].value).to.equal(duplicate.value);
  });

  it('renders the new partial after an API refresh of the same resource', async () => {
    page = mount(createElement(PageViewerComponent, {iri: original, noScroll: true, noBackdrop: true}));
    await waitFor(() => page.text() === original.value);
    load.callsFake(() => Kefir.constant({templateHtml: patternPage('Updated pattern'), jsurls: []}));
    Navigation.refresh();
    await waitFor(() => !page.state('loading'));
    await waitFor(() => page.text() === 'Updated pattern');
  });

  it('reloads content when only URL parameters change', async () => {
    load.callsFake((_iri, _context, params) =>
      Kefir.constant({templateHtml: patternPage(params.resourceIri), jsurls: []}));
    page = mount(createElement(PageViewerComponent, {
      iri: original, params: {resourceIri: 'Sample A'}, noScroll: true, noBackdrop: true,
    }));
    await waitFor(() => page.text() === 'Sample A');
    page.setProps({params: {resourceIri: 'Sample B'}});
    await waitFor(() => page.text() === 'Sample B');
  });

  it('retains explicitly fixed components across page loads', async () => {
    load.callsFake((iri: Rdf.Iri) => Kefir.constant({templateHtml:
      `<mp-event-target-template-render fixed-key="persistent-panel" id="persistent-panel"
        template='<input aria-label="Draft" />'></mp-event-target-template-render>
       ${patternPage(iri.value)}`, jsurls: []}));
    page = mount(createElement(PageViewerComponent, {iri: original, noScroll: true, noBackdrop: true}));
    await waitFor(() => {
      page.update();
      return page.text() === original.value && page.find('input').length === 1;
    }, () => page.html());
    const input = page.find('input').getDOMNode() as HTMLInputElement;
    input.value = 'Unsaved draft';
    page.setProps({iri: duplicate});
    await waitFor(() => page.text() === duplicate.value, () => page.html());
    page.update();
    expect(page.find('input').getDOMNode()).to.equal(input);
    expect(page.getDOMNode().contains(input)).to.equal(true);
    expect(input.value).to.equal('Unsaved draft');
  });

  it('keeps component identity stable when parsing equivalent inline templates', async () => {
    const firstParse = await ModuleRegistry.parseHtmlToReact(patternPage(original.value));
    const secondParse = await ModuleRegistry.parseHtmlToReact(patternPage(original.value));
    const first = Array.isArray(firstParse) ? firstParse[0] : firstParse;
    const second = Array.isArray(secondParse) ? secondParse[0] : secondParse;
    expect(first.key).to.be.a('string');
    expect(first.key).to.equal(second.key);
  });

  it('replaces components that have no explicit ID when the resource changes', async () => {
    load.callsFake((iri: Rdf.Iri) => Kefir.constant({
      templateHtml: patternPage(iri.value).replace(' id="kp-form-page"', ''), jsurls: [],
    }));
    page = mount(createElement(PageViewerComponent, {iri: original, noScroll: true, noBackdrop: true}));
    await waitFor(() => page.text() === original.value);
    page.setProps({iri: duplicate});
    await waitFor(() => page.text() === duplicate.value);
  });

  describe('browser navigation and actions', () => {
    let unsubscribe: () => void;
    let action;
    let environment;
    let browserUrl: string;
    let browserState;

    beforeEach(async () => {
      environment = ConfigHolder.getEnvironmentConfig();
      (ConfigHolder.getEnvironmentConfig as sinon.SinonStub).returns({resourceUrlMapping: {value: '/resource/'}});
      browserUrl = window.location.href;
      browserState = window.history.state;
      Navigation.setFrameNavigation(false);
      // Like MainApp, forward NAVIGATED events to the page's IRI and params.
      // A listener is also needed for the navigation API's confirmation stream.
      unsubscribe = Navigation.listen({eventType: 'NAVIGATED', callback: () => {
        if (page) {
          page.setProps({iri: Navigation.getCurrentResource(), params: Navigation.getCurrentUrl().search(true)});
        }
      }});
      Navigation.navigateToResource(original, {}, 'assets').onValue(() => {});
      page = mount(createElement(PageViewerComponent, {
        iri: Navigation.getCurrentResource(), params: Navigation.getCurrentUrl().search(true),
        noScroll: true, noBackdrop: true,
      }));
      await waitFor(() => page.text() === original.value);
    });

    afterEach(() => {
      unsubscribe();
      if (action) { action.unmount(); action = undefined; }
      (ConfigHolder.getEnvironmentConfig as sinon.SinonStub).returns(environment);
      window.history.replaceState(browserState, '', browserUrl);
    });

    it('updates both the URL and visible content after a resource link click', async () => {
      action = mount(createElement(ResourceLink, {resource: duplicate, repository: 'assets', draggable: false}, 'Open'));
      action.find('a').simulate('click', {button: 0});
      await waitFor(() => page.text() === duplicate.value);
      expect(new URL(window.location.href).searchParams.get('uri')).to.equal(duplicate.value);
      expect(Navigation.getCurrentResource().value).to.equal(duplicate.value);
    });

    it('shows the copied knowledge pattern after the duplicate action redirects', async () => {
      const copy = sinon.stub(LdpService.prototype, 'copyResource').returns(Kefir.constant(duplicate.value));
      let dialog: ReactElement<any>;
      const previousOverlay = getOverlaySystem();
      registerOverlaySystem({refs: {overlaySystem: {
        show: (_key, element) => { dialog = element; }, hide: () => {}, hideAll: () => {},
      }}} as any);
      try {
        action = mount(createElement(DuplicateResource, {
          iri: original.value, container: 'http://www.researchspace.org/resource/system/fieldDefinitionContainer',
        }, createElement('button', {}, 'Duplicate')));
        action.find('button').simulate('click');
        await dialog.props.onSave('duplicate').toPromise();
        await waitFor(() => page.text() === duplicate.value);
        expect(copy.calledOnce).to.equal(true);
        expect(new URL(window.location.href).searchParams.get('uri')).to.equal(duplicate.value);
        expect(new URL(window.location.href).searchParams.get('repository')).to.equal('assets');
      } finally {
        registerOverlaySystem({refs: {overlaySystem: previousOverlay}} as any);
        copy.restore();
      }
    });

    it('keeps browser Back and Forward content in sync with the URL', async () => {
      Navigation.navigateToResource(duplicate, {}, 'assets').onValue(() => {});
      await waitFor(() => page.text() === duplicate.value);
      window.history.back();
      await waitFor(() => page.text() === original.value);
      expect(new URL(window.location.href).searchParams.get('uri')).to.equal(original.value);
      window.history.forward();
      await waitFor(() => page.text() === duplicate.value);
      expect(new URL(window.location.href).searchParams.get('uri')).to.equal(duplicate.value);
    });
  });
});
