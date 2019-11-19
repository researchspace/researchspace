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
import * as Slate from 'slate';

export const RESOURCE_MIME_TYPE =
  'researchspace/resource';

/* Marks */
export const Mark = {
  strong: 'strong',
  em: 'em',
  u: 'u',
  s: 's'
} as const;
export type Mark = keyof typeof Mark;

export const Block = {
  title: 'title',
  empty: 'empty',
  embed: 'embed',
  p: 'p',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  ul: 'ul',
  ol: 'ol',
  li: 'li'
} as const;
export type Block = keyof typeof Block;
export const DEFAULT_BLOCK = Block.empty;

export const Inline = {
  externalLink: 'externalLink',
  internalLink: 'internalLink'
} as const;
export type Inline = keyof typeof Inline;

export const TextAlignment = {
  left: 'left',
  right: 'right',
  center: 'center',
  justify: 'justify'
} as const;
export type TextAlignment = keyof typeof TextAlignment;

export function isTextBlock(block?: Slate.Block): boolean {
  if (block) {
    const { type } = block;
    return type === Block.p ||
      type === Block.h1 ||
      type === Block.h2 ||
      type === Block.h3;
  } else {
    return false;
  }
}

/// Schema
export const schema: Slate.SchemaProperties = {
  document: {
    nodes: [
      {
        match: { type: Block.title }, min: 1, max: 1
      },
      { min: 1 },
      {
        match: _.values(Block).map(block => ({ type: block })),
      },
    ],
    normalize: (editor: Slate.Editor, error: Slate.SlateError) => {
      const { code, node, index } = error;
      switch (code) {
        case 'child_min_invalid': {
          const block = Slate.Block.create(index === 0 ? Block.title : Block.empty);
          return editor.insertNodeByKey(node.key, index, block);
        }
      }
    },
  },
  inlines: {
    [Inline.externalLink]: {
      nodes: [{match: {object: 'text'}}]
    },
    [Inline.internalLink]: {
      nodes: [{match: {object: 'text'}}]
    }
  },
  blocks: {
    [Block.embed]: {
      isVoid: true,
    },
    [Block.p]: {
      nodes: [
        {
          match: [
            {
              object: 'text',
              text: (s: string) => s !== '',
            } as any,
            {
              object: 'inline',
              nodes: [{match: {object: 'text'}}]
            },
          ]
        },
      ],
      normalize: (editor: Slate.Editor, error: Slate.SlateError) => {
        switch (error.code) {
          case 'child_text_invalid' as any:
            editor.setNodeByKey(error.node.key, Block.empty);
            return;
        }
      }
    },
    [Block.h1]: {
      nodes: [{ match: { object: 'text' } }]
    },
    [Block.h2]: {
      nodes: [{ match: { object: 'text' } }]
    },
    [Block.h3]: {
      nodes: [{ match: { object: 'text' } }]
    },
    [Block.ol]: {
      nodes: [{ match: { type: Block.li } }]
    },
    [Block.ul]: {
      nodes: [{ match: { type: Block.li } }]
    },
    [Block.empty]: {
      nodes: [
        {
          match: {
            object: 'text',
            text: (s: string) => s === '',
          } as any,
        },
      ],
      normalize: (editor: Slate.Editor, error: Slate.SlateError) => {
        switch (error.code) {
          case 'child_text_invalid' as any:
            editor.setNodeByKey(error.node.key, Block.p);
            return;
        }
      }
    },
  },
};
