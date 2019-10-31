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

import { Set } from 'immutable';

import { KeyedForest, Traversable, NodePath } from './KeyedForest';

export type TreeSelection<T> = KeyedForest<SelectionNode<T>>;

interface SelectionBrand { __selectionBrand: void; }
export type SelectionNode<T> = T & Traversable<T> & SelectionBrand;
export namespace SelectionNode {
  export function set<T>(node: T, props: Partial<Traversable<T>>) {
    return {...node as any, ...props} as SelectionNode<T>;
  }
}

export namespace TreeSelection {
  export function empty<T extends Traversable<T>>(base: KeyedForest<T>): TreeSelection<T> {
    const emptyRoot = {...base.root as Traversable<any>, children: []} as any as SelectionNode<T>;
    return (base as TreeSelection<T>).setRoot(emptyRoot);
  }

  /**
   * Returns true if selection node is terminal.
   * Terminal node don't have child selection nodes and represents fully
   * selected subtree from this node.
   */
  export function isTerminal<T>(node: SelectionNode<T>) {
    return !node.children;
  }

  /**
   * Returns true if selection node does not have any children
   * (terminal nodes are also leafs).
   */
  export function isLeaf<T>(node: SelectionNode<T>) {
    return isTerminal(node) || node.children.length === 0;
  }

  export function leafs<T>(selection: TreeSelection<T>) {
    type MutableNodes = Map<string, Set<SelectionNode<T>>>;
    return selection.nodes
      .map(nodes => nodes.find(isLeaf))
      .filter(node => !(node === undefined || selection.isRoot(node)))
      .toList();
  }

  export function nodesFromKey<T>(selection: TreeSelection<T> | undefined, key: string) {
    if (!selection) { return Set<SelectionNode<T>>(); }
    return selection.nodes.get(key) || Set<SelectionNode<T>>();
  }

  /**
   * Replaces selection children with a single terminal node.
   */
  export function setToSingleTerminal<T extends Traversable<T>>(
    selection: TreeSelection<T>, node: T
  ) {
    return selection.updateChildren(
      selection.getKeyPath(selection.root),
      () => [SelectionNode.set(node, {children: undefined})]
    );
  }

  /**
   * Creates a new tree selection by merging specified `path` (to tree node,
   * see `KeyedTree.getNodePath(element)`) into the specified `selection`.
   */
  export function select<T>(selection: TreeSelection<T>, path: NodePath<T>) {
    // common parent between old selection and newly selected path
    let parent: SelectionNode<T> = undefined;
    // leftover part of newly selected path
    const addedPath = path.slice();

    // searching for common part between current selection tree and newly selected path
    while (addedPath.length > 0) {
      const node = addedPath[0] as SelectionNode<T>;
      const key = selection.keyOf(node);
      const candidates = selection.nodes.get(key) || Set<SelectionNode<T>>();
      const selectedBranch = candidates.find(
        candidate => selection.getParent(candidate) === parent);
      if (!selectedBranch) { break; }
      parent = selectedBranch;
      // leave selection untouched if we are trying to select
      // a child of already selected leaf
      if (TreeSelection.isTerminal(parent)) { return selection; }
      addedPath.shift();
    }
    if (addedPath.length === 0) { return selection; }

    // transform leftover part of path into selection forest node
    const addedNode = addedPath.reduceRight<SelectionNode<T>>((previous, node) =>
      SelectionNode.set(node, {children: previous ? [previous] : []}), undefined);

    return selection.updateChildren(selection.getKeyPath(parent),
      children => addedNode ? [...children, addedNode] : undefined);
  }

  export function makeTerminal<T>(selection: TreeSelection<T>, key: string): TreeSelection<T> {
    const removeChildren = () => undefined;
    return (selection.nodes.get(key) || Set<SelectionNode<T>>()).reduce(
      (acc, node) => acc.updateChildren(acc.getKeyPath(node), removeChildren),
      selection
    );
  }

  export function selectTerminal<T>(selection: TreeSelection<T>, path: NodePath<T>) {
    const lastNode = path[path.length - 1] as SelectionNode<T>;
    return makeTerminal(select(selection, path), selection.keyOf(lastNode));
  }

  /**
   * Creates a new tree selection by removing any paths to nodes with
   * specified `key` from the specified `selection`.
   */
  export function unselect<T>(selection: TreeSelection<T>, key: string) {
    let current = selection;
    // iterate until all items with specified key are removed
    while (true) {
      const nodes = current.nodes.get(key);
      if (!nodes || nodes.size === 0) { return current; }

      const unselectedNode = nodes.first();
      if (current.isRoot(unselectedNode)) {
        // make root non-terminal when trying to unselect it
        return isTerminal(current.root)
          ? current.setRoot(SelectionNode.set(current.root, {children: []}))
          : current;
      }

      const pathToRemove = current.getNodePath(unselectedNode).slice();

      // walk up until encounter parent for multiple leafs
      // to remove all intermediate non-shared with other leafs parents
      let removedNode = pathToRemove.pop();
      for (const node of pathToRemove.reverse()) {
        if (current.isRoot(node)) { break; }
        if (node.children && node.children.length > 1) { break; }
        removedNode = node;
      }

      current = excludeNode(current, removedNode);
    }
  }

  function excludeNode<T>(selection: TreeSelection<T>, node: SelectionNode<T>) {
    const parent = selection.getParent(node);
    return selection.updateChildren(
      selection.getKeyPath(parent),
      children => children.filter(child => child !== node)
    );
  }

  export function selectAndCollapseToTerminal<T extends Traversable<T>>(
    selection: TreeSelection<T>,
    forest: KeyedForest<T>,
    subtree: T
  ) {
    const withSubtree = selectTerminal(selection, forest.getNodePath(subtree));
    const parent = forest.getParent(subtree);
    if (forest.isRoot(parent)) {
      return withSubtree;
    }

    const allChildrenSelected = parent.children.every(
      node => withSubtree.nodes.has(forest.keyOf(node)));
    return allChildrenSelected
      ? selectAndCollapseToTerminal(withSubtree, forest, parent)
      : withSubtree;
  }

  export function materializeAndExclude<T extends Traversable<T>>(
    selection: TreeSelection<T>,
    forest: KeyedForest<T>,
    defaultSelectedSubtree: T,
    options: { leaveParentSelected?: boolean } = {}
  ): TreeSelection<T> {
    const parent = forest.getParent(defaultSelectedSubtree);
    if (!parent) {
      return selection;
    }
    const parentPath = forest.getKeyPath(parent);
    const targetKey = forest.keyOf(defaultSelectedSubtree);
    selection = materializeTerminalChildren(selection, forest, parentPath);
    selection = selection.updateChildren(parentPath, children => children.filter(
      node => selection.keyOf(node) !== targetKey
    ));

    const selectionNode = selection.fromKeyPath(parentPath);
    if (selectionNode.children.length === 0 && !options.leaveParentSelected) {
      const parent = forest.fromKeyPath(parentPath);
      selection = materializeAndExclude(selection, forest, parent, options);
    }
    return selection;
  }

  function getParentPath(path: ReadonlyArray<string>): ReadonlyArray<string> {
    if (path.length === 0) {
      throw new Error('Cannot make parent path from root path');
    }
    return path.slice(0, path.length - 1);
  }

  function materializeTerminalChildren<T extends Traversable<T>>(
    selection: TreeSelection<T>,
    forest: KeyedForest<T>,
    path: ReadonlyArray<string>,
  ): TreeSelection<T> {
    if (!selection.fromKeyPath(path)) {
      const parentPath = getParentPath(path);
      selection = materializeTerminalChildren(selection, forest, parentPath);
    }
    const forestNode = forest.fromKeyPath(path);
    const selectionNode = selection.fromKeyPath(path);
    if (forestNode && isTerminal(selectionNode)) {
      return selection.updateChildren(path,
        () => forestNode.children.map(
          child => SelectionNode.set(child, {children: undefined})
        )
      );
    }
    return selection;
  }

  export function childOfParent<T>(
    forest: KeyedForest<T>,
    child: T,
    parentKey: string | undefined
  ): boolean {
    if (!parent) { return false; }
    let currentParent = forest.getParent(child);
    while (currentParent) {
      if (forest.keyOf(currentParent) === parentKey) { return true; }
      currentParent = forest.getParent(currentParent);
    }
    return false;
  }
}
