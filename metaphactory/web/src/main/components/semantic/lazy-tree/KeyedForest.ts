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

import { List, Map, Set } from 'immutable';
import { assign } from 'lodash';

export type OffsetPath = ReadonlyArray<number>;
export type NodePath<T> = ReadonlyArray<T>;

export interface Traversable<T> {
  children?: List<T>;
}

interface ParentReference<T> {
  parent: T;
  index: number;
}

const EMPTY_ROOT: any = {children: List<any>()};

/**
 * Describes an immutable tree data structure
 * where every node has a string key.
 *
 * Tree assumes there is always a root node and
 * creates an empty one if there isn't.
 */
export class KeyedForest<T extends Traversable<T>> {
  /**
   * Map which holds all tree nodes indexed by their keys.
   * There could be multiple nodes with the same key.
   */
  readonly nodes: Map<string, Set<T>>;

  private readonly parents: Map<T, ParentReference<T>>;

  private constructor(
    public readonly keyOf: (node: T) => string,
    public readonly root = KeyedForest.root<T>()
  ) {
    const mutableNodes = Map<string, Set<T>>([
      [keyOf(root), Set([root])],
    ]).asMutable();
    const mutableParents = Map<T, ParentReference<T>>([
      [root, {parent: undefined, index: 0}],
    ]).asMutable();
    computeMappingAndPaths(this.keyOf, mutableNodes, mutableParents, root);
    this.nodes = mutableNodes.asImmutable();
    this.parents = mutableParents.asImmutable();
  }

  static create<T extends Traversable<T>>(
    keyOf: (node: T) => string,
    root = KeyedForest.root<T>()
  ) {
    return new KeyedForest(keyOf, root);
  }

  static root<T extends Traversable<T>>(): T {
    return EMPTY_ROOT as T;
  }

  /**
   * True if the node is a root of this tree; otherwise false.
   */
  isRoot(node: T) {
    return node === this.root;
  }

  /**
   * Returns any node with the specified key.
   */
  getFirst(key: string): T {
    const nodes = this.nodes.get(key);
    return nodes ? nodes.first() : undefined;
  }

  /**
   * Returns a parent node for the specified node in this tree,
   * or undefined if the specified node is root.
   */
  getParent(node: T): T | undefined {
    const reference = this.parents.get(node);
    return reference ? reference.parent : undefined;
  }

  /**
   * Returns a descending tree path from root to the specified node
   * as children indexes for subsequent .children lists.
   */
  getOffsetPath(node: T): OffsetPath {
    const path: number[] = [];
    let current = node;
    while (current) {
      const {parent, index} = this.parents.get(current);
      path.unshift(index);
      current = parent;
    }
    return path;
  }

  fromOffsetPath(path: OffsetPath): T {
    let current = this.root;
    for (let i = 1; i < path.length; i++) {
      current = current.children.get(path[i]);
    }
    return current;
  }

  /**
   * Returns a descending tree path from root to the specified node
   * as list of nodes including the specified node.
   */
  getNodePath(node: T): NodePath<T> {
    const path: T[] = [];
    let current = node;
    do {
      path.unshift(current);
      const {parent} = this.parents.get(current);
      current = parent;
    } while (current);
    return path;
  }

  setRoot(root: T) {
    return new KeyedForest(this.keyOf, root);
  }

  updateNode(path: OffsetPath, update: (node: T) => T) {
    if (path.length === 0) { throw new Error('OffsetPath cannot be empty'); }
    const root = this.updateNodeAt(this.root, path, 1, update);
    return this.setRoot(root);
  }

  private updateNodeAt(
    node: T, path: OffsetPath, pathIndex: number, update: (node: T) => T
  ) {
    if (pathIndex === path.length) {
      return update(node);
    } else {
      const index = path[pathIndex];
      const children = node.children.update(
        index, child => this.updateNodeAt(child, path, pathIndex + 1, update));
      return assign({}, node, {children}) as T;
    }
  }

  updateChildren(path: OffsetPath, update: (children: List<T>) => List<T>) {
    if (path.length === 0) { throw new Error('OffsetPath cannot be empty'); }
    return this.updateNode(path, node =>
      assign({}, node, {children: update(node.children)}) as T);
  }
}

function computeMappingAndPaths<T extends Traversable<T>>(
  keyOf: (node: T) => string,
  mutableMapping: Map<string, Set<T>>,
  mutableParents: Map<T, ParentReference<T>>,
  parent: T
) {
  if (!parent.children) { return; }

  parent.children.forEach((node, index) => {
    mutableParents.set(node, {parent, index});
    mutableMapping.update(keyOf(node), Set<T>(), items => items.add(node));

    computeMappingAndPaths(keyOf, mutableMapping, mutableParents, node);
  });
}
