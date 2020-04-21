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

import { KeyedForest, Traversable } from './KeyedForest';
import { TreeSelection, SelectionNode } from './TreeSelection';

export interface SelectionMode<T> {
  readonly renderSelected: RenderSelected<T>;
  readonly change: ChangeSelection<T>;
}

export enum CheckState {
  None = 0,
  Partial,
  Full,
  FullGreyedOut,
}

export type RenderSelected<T> = (
  forest: KeyedForest<T>,
  item: T,
  selection: TreeSelection<T> | undefined,
  itemSelection: SelectionNode<T> | undefined,
  defaultSelection: SelectionNode<T> | undefined
) => CheckState;

export type ChangeSelection<T> = (
  forest: KeyedForest<T>,
  item: T,
  previous: TreeSelection<T>,
  itemSelection: SelectionNode<T> | undefined,
  defaultSelection: SelectionNode<T> | undefined
) => TreeSelection<T> | undefined;

interface Node extends Traversable<Node> {
  __nodeBrand: void;
}

const singleFullSubtree: SelectionMode<Node> = {
  renderSelected: (forest, item, selection, itemSelection, defaultSelection) => {
    if (defaultSelection) {
      return CheckState.Full;
    } else if (itemSelection) {
      return TreeSelection.isLeaf(itemSelection) ? CheckState.Full : CheckState.Partial;
    } else {
      return CheckState.None;
    }
  },
  change: (forest, item, previous, itemSelection, defaultSelection) => {
    const empty = TreeSelection.empty(forest);
    if (itemSelection) {
      return empty;
    }
    // When a user selects a node then we include it into tree selection.
    // At this point we don't know about all other nodes with the same key
    // in other parts of tree because they aren't loaded yet.
    // It's possible to include at least all currently loaded nodes into
    // the new selection but this wasn't implemented.
    return TreeSelection.selectTerminal(empty, forest.getNodePath(item));
  },
};
/**
 * Allows to select only single subtree. When a node is selected,
 * resets selection to subtree of the node.
 * Can be used with depth- and breadth-lazy loading.
 */
export function SingleFullSubtree<T>(): SelectionMode<T> {
  return singleFullSubtree as SelectionMode<any>;
}

const multipleFullSubtrees: SelectionMode<Node> = {
  renderSelected: (forest, item, selection, itemSelection, defaultSelection) => {
    if (defaultSelection) {
      return CheckState.FullGreyedOut;
    }
    return singleFullSubtree.renderSelected(forest, item, selection, itemSelection, defaultSelection);
  },
  change: (forest, item, previous, itemSelection, defaultSelection) => {
    if (defaultSelection) {
      return undefined;
    }
    if (itemSelection) {
      return TreeSelection.unselect(previous, forest.keyOf(item));
    } else {
      return TreeSelection.selectTerminal(previous, forest.getNodePath(item));
    }
  },
};
/**
 * Allows to select multiple whole subtrees (without the ability to
 * unselect selected node's children).
 * Can be used with depth- and breadth-lazy loading.
 */
export function MultipleFullSubtrees<T>(): SelectionMode<T> {
  return multipleFullSubtrees as SelectionMode<any>;
}

const multiplePartialSubtrees: SelectionMode<Node> = {
  renderSelected: singleFullSubtree.renderSelected,
  change: (forest, item, previous, itemSelection, defaultSelection) => {
    if (defaultSelection) {
      return TreeSelection.materializeAndExclude(previous, forest, item);
    }
    const itemKey = forest.keyOf(item);
    if (itemSelection) {
      return TreeSelection.unselect(previous, itemKey);
    } else {
      return TreeSelection.selectAndCollapseToTerminal(previous, forest, item);
    }
  },
};
/**
 * Allows to select single subtree and partially unselect its children.
 * Can be used only with depth-lazy loading.
 */
export function MultiplePartialSubtrees<T>(): SelectionMode<T> {
  return multiplePartialSubtrees as SelectionMode<any>;
}

interface SubtreeNode extends Node {
  isSubtreeRoot?: boolean;
}

export interface PartialSubtreesMode<T> extends SelectionMode<T> {
  isSelectedSubtree(itemSelection: SelectionNode<T>): boolean;
  getSelectedSubtrees(selection: TreeSelection<T>): Array<SelectionNode<T>>;
}

const partialSubtrees: PartialSubtreesMode<SubtreeNode> = {
  isSelectedSubtree: (itemSelection) => {
    return Boolean(itemSelection.isSubtreeRoot);
  },
  getSelectedSubtrees: (selection) => {
    const roots: Array<SelectionNode<SubtreeNode>> = [];
    selection.nodes.forEach((nodes) => {
      nodes.forEach((node) => {
        if (node.isSubtreeRoot) {
          roots.push(node);
        }
      });
    });
    return roots;
  },
  renderSelected: (forest, item, selection, itemSelection, defaultSelection) => {
    const state = singleFullSubtree.renderSelected(forest, item, selection, itemSelection, defaultSelection);
    const subtreeRoot = findSubtreeParent(selection, itemSelection);
    // hide partial selection of subtree parents
    return subtreeRoot || defaultSelection ? state : CheckState.None;
  },
  change: (forest, item, previous, itemSelection, defaultSelection) => {
    if (itemSelection && itemSelection.isSubtreeRoot) {
      const itemKey = forest.keyOf(item);
      return TreeSelection.unselect(previous, itemKey);
    }

    const itemPath = forest.getKeyPath(item);
    const parentSubtree = findSubtreeInPath(previous, itemPath);

    if (parentSubtree) {
      if (itemSelection || defaultSelection) {
        return TreeSelection.materializeAndExclude(previous, forest, item, { leaveParentSelected: true });
      } else {
        return TreeSelection.selectAndCollapseToTerminal(previous, forest, item);
      }
    } else {
      const selection = TreeSelection.selectTerminal(previous, forest.getNodePath(item));
      return selection.updateNode(itemPath, (node) => ({ ...node, isSubtreeRoot: true }));
    }
  },
};

function findSubtreeParent(
  selection: TreeSelection<SubtreeNode>,
  node: SelectionNode<SubtreeNode> | undefined
): SelectionNode<SubtreeNode> | undefined {
  let current = node;
  while (current) {
    if (current.isSubtreeRoot) {
      return current;
    }
    current = selection.getParent(current);
  }
  return undefined;
}

function findSubtreeInPath(
  selection: TreeSelection<SubtreeNode>,
  keyPath: ReadonlyArray<string>
): SelectionNode<SubtreeNode> | undefined {
  let node = selection.root;
  for (const childKey of keyPath) {
    if (node.isSubtreeRoot) {
      return node;
    }
    const index = selection.getChildIndex(node, childKey);
    if (typeof index !== 'number') {
      return undefined;
    }
    node = node.children[index] as SelectionNode<SubtreeNode>;
  }
  return undefined;
}

/**
 * Allows to select multiple subtrees and partially unselect their children.
 * Parent node is automatically unselected when all every children become
 * unselected and vice versa.
 * Can be used only with depth-lazy loading.
 */
export function PartialSubtrees<T>(): PartialSubtreesMode<T> {
  return partialSubtrees as PartialSubtreesMode<any>;
}
