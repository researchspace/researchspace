/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

import { List } from 'immutable';

import { KeyedForest } from 'platform/components/semantic/lazy-tree';

export interface Node {
  readonly key: string;
  readonly children: List<Node>;
  readonly hasMoreChildren?: boolean;
}

export function node(key: string, ...children: Node[]): Node {
  return {key, children: List(children)};
}

export const FOREST = KeyedForest.create(node => node.key || 'Life', node(undefined,
  node('Bacteria',
    node('Cyanobacteria'),
    node('Proteobacteria'),
    node('Gram Positives')
  ),
  node('Archaea',
    node('T. celer'),
    node('Methanobacterium')
  ),
  node('Eucaryota',
    node('Diplomonads'),
    node('Fungi'),
    node('Plants',
      node('Mosses'),
      node('Horsetails'),
      node('Seed plants',
        node('Flowers')
      )
    ),
    node('Animals',
      node('Invertebrates',
        node('Arachnids'),
        node('Insects'),
        node('Worms')
      ),
      node('Vertibrates',
        node('Fish'),
        node('Reptiles',
          node('Birds') // node with the same key
        ),
        node('Birds'), // node with the same key
        node('Mammals')
      )
    )
  )
));

export function toUnorderedJSON(forest: KeyedForest<Node>) {
  return nodesToUnorderedJSON(forest.root.children);
}

interface JSONNode {
  [key: string]: JSONNode;
}

function nodesToUnorderedJSON(nodes: List<Node>): JSONNode {
  if (!nodes) { return null; }
  const result: JSONNode = {};
  nodes.forEach(node => {
    result[node.key] = nodesToUnorderedJSON(node.children);
  });
  return result;
}
