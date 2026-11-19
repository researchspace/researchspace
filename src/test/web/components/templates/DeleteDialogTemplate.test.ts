/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { expect } from 'chai';
import * as htmlParser from 'htmlparser2';

import { extractTemplateScope } from 'platform/api/module-loader/Registry';
import { TemplateParser, TemplateScope } from 'platform/api/services/template';

/**
 * The nested <template> elements of a component are taken from the parsed markup and
 * registered as Handlebars partials. Handlebars inside a tag (e.g. `<button {{#if x}}disabled{{/if}}>`)
 * or a "<" in the template text are broken by the HTML parser, and the component fails with
 * "Failed to register <template id='...'>". This test registers the templates of the delete
 * dialog (rsp:ResourceDropdownActions) the same way.
 */
const TEMPLATES = require('!!raw-loader!../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FResourceDropdownActions.html');

/**
 * Other pages changed for knowledge map import and export. Pages that use server-side
 * templating ([[...]]) inside client-side templates cannot be checked this way.
 */
const OTHER_PAGES: { [name: string]: any } = {
  DataImportExport: require('!!raw-loader!../../../../main/resources/org/researchspace/apps/system/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2Fadmin%2FDataImportExport.html'),
  KnowledgeMapTemplate: require('!!raw-loader!../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FKnowledgeMapTemplate.html'),
};

function withoutServerComments(page: any): string {
  return (page.default || page).replace(/\[\[!--[\s\S]*?--\]\]/g, '');
}

function parseMarkup(html: string): any[] {
  const handler = new htmlParser.DomHandler();
  const parser = new htmlParser.Parser(handler, { recognizeCDATA: true } as any);
  parser.parseComplete(html);
  return handler.dom as any[];
}

function findById(nodes: any[], id: string): any {
  for (const node of nodes) {
    if (node.type === 'tag') {
      if (node.attribs.id === id) {
        return node;
      }
      const found = findById(node.children, id);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

function collectComponents(nodes: any[], result: any[] = []): any[] {
  for (const node of nodes) {
    if (node.type === 'tag') {
      if (node.children.some((child: any) => child.name === 'template')) {
        result.push(node);
      }
      collectComponents(node.children, result);
    }
  }
  return result;
}

describe('delete dialog template', () => {
  // server-side comments are removed before the page reaches the browser
  const source = withoutServerComments(TEMPLATES);
  const start = source.indexOf('[[#*inline "deleteButton"]]');
  const end = source.indexOf('[[/inline]]', start);
  const deleteButton = source.substring(start, end);

  it('is found in rsp:ResourceDropdownActions', () => {
    expect(start).to.be.greaterThan(-1);
    expect(deleteButton).to.contain('-deleting-area-');
  });

  it('registers all nested templates without errors', () => {
    const components = collectComponents(parseMarkup(deleteButton));
    expect(components.length).to.be.greaterThan(0);
    for (const component of components) {
      expect(() => extractTemplateScope(component), `<${component.name} id="${component.attribs.id}">`).not.to.throw();
    }
  });

  for (const name of Object.keys(OTHER_PAGES)) {
    it(`registers all nested templates of ${name} without errors`, () => {
      const components = collectComponents(parseMarkup(withoutServerComments(OTHER_PAGES[name])));
      for (const component of components) {
        expect(
          () => extractTemplateScope(component),
          `<${component.name} id="${component.attribs.id}">`
        ).not.to.throw();
      }
    });
  }

  /**
   * The dialog is rendered in an overlay, where a nested template cannot see the variables
   * of the surrounding template: everything the deleting area needs must be in its data.
   * Renders it like that: the surrounding template first, then the nested template with only
   * the data it gets, and follows the clicks by using the data of the event triggers.
   */
  describe('deleting area without the surrounding template context', () => {
    const IRI = 'http://example.com/map';
    const VIEW = 'view-1';

    async function renderDialog() {
      const body = deleteButton.replace('[[#*inline "deleteButton"]]', '');
      // as for templates loaded from the server: nested templates are escaped from the surrounding one
      const outer = await TemplateScope.default.compile(await TemplateParser.escapeRemoteTemplateHtml(body));
      const html = outer({ iri: IRI, viewId: VIEW, resourceFormIRI: 'http://example.com/form', resourceName: 'map' });
      const area = findById(parseMarkup(html), `${IRI}-deleting-area-${VIEW}`);
      expect(area, 'deleting area').to.exist;
      const inner = await extractTemplateScope(area).compile('{{> template}}');
      const render = (data: object) => parseMarkup(inner(data));
      return { area, render, renderHtml: (data: object) => inner(data), dialog: parseMarkup(html) };
    }

    const triggerData = (nodes: any[], id: string) => {
      const trigger = findById(nodes, id);
      expect(trigger, id).to.exist;
      return {
        targets: JSON.parse(trigger.attribs.targets),
        data: trigger.attribs.data && JSON.parse(trigger.attribs.data),
      };
    };

    it('targets the right components before and after Delete is clicked', async () => {
      const { area, render } = await renderDialog();
      const initialData = JSON.parse(area.attribs.data);
      expect(initialData).to.deep.equal({ iri: IRI, viewId: VIEW });

      const initial = render(initialData);
      expect(triggerData(initial, `${IRI}-cancel-modal`).targets).to.deep.equal([`${VIEW}-delete-resource-dialog`]);
      const start = triggerData(initial, `${IRI}-start-resource-removal`);
      expect(start.targets).to.deep.equal([`${IRI}-deleting-area-${VIEW}`]);

      // Component.TemplateUpdate adds the event data to the initial data
      const deleting = render({ ...initialData, ...start.data });
      const removal = triggerData(deleting, `${IRI}-resource-removal`);
      expect(removal.targets).to.deep.equal([`${IRI}-resource-form`]);
      expect(removal.data.iri).to.equal(IRI);
      const whenLoaded = findById(deleting, `${IRI}-resource-removal-when-loaded`);
      expect(whenLoaded.attribs['on-event-source']).to.equal(`${IRI}-resource-form`);
      expect(findById(deleting, `${IRI}-start-resource-removal`), 'Delete is not clickable twice').to.be.undefined;
    });

    it('listens to the hidden form and its template', async () => {
      const { dialog, render, area } = await renderDialog();
      const form = findById(dialog, `${IRI}-delete-form-template-${VIEW}`);
      expect(form.name).to.equal('inline-template');
      // the form template gets viewId = iri, so the form's id is <iri>-resource-form
      expect(JSON.parse(form.attribs.options).viewId).to.equal(IRI);

      const templateFailed = findById(dialog, `${IRI}-delete-form-template-failed-${VIEW}`);
      expect(templateFailed.attribs['on-event-source']).to.equal(form.attribs.id);
      expect(JSON.parse(templateFailed.attribs['on-event-types'])).to.deep.equal(['Template.LoadFailed']);
      const loadFailed = findById(dialog, `${IRI}-delete-form-load-failed-${VIEW}`);
      expect(loadFailed.attribs['on-event-source']).to.equal(`${IRI}-resource-form`);
      expect(JSON.parse(loadFailed.attribs['on-event-types'])).to.deep.equal(['Form.LoadFailed']);
      for (const proxy of [templateFailed, loadFailed]) {
        expect(JSON.parse(proxy.attribs['proxy-targets'])).to.deep.equal([`${IRI}-deleting-area-${VIEW}`]);
        expect(JSON.parse(proxy.attribs['additional-data']).formFailed).to.be.true;
      }

      const deleting = render({ ...JSON.parse(area.attribs.data), resourceDeleting: true });
      const whenLoaded = findById(deleting, `${IRI}-resource-removal-when-loaded`);
      expect(JSON.parse(whenLoaded.attribs['on-event-types'])).to.deep.equal(['Form.Loaded']);
      expect(whenLoaded.attribs['proxy-event-type']).to.equal('Form.RemoveResource');
      expect(JSON.parse(whenLoaded.attribs['proxy-targets'])).to.deep.equal([`${IRI}-resource-form`]);
      expect(JSON.parse(whenLoaded.attribs['additional-data']).iri).to.equal(IRI);
    });

    it('shows the message and Close when the form cannot be loaded', async () => {
      const { area, render, renderHtml } = await renderDialog();
      const data = {
        ...JSON.parse(area.attribs.data),
        formFailed: true,
        templateIri: 'http://example.com/form',
        message: 'Template not found',
      };
      const failed = render(data);
      expect(triggerData(failed, `${IRI}-close-modal`).targets).to.deep.equal([`${VIEW}-delete-resource-dialog`]);
      expect(findById(failed, `${IRI}-start-resource-removal`)).to.be.undefined;
      expect(renderHtml(data)).to.contain('Template not found').and.to.contain('http://example.com/form');
    });
  });

  it('detects Handlebars inside a tag', () => {
    const broken = parseMarkup(`
      <mp-event-target-template-render id="x" template='{{> template}}'>
        <template id='template'>
          {{#if a}}<span>a</span>{{/if}}
          <button class="btn" {{#if b}}disabled{{/if}}>Delete</button>
        </template>
      </mp-event-target-template-render>`);
    expect(() => extractTemplateScope(collectComponents(broken)[0])).to.throw();
  });
});
