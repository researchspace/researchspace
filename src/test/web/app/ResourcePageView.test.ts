/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */

import { ReactElement } from 'react';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as uri from 'urijs';
import * as Handlebars from 'handlebars';

import { Rdf } from 'platform/api/rdf';
import * as Navigation from 'platform/api/navigation';
import { ComponentsLoader } from 'platform/api/module-loader';
import { DefaultRepositoryInfo } from 'platform/api/services/repository';
import { DataContextFunctions } from 'platform/api/services/template/functions/DataContextFunctions';
import { PageComponent } from 'platform/app/page/Page';
import { getResourcePageView } from 'platform/app/page/ResourcePageView';
import { mockConfig } from 'platform-tests/mocks';

mockConfig();

const resource = Rdf.iri('https://example.org/actor/one');
const template = 'https://example.org/templates/actor';
const config = 'https://example.org/config/actor';
const authorityAdapter = require('!!raw-loader!../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FAuthorityDocumentPage.html').default;
const authorityList = require('!!raw-loader!../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FAuthorityList.html').default;

describe('Standalone resource page rendering', () => {
  [ {}, { uri: resource.value }, { uri: 'https://example.org/old', frame: 'true', context: 'https://example.org/old' } ]
    .forEach(input => {
      it(`keeps the linked entity as template/header context for ${JSON.stringify(input)}`, () => {
        const params = { ...input, resourceView: 'page', resourceVisualisationTemplate: template,
          resourceConfig: config, repository: 'assets' };
        const view = getResourcePageView(resource, params);
        expect(view.iri.value).to.equal(template);
        expect(view.context.value).to.equal(resource.value);
        expect(view.params.uri).to.equal(resource.value);
        expect(view.params.resourceIri).to.equal(resource.value);
        expect(view.params.context).to.equal(resource.value);
        expect(view.params.frame).to.equal('');
        expect(view.params.repository).to.equal('assets');
        expect(view.params.resourceConfig).to.equal(config);
        // Do not mutate browser query parameters or toolbar data.
        expect(params).not.to.have.property('resourceIri');
      });
    });

  it('does not change ordinary URLs or existing ThinkingFrames URLs', () => {
    [ {}, { resourceVisualisationTemplate: template },
      { view: 'resource-detailed-visualisation', resourceVisualisationTemplate: template },
      { resourceView: 'page' } ].forEach(params => {
      const view = getResourcePageView(resource, params);
      expect(view.iri).to.equal(resource);
      expect(view.params).to.equal(params);
      expect(view.context).to.equal(undefined);
    });
  });

  it('supplies AuthorityList with the document IRI and a standalone event prefix', () => {
    const engine = Handlebars.create();
    engine.registerHelper('uuid', () => 'test-id');
    engine.registerHelper('bind', DataContextFunctions.bind);
    const fragment = document.createElement('div');
    fragment.innerHTML = engine.compile(authorityAdapter.replace('[[this]]', resource.value))({});
    const adapter = fragment.querySelector('inline-template');
    expect(adapter.getAttribute('template-iri')).to.equal('http://www.researchspace.org/resource/AuthorityList');
    const options = JSON.parse(adapter.getAttribute('options'));
    expect(options.iri).to.equal(resource.value);
    expect(options.dashboardId).to.equal('authority-page-test-id');
    // Compile the existing authority partial with the context supplied by the adapter.
    fragment.innerHTML = engine.compile(authorityList.replace(
      '[[resolvePrefix "rsp:CollectionBrowserContent"]]',
      'http://www.researchspace.org/resource/CollectionBrowserContent'
    ))(options);
    const collection = JSON.parse(fragment.querySelector('inline-template').getAttribute('options'));
    expect(collection.useConfig).to.equal(resource.value);
    expect(collection.viewId).to.equal(options.dashboardId);
  });
});

describe('PageComponent standalone view integration', () => {
  let stubs: sinon.SinonStub[];
  let previousUrl: uri.URI;
  let previousResource: Rdf.Iri;
  function setCurrentUrl(params: { [key: string]: string }) {
    Navigation.init({ pathname: '/resource/', hash: '', search: uri('').search({
      ...params, uri: resource.value, repository: 'assets',
    }).search() } as any).onValue(() => {});
  }
  beforeEach(() => {
    previousUrl = Navigation.getCurrentUrl();
    previousResource = Navigation.getCurrentResource();
    setCurrentUrl({ resourceView: 'page', resourceVisualisationTemplate: template, resourceConfig: config });
    stubs = [
      sinon.stub(DefaultRepositoryInfo, 'isValidDefault').returns(true),
    ];
  });
  afterEach(() => {
    stubs.forEach(stub => stub.restore());
    Navigation.init({ pathname: previousUrl.path(), search: previousUrl.search(), hash: previousUrl.hash() } as any)
      .onValue(() => {});
    Navigation.__unsafe__setCurrentResource(previousResource);
  });

  it('loads the selected template while keeping the resource URL, toolbar and repository', () => {
    const root = new PageComponent({}, {}).render();
    expect(root.props.repository).to.equal('assets');
    const [toolbar, viewer] = (root as ReactElement<any>).props.children.props.children;
    expect(toolbar.props.iri.value).to.equal(resource.value);
    expect(viewer.props.iri.value).to.equal(template);
    expect(viewer.props.context.value).to.equal(resource.value);
    expect(viewer.props.params.uri).to.equal(resource.value);
    expect(viewer.props.params.frame).to.equal('');
    expect(viewer.type).not.to.equal(ComponentsLoader.component);
  });

  it('keeps editing the resource when action=edit is requested', () => {
    setCurrentUrl({ action: 'edit', resourceView: 'page', resourceVisualisationTemplate: template });
    const root = new PageComponent({}, {}).render();
    const [toolbar, editor] = (root as ReactElement<any>).props.children.props.children;
    expect(toolbar.props.iri.value).to.equal(resource.value);
    expect(editor.type).to.equal(ComponentsLoader.component);
    expect(editor.props.componentTagName).to.equal('mp-internal-page-editor');
    expect(editor.props.componentProps.iri.value).to.equal(resource.value);
  });
});
