/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { List } from 'immutable';

import { KeyedForest, TreeNode, mapBottomUp } from 'platform/components/semantic/lazy-tree';

export interface Node {
  readonly key: string;
  readonly children: ReadonlyArray<Node>;
  readonly hasMoreChildren?: boolean;
  readonly isExpanded?: boolean;
}

export function node(key: string, ...children: Node[]): Node {
  return { key, children };
}

export const FOREST = KeyedForest.create(
  (item) => item.key || 'Life',
  node(
    undefined,
    node('Bacteria', node('Cyanobacteria'), node('Proteobacteria'), node('Gram Positives')),
    node('Archaea', node('T. celer'), node('Methanobacterium')),
    node(
      'Eucaryota',
      node('Diplomonads'),
      node('Fungi'),
      node('Plants', node('Mosses'), node('Horsetails'), node('Seed plants', node('Flowers'))),
      node(
        'Animals',
        node('Invertebrates', node('Arachnids'), node('Insects'), node('Worms')),
        node(
          'Vertibrates',
          node('Fish'),
          node(
            'Reptiles',
            node('Birds') // node with the same key
          ),
          node('Birds'), // node with the same key
          node('Mammals')
        )
      )
    )
  )
);

export function cloneSubtree(forest: KeyedForest<Node>, key: string): Node {
  const cloneRoot = forest.getFirst(key);
  return mapBottomUp(cloneRoot, (item) => ({ ...item }));
}

export function toUnorderedJSON(forest: KeyedForest<Node>) {
  return nodesToUnorderedJSON(forest.root.children);
}

interface JSONNode {
  [key: string]: JSONNode;
}

function nodesToUnorderedJSON(nodes: ReadonlyArray<Node>): JSONNode {
  if (!nodes) {
    return null;
  }
  const result: JSONNode = {};
  for (const { key, children } of nodes) {
    result[key] = nodesToUnorderedJSON(children);
  }
  return result;
}
