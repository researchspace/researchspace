/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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

import * as _ from 'lodash';
import * as React from 'react';
import { Rule } from 'slate-html-serializer';

import { ModuleRegistry } from 'platform/api/module-loader';

import { Block, Mark, Inline, RESOURCE_MIME_TYPE } from './EditorSchema';

export const SLATE_RULES: Rule[] = [
  {
    deserialize(el, next) {
      if (el.nodeType === Node.ELEMENT_NODE) {
        const tagName = el.tagName.toLowerCase();

        if (tagName === 'a') {
          const data: {attributes?: {}} = {};
          const attributes = getAttributesAsReactProps(el);
          if (!_.isEmpty(attributes)) {
            // we can't attach empty attribute because then slate has problem with equality
            // for toggleMark, etc.
            data.attributes = attributes;
          }

          const isInternalLink = attributes.type === RESOURCE_MIME_TYPE;
          return {
            object: 'inline',
            type: isInternalLink ? Inline.internalLink : Inline.externalLink,
            data,
            nodes: next(el.childNodes),
          };
        }
      }
    },
    serialize(obj, children) {
      if (obj.object === 'inline') {
        if (obj.type === Inline.externalLink || obj.type === Inline.internalLink) {
          return React.createElement('a', obj.data.get('attributes', {}), children);
        }
      }
    }
  },
  {
    deserialize(el, next) {
      if (el.nodeType === Node.ELEMENT_NODE) {
        const tagName = el.tagName.toLowerCase();
        if (Block[tagName] || Mark[tagName]) {
          const data: {attributes?: {}} = {};
          const attributes = getAttributesAsReactProps(el);
          if (!_.isEmpty(attributes)) {
            // we can't attach empty attribute because then slate has problem with equality
            // for toggleMark, etc.
            data.attributes = attributes;
          }
          return {
            object: Block[tagName] ? 'block' : 'mark',
            type: tagName,
            data,
            nodes: next(el.childNodes),
          };
        }
      }
    },
    serialize(obj, children) {
      if (
        (obj.object === 'block' && Block[obj.type]) ||
          (obj.object === 'mark' && Mark[obj.type])
      ) {
        if (obj.type === Block.embed) {
          return React.createElement(
            obj.type,
            obj.data.get('attributes', {})
          );
        } else if (obj.type === Block.title) {
          // we serialize title separately as head/title
          return null;
        } else {
          return React.createElement(
            obj.type,
            obj.data.get('attributes', {}),
            children
          );
        }
      }
    },
  },
];


// from text-annotation TextSerialization, TODO
function getAttributesAsReactProps(el: Element): { [key: string]: any } {
  const data: { [key: string]: any } = {};
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes.item(i);
    const parsedPropValue = attr.name === 'style'
      ? ModuleRegistry.parseReactStyleFromCss(attr.value)
      : attr.value;
    data[attr.name] = parsedPropValue;
  }
  return data;
}
