/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import Html, { Rule } from 'slate-html-serializer';

import { ModuleRegistry } from 'platform/api/module-loader';

export const BLOCK_TAGS: { [tagName: string]: string | boolean } = {
  blockquote: true,
  div: true,
  h1: true,
  h2: true,
  h3: true,
  h4: true,
  h5: true,
  h6: true,
  p: true,
  pre: true,
  section: true,
  table: true,
  tbody: true,
  td: true,
  th: true,
  thead: true,
  tr: true,
};

export const INLINE_TAGS: { [tagName: string]: string | boolean } = {
  span: true,
};

export const MARK_TAGS: { [tagName: string]: string | boolean } = {
  a: true,
  b: true,
  code: true,
  em: true,
  i: true,
  strong: true,
  u: true,
};

const SLATE_RULES: Rule[] = [
  {
    deserialize(el, next) {
      if (el.nodeType === Node.TEXT_NODE && el.textContent.match(/^\s*$/)) {
        return null;
      }
      const tagName = el.tagName.toLowerCase();
      const type = BLOCK_TAGS[tagName];
      if (type) {
        return {
          object: 'block',
          type: typeof type === 'string' ? type : tagName,
          data: {
            attributes: getAttributesAsReactProps(el),
          },
          nodes: next(el.childNodes),
        };
      }
    },
    serialize(obj, children): never {
      throw new Error('block serialization is not supported');
    },
  },
  {
    deserialize(el, next) {
      const tagName = el.tagName.toLowerCase();
      const type = MARK_TAGS[tagName];
      if (type) {
        return {
          object: 'mark',
          type: typeof type === 'string' ? type : tagName,
          data: {
            attributes: getAttributesAsReactProps(el),
          },
          nodes: next(el.childNodes),
        };
      }
    },
    serialize(obj, children): never {
      throw new Error('mark serialization is not supported');
    },
  },
];

function getAttributesAsReactProps(el: Element): { [key: string]: any } {
  const data: { [key: string]: any } = {};
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes.item(i);
    const parsedPropValue = attr.name === 'style' ? ModuleRegistry.parseReactStyleFromCss(attr.value) : attr.value;
    data[attr.name] = parsedPropValue;
  }
  return data;
}

export const SLATE_HTML = new Html({ rules: SLATE_RULES });
