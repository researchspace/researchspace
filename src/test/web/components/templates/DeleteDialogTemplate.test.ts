/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { expect } from 'chai';
import * as htmlParser from 'htmlparser2';

import { extractTemplateScope } from 'platform/api/module-loader/Registry';

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
