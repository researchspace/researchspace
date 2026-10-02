/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { createElement, Component } from 'react';
import { expect } from 'chai';
import * as Immutable from 'immutable';
import * as sinon from 'sinon';
import { mount } from 'platform-tests/configuredEnzyme';
import { mockConfig } from 'platform-tests/mocks';
import { Rdf } from 'platform/api/rdf';
import { SparqlUtil } from 'platform/api/sparql';
import { TemplateScope, ContextCapturer } from 'platform/api/services/template';
import { parseTemplate } from 'platform/api/services/template/RemoteTemplateFetcher';
import * as ResourceConfigService from 'platform/api/services/resource-config';
import { TemplateContextTypes } from 'platform/api/components/TemplateContext';
import { escapeRemoteTemplateHtml } from 'platform/api/services/template/TemplateParser';
import { TemplateItem } from 'platform/components/ui/template';
import { FieldValue, FieldError, DataState } from 'platform/components/forms/FieldValues';
import { DragAndDropInput } from 'platform/components/forms/inputs/drop/DragAndDropInput';
import FormAssetView from 'platform/components/forms/FormAssetView';

mockConfig();
const rsp = 'http://www.researchspace.org/resource/';
const rawCard = require('!!raw-loader!../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FResourceCard.html').default;
const sidebar = require('!!raw-loader!../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FFormAssetSidebar.html').default;
const itemTemplate = sidebar.match(/item-template='([^']+)'/)[1];
const annotation = 'https://example.org/annotation/random';
const image = 'https://example.org/image/painting';
const siteConfig = rsp + 'config/SamplingSite';
const annotationConfig = rsp + 'config/ImageAnnotation';
const imageConfig = rsp + 'config/Image';
const configs = {
  [siteConfig]: {resourceLabel: 'Sampling site', resourceOntologyClass: 'https://example.org/Site', resourceIcon: 'location_on', resourceFormIRI: rsp + 'SiteForm', resourceVisualisationTemplateIRI: rsp + 'SamplingSiteView'},
  [annotationConfig]: {resourceLabel: 'Image Annotation', resourceOntologyClass: 'http://www.researchspace.org/ontology/EX_Digital_Image_Region', resourceIcon: 'crop', resourceFormIRI: rsp + 'AnnotationForm', resourceVisualisationTemplateIRI: rsp + 'AnnotationView'},
  [imageConfig]: {resourceLabel: 'Image', resourceOntologyClass: 'http://www.researchspace.org/ontology/EX_Digital_Image', resourceIcon: 'image', resourceFormIRI: rsp + 'ImageForm', resourceVisualisationTemplateIRI: rsp + 'ImageView'},
};
const parent = {iri: 'https://example.org/site/random', node: 'https://example.org/site/random',
  resourceConfig: siteConfig, ...configs[siteConfig], resourceDescription: 'Parent site description',
  resourceVisualisationTemplate: configs[siteConfig].resourceVisualisationTemplateIRI};

// Expand this template's one server-side local partial. Java rendering itself
// is outside this test; the actual client template, capture/expose machinery,
// query component and drag-and-drop input run in the browser.
function clientCardSource() {
  const partial = rawCard.match(/\[\[#\*inline "resourceCardQuery"\]\]([\s\S]*?)\[\[\/inline\]\]/)[1];
  return rawCard.slice(0, rawCard.indexOf('[[#*inline'))
    .replace(/\[\[> resourceCardQuery\]\]/g, partial)
    .replace(/rsp:ResourceCardTemplate/g, JSON.stringify(rsp + 'ResourceCardTemplate'));
}
// Observe the metadata passed to ResourceCardTemplate without making real
// thumbnail, IIIF, label-service or dropdown requests.
const cardProbe = `<div class="card-probe" data-iri="{{iri}}" data-config="{{#if resourceConfig}}{{resourceConfig}}{{else}}unset{{/if}}"
  data-ontology="{{#if resourceOntologyClass}}{{resourceOntologyClass}}{{else}}unset{{/if}}" data-icon="{{#if resourceIcon}}{{resourceIcon}}{{else}}unset{{/if}}" data-form="{{#if resourceFormIRI}}{{resourceFormIRI}}{{else}}unset{{/if}}"
  data-view="{{#if resourceVisualisationTemplate}}{{resourceVisualisationTemplate}}{{else}}unset{{/if}}" data-dropdown-view="{{#if resourceVisualisationTemplateIRI}}{{resourceVisualisationTemplateIRI}}{{else}}unset{{/if}}"
  data-description="{{#if resourceDescription}}{{resourceDescription}}{{else}}unset{{/if}}" data-layout="{{#if cardLayout}}{{cardLayout}}{{else}}grid{{/if}}" data-parent="{{node}}">
  <span class="type-label">{{resourceLabel}}</span></div>`;

class TemplateProvider extends Component<{scope: TemplateScope; captured: any}, {}> {
  static childContextTypes = TemplateContextTypes;
  getChildContext() { return {templateScope: this.props.scope, templateDataContext: this.props.captured}; }
  render() { return this.props.children; }
}
async function waitFor(check: () => boolean) {
  for (let i = 0; i < 100; i++) {
    if (check()) { return; }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error('Card metadata did not render');
}

describe('Form asset resource configuration', () => {
  let scope: TemplateScope;
  let queries: string[];
  let server: sinon.SinonFakeServer;
  let previousPrefixes;
  let previousConfigs;
  let fetchTemplate: sinon.SinonStub;
  let wrapper;
  const rendered = (check: () => boolean) => waitFor(() => { wrapper.update(); return check(); });
  beforeEach(async () => {
    fetchTemplate = sinon.stub(TemplateScope, '_fetchRemoteTemplate').callsFake(iri => {
      if (iri.value !== rsp + 'ResourceCardTemplate') { throw new Error('Unexpected template ' + iri.value); }
      return Promise.resolve(parseTemplate(cardProbe));
    });
    scope = TemplateScope.create({partials: {
      [rsp + 'ResourceCard']: await escapeRemoteTemplateHtml(clientCardSource()),
      [rsp + 'ResourceCardTemplate']: cardProbe,
    }});
    previousPrefixes = SparqlUtil.RegisteredPrefixes;
    previousConfigs = ResourceConfigService.resourceConfigs;
    SparqlUtil.init({rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#', owl: 'http://www.w3.org/2002/07/owl#',
      crm: 'http://www.cidoc-crm.org/cidoc-crm/', Platform: rsp + 'system/'});
    queries = [];
    server = sinon.fakeServer.create();
    server.autoRespond = true;
    server.respondWith('POST', '/sparql', xhr => {
      const query = xhr.requestBody;
      if (query.includes('CONSTRUCT')) {
        const predicates = {resourceLabel: 'resource_name', resourceOntologyClass: 'resource_ontology_class',
          resourceIcon: 'resource_card_icon', resourceFormIRI: 'resource_form',
          resourceVisualisationTemplateIRI: 'resource_visualisation'};
        const triples = Object.keys(configs).map(config => {
          const properties = Object.keys(predicates).map(key => {
            const value = configs[config][key];
            return `<${config}> <http://www.researchspace.org/pattern/system/resource_configuration/${predicates[key]}> ` +
              (value.startsWith('http') ? `<${value}>` : JSON.stringify(value)) + ' .';
          });
          return `<${config}> a <${rsp}system/resource_configuration> .\n` + properties.join('\n');
        }).join('\n');
        xhr.respond(200, {'Content-Type': 'text/turtle'}, triples);
        return;
      }
      queries.push(query);
      const iri = query.match(/BIND\s*\(\s*<([^>]+)>\s+as\s+\?iri\s*\)/i)?.[1];
      const config = iri === annotation ? annotationConfig : iri === image ? imageConfig : undefined;
      const value = configs[config];
      const uri = value => ({type: 'uri', value});
      const literal = value => ({type: 'literal', value});
      const binding = value ? {
        iri: uri(iri), resourceConfig: uri(config), resourceLabel: literal(value.resourceLabel),
        resourceOntologyClass: uri(value.resourceOntologyClass), resourceIcon: literal(value.resourceIcon),
        resourceVisualisationTemplate: uri(value.resourceVisualisationTemplateIRI),
      } : {iri: uri(iri), resourceConfig: literal('')};
      // A SELECT with BIND/OPTIONAL still returns one binding for an unknown
      // resource; the subsequent type-only lookup can have no results.
      const bindings = value || query.includes('?resourceConfigWithP2') ? [binding] : [];
      xhr.respond(200, {'Content-Type': 'application/sparql-results+json'},
        JSON.stringify({head: {vars: ['iri', 'resourceConfig']}, results: {bindings}}));
    });
    await ResourceConfigService.initResourceConfig().toPromise();
  });
  afterEach(() => {
    if (wrapper) { wrapper.unmount(); wrapper = undefined; }
    fetchTemplate.restore();
    server.restore();
    SparqlUtil.init(previousPrefixes || {});
    const current = ResourceConfigService.resourceConfigs;
    Object.keys(current).forEach(key => delete current[key]);
    Object.assign(current, previousConfigs);
  });

  function mountAssets(layout: 'row' | 'grid', source = itemTemplate, values = [annotation, image]) {
    const capturer = new ContextCapturer();
    const key = capturer.captureContext({context: parent, data: {}});
    const capturedItem = `{{#expose ${key}}}${source.replace(/rsp:ResourceCard\b/g, JSON.stringify(rsp + 'ResourceCard'))}{{/expose}}`;
    wrapper = mount(createElement(TemplateProvider, {scope, captured: capturer.getResult()},
      createElement('div', {}, createElement('input', {defaultValue: 'Unsaved site description'}),
        createElement(FormAssetView, {defaultLayout: layout, label: 'Images'},
          createElement(DragAndDropInput, {
            id: 'site-images', for: 'images', renderHeader: false, readonly: true,
            definition: {id: 'images', minOccurs: 0, maxOccurs: 10, order: 0, categories: [], defaultValues: [], constraints: []},
            values: Immutable.List(values.map(iri => FieldValue.fromLabeled({value: Rdf.iri(iri)}))),
            errors: FieldError.noErrors, dataState: DataState.Ready, itemTemplate: capturedItem,
          })))));
  }
  for (const layout of ['row', 'grid'] as const) {
    it(`resolves each ${layout} card from its asset IRI rather than the parent site`, async () => {
      mountAssets(layout);
      await rendered(() => wrapper.find('.card-probe').length === 2);
      for (const [iri, config] of [[annotation, annotationConfig], [image, imageConfig]]) {
        const card = wrapper.find(`.card-probe[data-iri="${iri}"]`);
        expect(card.find('.type-label').text()).to.equal(configs[config].resourceLabel);
        expect(card.prop('data-config')).to.equal(config);
        expect(card.prop('data-ontology')).to.equal(configs[config].resourceOntologyClass);
        expect(card.prop('data-icon')).to.equal(configs[config].resourceIcon);
        expect(card.prop('data-form')).to.equal(configs[config].resourceFormIRI);
        expect(card.prop('data-view')).to.equal(configs[config].resourceVisualisationTemplateIRI);
        expect(card.prop('data-dropdown-view')).to.equal(configs[config].resourceVisualisationTemplateIRI);
        expect(card.prop('data-description')).not.to.equal(parent.resourceDescription);
        expect(card.prop('data-parent')).to.equal(parent.node);
      }
      expect(queries.length).to.equal(2);
    });
  }
  it('keeps correct card types and pending input when switching layouts', async () => {
    mountAssets('row');
    await rendered(() => wrapper.find('.card-probe').length === 2);
    const input = wrapper.find('input').getDOMNode() as HTMLInputElement;
    input.value = 'Unsaved change';
    wrapper.find('button[aria-label="Grid view"]').simulate('click');
    await rendered(() => wrapper.find('.card-probe').everyWhere(card => card.prop('data-layout') === 'grid'));
    expect(wrapper.find('.type-label').map(node => node.text())).to.deep.equal(['Image Annotation', 'Image']);
    wrapper.find('button[aria-label="Row view"]').simulate('click');
    await rendered(() => wrapper.find('.card-probe').everyWhere(card => card.prop('data-layout') === 'row'));
    expect(wrapper.find('.type-label').map(node => node.text())).to.deep.equal(['Image Annotation', 'Image']);
    expect(wrapper.find('input').getDOMNode()).to.equal(input);
    expect(input.value).to.equal('Unsaved change');
  });
  it('does not label an unconfigured asset with parent metadata', async () => {
    mountAssets('row', itemTemplate, ['https://example.org/unknown']);
    await rendered(() => wrapper.find('.card-probe').length === 1);
    const card = wrapper.find('.card-probe');
    expect(card.find('.type-label').text()).to.equal('');
    for (const name of ['config', 'ontology', 'icon', 'form', 'view', 'dropdown-view', 'description']) {
      expect(card.prop('data-' + name)).to.equal('unset');
    }
  });
  it('allows an item template to supply its own explicit resource configuration', async () => {
    mountAssets('grid', `{{> rsp:ResourceCard iri=iri resourceConfig="${annotationConfig}"}}`, [annotation]);
    await rendered(() => wrapper.find('.card-probe').length === 1);
    expect(wrapper.find('.type-label').text()).to.equal('Image Annotation');
    expect(queries.length).to.equal(0);
  });
  it('retains explicit configuration for direct cards outside form assets', async () => {
    wrapper = mount(createElement(TemplateProvider, {scope, captured: undefined},
      createElement(TemplateItem, {template: {source: `{{> "${rsp}ResourceCard"}}`,
        options: {iri: annotation, resourceConfig: annotationConfig, clipboardCard: true, cardLayout: 'row'}}})));
    await rendered(() => wrapper.find('.card-probe').length === 1);
    expect(wrapper.find('.type-label').text()).to.equal('Image Annotation');
    expect(queries.length).to.equal(0);
  });
});
