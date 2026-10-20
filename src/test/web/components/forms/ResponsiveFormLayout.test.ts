/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import * as React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Simulate } from 'react-dom/test-utils';
import { Tab, NavItem } from 'react-bootstrap';
import { expect } from 'chai';
import { SemanticForm, FieldValue, CompositeValue, PlainTextInput, TreePickerInput, AutocompleteInput } from 'platform/components/forms';
import { Rdf } from 'platform/api/rdf';
import SplitPane from 'platform/components/ui/splitpane/SplitPaneComponent';
import SidebarOpen from 'platform/components/ui/splitpane/SplitPaneSidebarOpenComponent';
import ToggleOn from 'platform/components/ui/splitpane/SplitPaneToggleOnComponent';
import ToggleOff from 'platform/components/ui/splitpane/SplitPaneToggleOffComponent';
import RsTabs from 'platform/components/ui/tabs/Tabs';
import RsTab from 'platform/components/ui/tabs/Tab';
import FormAssetView from 'platform/components/forms/FormAssetView';
import ResponsiveAssetNavigation from 'platform/components/forms/ResponsiveAssetNavigation';
import { mockConfig } from 'platform-tests/mocks';
import 'platform/styling/main.scss';
import 'platform/components/forms/forms.scss';

const h = React.createElement;
const source = require('!!raw-loader!../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FSimpleCollectionBrowser.html').default;
const shell = document.createElement('div');
shell.innerHTML = source.match(/<mp-splitpane\s[\s\S]*?>/)[0] + '</mp-splitpane>';
const split = shell.firstElementChild;
const splitProps = {
  className: split.getAttribute('class'), minSize: Number(split.getAttribute('min-size')),
  defaultSize: Number(split.getAttribute('default-size')), snapThreshold: Number(split.getAttribute('snap-threshold')),
  defaultOpen: true, persistResize: false, alwaysRender: true,
};
const fields = ['preferred', 'alternative', 'description', 'broader', 'related'].map(id => ({
  id, label: {preferred: 'Preferred name', alternative: 'Alternative name', description: 'Description', broader: 'Broader type', related: 'Related type'}[id], minOccurs: id === 'preferred' ? 1 : 0, maxOccurs: id === 'preferred' ? 1 : 10,
  xsdDatatype: `http://www.w3.org/2001/XMLSchema#${['broader', 'related'].includes(id) ? 'anyURI' : 'string'}`,
  autosuggestionPattern: 'SELECT ?value ?label WHERE { FILTER(false) }',
}));
mockConfig();

class FormFixture extends React.Component<{ tabs?: boolean }, { model: any }> {
  state = { model: FieldValue.fromLabeled({ value: Rdf.iri('') }) as any };
  private change = (model: CompositeValue) => this.setState({ model });
  render() {
    const uploadAreas = ['Main image', 'More images'].map(label =>
      h('div', {className: 'dragAndDrop-input-container', key: label},
        h('label', {}, label), h('div', {className: 'DragAndDropInput--itemArea'},
          h('div', {className: 'placeholder-item', style: {padding: 24, minHeight: 180}},
            'Drag image from Image Library or Image Annotation Library, or click to upload'))));
    const assets = h(FormAssetView, {label: 'Images'}, h('div', {className: 'form-asset-view__body'}, uploadAreas));
    const media = h('div', {className: 'form-details-assets-container form-assets-sidebar'},
      h('div', {className: 'customFormHeader form-assets-sidebar__heading'}, 'Related media/resources'),
      h(Tab.Container, {id: 'responsive-media', defaultActiveKey: 'images'},
        h('div', {className: 'form-assets-sidebar__tabs'},
          h(ResponsiveAssetNavigation, {}, ['images', 'documents', 'videos', 'links'].map(name => h(NavItem, {eventKey: name, key: name}, name))),
          h(Tab.Content, {className: 'form-assets-sidebar__content'},
            h(Tab.Pane, {eventKey: 'images', className: 'form-assets-sidebar__pane'}, assets)))));
    const details = h('div', {className: 'form-details-container'},
      h('div', {className: 'form-details-inputs-container'},
        h(PlainTextInput, {for: 'preferred', placeholder: 'Enter preferred name'}),
        h(PlainTextInput, {for: 'alternative', placeholder: 'Enter alternative name'}),
        h(PlainTextInput, {for: 'description', multiline: true, placeholder: 'Enter description/comment'}),
        h(TreePickerInput, {for: 'broader', label: 'Broader type', placeholder: 'Select broader type',
          treePatterns: {scheme: 'https://example.org/authority', schemePattern: '?item <https://example.org/in> <https://example.org/authority>',
            relationPattern: '?item <https://example.org/broader> ?parent', labelPattern: '?item <http://www.w3.org/2000/01/rdf-schema#label> ?label'}}),
        h(AutocompleteInput, {for: 'related', placeholder: 'Enter related type',
          nestedFormTemplates: [{label: 'Type', nestedForm: '<div>Nested form</div>'}]})), media);
    return h('div', {className: 'page__grid-container'}, h('div', {className: 'page__content-container resource-editView-form-container'},
      h('div', {className: 'resource-record-header resource-record-header--editor'},
        h('h2', {className: 'resource-record-header-title'}, 'New authority document type')),
      h(SemanticForm, {fields, model: this.state.model, onChanged: this.change, onLoaded: this.change},
        h('div', {className: 'form-scroll-area'}, this.props.tabs ?
          h(RsTabs, {id: 'responsive-form-tabs', className: 'form-tabs'},
            h(RsTab, {eventKey: 'detail', title: 'Details'}, details),
            h(RsTab, {eventKey: 'other', title: 'Is type of'}, h('div', {}, 'Other fields'))) : details),
        h('div', {className: 'btn-group', style: {marginTop: 15}}, h('div', {className: 'btn-form-actions'},
          ['Reset', 'Delete', 'Debug', 'Save type'].map(label => h('button', {type: 'button', className: 'btn btn-default', key: label}, label)))))));
  }
}

describe('Responsive form and authority panels', () => {
  let host: HTMLDivElement;
  const tick = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const find = (s: string) => host.querySelector<HTMLElement>(s);
  const box = (s: string) => find(s).getBoundingClientRect();
  async function ready() {
    for (let i = 0; i < 100 && !find('input[placeholder="Enter preferred name"]'); i++) await new Promise(resolve => setTimeout(resolve, 10));
    expect(Boolean(find('input[placeholder="Enter preferred name"]')), host.textContent).to.equal(true);
    await document.fonts.ready; await tick(); await tick();
  }
  beforeEach(() => {
    host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;height:900px';
    document.body.appendChild(host);
  });
  afterEach(() => { unmountComponentAtNode(host); host.remove(); });

  function draw(width: number, authority = false, tabs = true) {
    host.style.width = `${width}px`;
    const form = h(FormFixture, {tabs});
    const sidebar = h('div', {className: 'split-pane__sidebar split-pane__leftsidebar'},
      h(ToggleOn, {}, h('button', {className: 'btn-toggle-on', type: 'button'},
        h('div', {className: 'btn-toggle-on-content'}, h('h4', {}, 'Appellation alternative form'), h('i', {}, '›')))),
      h(ToggleOff, {}, h('div', {className: 'split-pane__sidebar-header'}, h('button', {className: 'btn-toggle-off', type: 'button'},
        h('h4', {}, 'Appellation alternative form'), h('i', {}, '‹')))),
      h(SidebarOpen, {className: 'authority-browser__tree', style: {flex: 1}},
        h('div', {className: 'split-pane__sidebar-open'}, h('div', {className: 'collection-terms-area'},
          h('button', {className: 'btn btn-action', style: {marginBottom: 10}}, 'New appellation alternative form'),
          h('input', {className: 'form-control authority-filter', placeholder: 'Select Type'}),
          h('div', {className: 'LazyTree--component', style: {overflow: 'auto'}},
            h('div', {className: 'LazyTree--alignmentTreeContainer'}, ['alternative spelling', 'transcription', 'transliteration'].map(name => h('div', {key: name}, name))))))));
    render(h('div', {className: `resource-editView-container${authority ? ' resource-editView-container--authority' : ''}`},
      authority ? h(SplitPane, splitProps, sidebar, form) : form), host);
  }

  function containedFields() {
    const bounds = box('.form-details-inputs-container');
    for (const control of Array.from(find('.form-details-inputs-container').querySelectorAll<HTMLElement>('input, textarea, button, .Select, .SemanticTreeInput--inputAndButtons'))) {
      if (!control.getClientRects().length || control.closest('[hidden]')) continue;
      const rect = control.getBoundingClientRect();
      expect(rect.left, control.outerHTML).to.be.at.least(bounds.left - 1);
      expect(rect.right, control.outerHTML).to.be.at.most(bounds.right + 1);
    }
    expect(find('.form-scroll-area').scrollWidth).to.be.at.most(find('.form-scroll-area').clientWidth + 1);
  }

  for (const tabs of [false, true]) for (const width of [320, 640, 1000, 1400]) {
    it(`fits fields and media at ${width}px ${tabs ? 'inside' : 'without'} form tabs`, async () => {
      draw(width, false, tabs); await ready(); containedFields();
      const inputs = box('.form-details-inputs-container'), media = box('.form-assets-sidebar');
      if (width < 1000) {
        expect(media.top).to.be.at.least(inputs.bottom - 1);
        expect(media.width).to.be.closeTo(inputs.width, 1);
      } else {
        expect(media.left).to.be.at.least(inputs.right + 19);
        expect(inputs.width).to.be.greaterThan(media.width);
      }
      expect(box('.btn-form-actions').right).to.be.at.most(box('.resource-editView-form-container').right + 1);
    });
  }

  for (const width of [360, 700, 900, 1600]) {
    it(`keeps both authority panels usable at ${width}px`, async () => {
      draw(width, true); await ready(); containedFields();
      const sidebar = box('.Pane1'), editor = box('.Pane2');
      if (width <= 800) {
        expect(sidebar.bottom).to.be.at.most(editor.top + 1);
        expect(editor.width).to.be.closeTo(width, 1);
        expect(sidebar.height).to.be.at.most(240);
      } else {
        expect(sidebar.right).to.be.at.most(editor.left);
        expect(sidebar.width).to.be.at.most(width * .4);
      }
      expect(find('.resource-editView-container').scrollWidth).to.be.at.most(width + 1);
      expect(box('.btn-form-actions').bottom).to.be.at.most(host.getBoundingClientRect().bottom + 1);
    });
  }

  it('bounds sidebar dragging and keeps the stacked list collapsible in a short frame', async () => {
    draw(900, true); await ready();
    const resizer = find('.Resizer');
    Simulate.mouseDown(resizer, {clientX: resizer.getBoundingClientRect().left, clientY: 30});
    document.dispatchEvent(new MouseEvent('mousemove', {clientX: 800, clientY: 30, bubbles: true}));
    document.dispatchEvent(new MouseEvent('mouseup', {clientX: 800, clientY: 30, bubbles: true}));
    await tick();
    expect(box('.Pane1').width).to.be.at.most(360);
    containedFields();
    host.style.width = '360px'; host.style.height = '600px'; await tick(); await tick();
    expect(box('.Pane1').height).to.be.at.most(210);
    find('.btn-toggle-off').click(); await tick();
    expect(box('.Pane1').height).to.equal(48);
    find('.btn-toggle-on').click(); await tick();
    expect(box('.Pane1').height).to.be.at.most(210);
    expect(box('.btn-form-actions').bottom).to.be.at.most(host.getBoundingClientRect().bottom + 1);
    const scroll = find('.form-tabs > .tab-content > .tab-pane.active');
    scroll.scrollTop = scroll.scrollHeight; await tick();
    expect(box('.form-assets-sidebar').bottom).to.be.at.most(scroll.getBoundingClientRect().bottom + 1);
    containedFields();
  });

  it('preserves unsaved fields, media selection and the list filter through resizing and collapse', async () => {
    draw(1600, true); await ready();
    const input = find('input[placeholder="Enter preferred name"]') as HTMLInputElement;
    Simulate.change(input, {target: {value: 'Unsaved authority item'}} as any);
    const filter = find('.authority-filter') as HTMLInputElement;
    filter.value = 'transcription';
    find('[aria-label="Grid view"]').click(); await tick();
    for (const width of [700, 360, 900, 1600]) {
      host.style.width = `${width}px`; await tick(); await tick();
      expect(find('input[placeholder="Enter preferred name"]')).to.equal(input);
      expect(input.value).to.equal('Unsaved authority item');
      expect(filter.value).to.equal('transcription');
      expect(find('[aria-label="Grid view"]').getAttribute('aria-pressed')).to.equal('true');
      containedFields();
    }
    find('.btn-toggle-off').click(); await tick();
    expect(box('.Pane1').width).to.equal(48);
    expect(input.value).to.equal('Unsaved authority item');
    find('.btn-toggle-on').click(); await tick();
    expect(box('.Pane1').width).to.equal(320);
    expect(find('.authority-filter')).to.equal(filter);
    expect(filter.value).to.equal('transcription');
  });
});
