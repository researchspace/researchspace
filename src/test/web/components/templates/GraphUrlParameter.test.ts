/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { expect } from 'chai';
import * as he from 'he';
import * as htmlParser from 'htmlparser2';

import { TemplateScope } from 'platform/api/services/template';
import { isSafeIri } from 'platform/components/3-rd-party/ontodia/data/KnowledgeMapTrig';

/**
 * `ThinkingFrames?graph=<IRI>` opens a knowledge map with the content of a named graph.
 * The value comes from the URL, so it must not be able to break the page: the server puts it
 * URI-encoded into the JSON of `initial-view`, the knowledge map template decodes it, and the
 * knowledge map editor only uses it in a query if it is a plain IRI.
 */
const THINKING_FRAMES = require('!!raw-loader!../../../../main/resources/org/researchspace/apps/default/data/templates/http%3A%2F%2Fwww.researchspace.org%2Fresource%2FThinkingFrames.html');

const SERVER_ENCODED_GRAPH = '[[encodeUriComponent (urlParam "graph" escape=false)]]';

/** Renders the `graph` branch of the dashboard's initial view as the server would. */
function renderInitialView(graph: string): any {
  const page: string = THINKING_FRAMES.default || THINKING_FRAMES;
  const start = page.indexOf('[[#if (urlParam "graph")]]');
  const end = page.indexOf('[[else]]', start);
  const branch = page.substring(start + '[[#if (urlParam "graph")]]'.length, end).replace(/\[\[!--[\s\S]*?--\]\]/g, '');
  expect(branch).to.contain(SERVER_ENCODED_GRAPH);
  // the server helper produces the same result as JavaScript's encodeURIComponent
  const html = `<rs-dashboard ${branch.split(SERVER_ENCODED_GRAPH).join(encodeURIComponent(graph))}></rs-dashboard>`;
  const handler = new htmlParser.DomHandler();
  new htmlParser.Parser(handler).parseComplete(html);
  const dashboard = (handler.dom as any[]).find((node) => node.name === 'rs-dashboard');
  // attribute values are decoded like the platform does it (Registry.attributeValue)
  return JSON.parse(he.decode(dashboard.attribs['initial-view']));
}

const GRAPHS = [
  'http://example.com/graph',
  "http://example.com/it's",
  'http://example.com/a&b=c#d',
  'http://example.com/ü',
  // crafted values
  'http://example.com/g", "view": "homepage',
  "x' onload='alert(1)",
  'http://x> } SERVICE <http://evil/> {',
];

describe('graph URL parameter of Thinking Frames', () => {
  for (const graph of GRAPHS) {
    it(`keeps the page intact for ${JSON.stringify(graph)}`, async () => {
      const initialView = renderInitialView(graph);
      expect(initialView.view).to.equal('knowledge-map');
      expect(initialView.data.customLabel).to.equal('Knowledge map of a named graph');

      // rsp:KnowledgeMapTemplate decodes it and passes it on in an attribute
      const template = await TemplateScope.default.compile(
        `<ontodia graph='{{decodeUriComponent data.graph}}'></ontodia>`
      );
      const handler = new htmlParser.DomHandler();
      new htmlParser.Parser(handler).parseComplete(template({ data: initialView.data }));
      const ontodia = (handler.dom as any[]).find((node) => node.name === 'ontodia');
      expect(he.decode(ontodia.attribs.graph)).to.equal(graph);
    });
  }

  it('only lets plain IRIs reach a query', () => {
    expect(GRAPHS.filter(isSafeIri)).to.deep.equal([
      'http://example.com/graph',
      "http://example.com/it's",
      'http://example.com/a&b=c#d',
      'http://example.com/ü',
    ]);
  });
});
