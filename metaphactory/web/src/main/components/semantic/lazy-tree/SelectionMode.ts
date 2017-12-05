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

import { KeyedForest } from './KeyedForest';
import { TreeSelection, SelectionNode } from './TreeSelection';

export interface SelectionMode<T> {
  readonly greyoutDefaultSelected?: boolean;
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
  selection: TreeSelection<T> | undefined,
  item: T,
  defaultSelected: boolean
) => CheckState;

export type ChangeSelection<T> = (
  forest: KeyedForest<T>,
  previous: TreeSelection<T>,
  item: T,
  defaultSelected: boolean
) => TreeSelection<T> | undefined;

const singleFullSubtree: SelectionMode<{}> = {
  renderSelected: (forest, selection, item, defaultSelected) => {
    if (defaultSelected) { return CheckState.Full; }
    if (selection) {
      const selected = selection.nodes.get(forest.keyOf(item));
      if (!selected || selected.size === 0) { return CheckState.None; }
      return selected.some(TreeSelection.isLeaf)
        ? CheckState.Full : CheckState.Partial;
    } else {
      return CheckState.None;
    }
  },
  change: (forest, previous, item, defaultSelected) => {
    const selected = TreeSelection.nodesFromKey(previous, forest.keyOf(item));
    const empty = TreeSelection.empty(forest.keyOf);
    if (renderedAsChecked(selected)) {
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
export function SingleFullSubtree<T>() {
  return singleFullSubtree as SelectionMode<T>;
}

const multipleFullSubtrees: SelectionMode<{}>  = {
  renderSelected: (forest, selection, item, defaultSelected) => {
    if (defaultSelected) { return CheckState.FullGreyedOut; }
    return singleFullSubtree.renderSelected(forest, selection, item, defaultSelected);
  },
  change: (forest, previous, item, defaultSelected) => {
    if (defaultSelected) { return undefined; }
    const selected = TreeSelection.nodesFromKey(previous, forest.keyOf(item));
    if (renderedAsChecked(selected)) {
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
export function MultipleFullSubtrees<T>() {
  return multipleFullSubtrees as SelectionMode<T>;
}

const multiplePartialSubtrees: SelectionMode<{}> = {
  renderSelected: singleFullSubtree.renderSelected,
  change: (forest, previous, item, defaultSelected) => {
    if (defaultSelected) {
      return TreeSelection.excludeFromTerminal(previous, forest, item);
    }
    const itemKey = forest.keyOf(item);
    const selected = TreeSelection.nodesFromKey(previous, itemKey);
    if (renderedAsChecked(selected)) {
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
export function MultiplePartialSubtrees<T>() {
  return multiplePartialSubtrees as SelectionMode<T>;
}

/**
 * Allows to select multiple subtrees and partially unselect their children.
 * Parent node is automatically unselected when all every children become
 * unselected and vice versa.
 * Can be used only with depth-lazy loading.
 */
export class SinglePartialSubtree<T> implements SelectionMode<T> {
  private _selectedRootKey: string;
  get selectedRootKey(): string {
    return this._selectedRootKey;
  }

  renderSelected(
    forest: KeyedForest<T>,
    selection: TreeSelection<T>,
    item: T,
    defaultSelected: boolean
  ) {
    const state = singleFullSubtree.renderSelected(forest, selection, item, defaultSelected);
    const checkedOutsideSubtree = state &&
      forest.keyOf(item) !== this.selectedRootKey &&
      !TreeSelection.childOfParent(forest, item, this.selectedRootKey);
    return checkedOutsideSubtree ? CheckState.None : state;
  }

  change(
    forest: KeyedForest<T>,
    previous: TreeSelection<T>,
    item: T,
    defaultSelected: boolean
  ): TreeSelection<T> | undefined {
    if (defaultSelected) {
      return TreeSelection.excludeFromTerminal(
        previous, forest, item, {leaveParentSelected: true});
    }

    const itemKey = forest.keyOf(item);
    const selected = TreeSelection.nodesFromKey(previous, itemKey);

    if (itemKey === this.selectedRootKey) {
      this._selectedRootKey = undefined;
      return TreeSelection.empty(forest.keyOf);
    } else if (TreeSelection.childOfParent(forest, item, this.selectedRootKey)) {
      if (renderedAsChecked(selected)) {
        let next = TreeSelection.unselect(previous, itemKey);
        const parent = forest.getParent(item);
        if (!next.nodes.has(forest.keyOf(parent))) {
          next = TreeSelection.select(next, forest.getNodePath(parent));
        }
        return next;
      } else {
        return TreeSelection.selectAndCollapseToTerminal(previous, forest, item);
      }
    } else {
      this._selectedRootKey = forest.keyOf(item);
      const empty = TreeSelection.empty(forest.keyOf);
      return TreeSelection.selectTerminal(empty, forest.getNodePath(item));
    }
  }
}

function renderedAsChecked<T>(nodes: Immutable.Set<SelectionNode<T>>): boolean {
  return nodes.size > 0 && nodes.some(TreeSelection.isLeaf);
}
