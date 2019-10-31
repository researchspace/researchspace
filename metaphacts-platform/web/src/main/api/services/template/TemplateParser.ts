/*
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

import { Parser as HtmlParser, Node } from 'html-to-react';
import * as render from 'dom-serializer';

export function isTemplate(node: Node): boolean {
  return node.type === 'tag' && node.name === 'template';
}

/**
 * Extracts locally defined templates from a node.
 *
 * For example, `<set-management>` node in this markup locally defines
 * a separate template scope with templates 'foo', 'qux' and
 * 'http://www.metaphacts.com/ontologies/platform#bar':
 *
 * <set-management>
 *   <template id='foo'>
 *     <span style='backround: red'>{{> qux}}</span>
 *   </template>
 *   <template id='qux'>
 *     <div>QUX</div>
 *     {{> @partial-block}}
 *   </template>
 *   <template id='http://www.metaphacts.com/ontologies/platform#bar'>
 *     {{> foo}}
 *     {{#> qux}}footer{{/qux}}
 *   </template>
 * </set-management>
 */
export function extractTemplates(node: Node): Array<{ id: string; source: string; }> {
  let missingID = false;
  const templateNodes = node.children
    .filter(child => child.name === 'template')
    .filter(template => {
      const hasId = template.attribs.id !== undefined;
      if (!hasId) {
        missingID = true;
      }
      return hasId;
    });

  if (missingID) {
    throw new Error(`Missing an ID attribute for a mini-template in <${node.name}>`);
  }

  return templateNodes.map(templateNode => {
    const id = templateNode.attribs.id;
    const source = extractTemplate(templateNode);
    return {id, source};
  });
}

function extractTemplate(templateNode: Node): string {
  const escapedTemplate = escapeTemplateBody(templateNode);
  return getInnerHtml(escapedTemplate);
}

export function escapeRemoteTemplateHtml(html: string): Promise<string> {
  const parser = new HtmlParser(null);
  const renderTemplate = (node: Node) => render(escapeChild(node));
  return parser.parseWithInstructions(`<div>${html}</div>`, node => true, [{
    shouldProcessNode: node => true,
    processNode: node => node as any,
  }]).then((root: any) => {
    const node = root as Node;
    return node.children.map(renderTemplate).join('\n');
  });
}

/**
 * Escapes inline and nested templates of every element inside template and
 * inserts helper calls to be able to capture and restore Handelbars data context
 * across template / React boundaries.
 *
 * Each element inside markup (including template markup) creates its own
 * template scope and data context, so templates of the element needs to be
 * escaped in order to not be immediately expanded when rendering parent
 * template.
 *
 * Escaping implemented by raw helper blocks `{{{{capture}}}}`, e.g.
 *
 * <template-item template='{"source": "{{> foo}}", "options": {"qux": 42}}'>
 *   <template id='foo'>
 *     {{qux}}
 *     <template-item template='{
 *       "source": "{{> foo}}",
 *       "options": {"qux": 55}
 *     }'>
 *       <template id='foo'>{{qux}}, {{$parent.qux}}</template>
 *     </template-item>
 *   </template>
 * </template-item>
 *
 * would be escaped like this:
 *
 * <template-item template='{"source": "{{> foo}}", "options": {"qux": 42}}'>
 *   <template id='foo'>
 *     {{qux}}
 *     <template-item template='{
 *       "source": "{{{{capture}}}}{{> foo}}{{{{/capture}}}}",
 *       "options": {"qux": 55}
 *     }'>
 *       <template id='foo'>{{{{capture}}}}{{qux}}, {{$parent.qux}}{{{{/capture}}}}</template>
 *     </template-item>
 *   </template>
 * </template-item>
 */
function escapeTemplateBody(node: Node): Node {
  let newAttributes: Record<string, string> = undefined;
  for (const key in node.attribs) {
    if (!Object.prototype.hasOwnProperty.call(node.attribs, key)) { continue; }
    const value = node.attribs[key];
    const escaped = escapePartialReferences(value);
    if (escaped !== value) {
      if (!newAttributes) { newAttributes = {}; }
      newAttributes[key] = escaped;
    }
  }
  const override: Partial<Node> = {
    attribs: {...node.attribs, ...newAttributes},
    children: node.children ? node.children.map(escapeChild) : node.children,
  };
  return {...node, ...override};
}

function escapeChild(child: Node) {
  if (isTemplate(child)) {
    if (!child.children || child.children.every(isEmptyTextNode)) {
      // prevent Handlebars syntax error on empty {{{{capture}}}}{{{{/capture}}}} raw block
      return child;
    }

    const {start, end} = generateEscapeBrackets();
    const children: Node[] = [
      {type: 'text', data: start, parent: child},
      ...child.children,
      {type: 'text', data: end, parent: child},
    ];
    return {...child, children};
  } else {
    return escapeTemplateBody(child);
  }
}

function isEmptyTextNode(node: Node) {
  return node.type === 'text' && !node.data;
}

function escapePartialReferences(content: string): string {
  if (content.indexOf('{{#>') >= 0) {
    throw new Error('Partial blocks ({{#>) are disallowed in the inline templates');
  }
  const {start, end} = generateEscapeBrackets();
  return content.replace(/({{>[^}"']+}})/g, `${start}$1${end}`);
}

function generateEscapeBrackets() {
  return {
    start: `{{{{capture}}}}`,
    end: `{{{{/capture}}}}`,
  };
}

/**
 * Returns inner HTML of the node by concatenating it's children markup.
 */
function getInnerHtml(node: Node) {
  return node.children ? node.children.map(render).join('') : '';
}
