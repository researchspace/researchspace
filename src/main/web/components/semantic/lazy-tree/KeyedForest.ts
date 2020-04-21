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

import * as Immutable from 'immutable';

export type KeyPath = ReadonlyArray<string>;
export type NodePath<T> = ReadonlyArray<T>;

export interface Traversable<T> {
  readonly children?: ReadonlyArray<T>;
}

interface ParentReference<T> {
  readonly parent: T;
  readonly index: number;
}

/**
 * Describes an immutable tree data structure
 * where every node has a string key.
 *
 * There could be multiple nodes with the same key but they should have
 * different identities (determined by `Immutable.is()` value equality test).
 */
export class KeyedForest<T extends Traversable<T>> {
  /**
   * Map which holds all tree nodes indexed by their keys.
   */
  readonly nodes: Immutable.Map<string, Immutable.Set<T>>;

  private readonly parents: Immutable.Map<T, ParentReference<T>>;

  private constructor(public readonly keyOf: (node: T) => string, public readonly root: T) {
    const mutableNodes = Immutable.Map<string, Immutable.Set<T>>([[keyOf(root), Immutable.Set([root])]]).asMutable();
    const mutableParents = Immutable.Map<T, ParentReference<T>>([[root, { parent: undefined, index: 0 }]]).asMutable();
    computeMappingAndPaths(this.keyOf, mutableNodes, mutableParents, root);
    this.nodes = mutableNodes.asImmutable();
    this.parents = mutableParents.asImmutable();
  }

  static create<T extends Traversable<T>>(keyOf: (node: T) => string, root: T) {
    return new KeyedForest(keyOf, root);
  }

  /**
   * True if the node is a root of this tree; otherwise false.
   */
  isRoot(node: T): boolean {
    return node === this.root;
  }

  /**
   * Returns any node with the specified key.
   */
  getFirst(key: string): T | undefined {
    const nodes = this.nodes.get(key);
    return nodes ? nodes.first() : undefined;
  }

  /**
   * Returns a parent node for the specified node in this tree,
   * or undefined if the specified node is root.
   */
  getParent(node: T): T | undefined {
    const reference = this.parents.get(node);
    if (!reference) {
      throw new Error('Cannot get parent for node from another forest.');
    }
    return reference.parent;
  }

  /**
   * Returns a descending tree path from root to the specified node
   * represented by subsequent node keys.
   */
  getKeyPath(node: T): KeyPath {
    const path: string[] = [];
    let current = node;
    while (current) {
      const reference = this.parents.get(current);
      if (!reference) {
        throw new Error('Cannot compute path to node from another forest.');
      }
      const { parent } = reference;
      if (parent) {
        path.unshift(this.keyOf(current));
      }
      current = parent;
    }
    return path;
  }

  fromKeyPath(path: KeyPath): T | undefined {
    let current = this.root;
    for (const childKey of path) {
      const index = this.getChildIndex(current, childKey);
      if (typeof index !== 'number') {
        return undefined;
      }
      current = current.children[index];
      if (!current) {
        break;
      }
    }
    return current;
  }

  getChildIndex(parent: T, childKey: string): number | undefined {
    const candidates = this.nodes.get(childKey);
    if (!candidates) {
      return undefined;
    }
    let reference: ParentReference<T> | undefined;
    candidates.find((child) => {
      reference = this.parents.get(child);
      return reference && reference.parent === parent;
    });
    return reference ? reference.index : undefined;
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
      const { parent } = this.parents.get(current);
      current = parent;
    } while (current);
    return path;
  }

  setRoot(root: T) {
    return new KeyedForest(this.keyOf, root);
  }

  mapRoot(update: (root: T) => T) {
    return this.setRoot(update(this.root));
  }

  updateNode(path: KeyPath, update: (node: T) => T) {
    const root = this.updateNodeAt(this.root, path, 0, update);
    return this.setRoot(root);
  }

  removeNode(path: KeyPath) {
    if (path.length === 0) {
      throw new Error('Cannot remove root node.');
    }
    const lastKeyIndex = path.length - 1;
    const parentPath = path.slice(0, lastKeyIndex);
    return this.updateNode(parentPath, (parent) => {
      const index = this.getChildIndex(parent, path[lastKeyIndex]);
      const children = [...parent.children];
      children.splice(index, 1);
      return { ...(parent as any), children } as T;
    });
  }

  private updateNodeAt(node: T, path: KeyPath, pathIndex: number, update: (node: T) => T): T {
    if (pathIndex === path.length) {
      return update(node);
    } else {
      const childKey = path[pathIndex];
      const index = this.getChildIndex(node, childKey);
      const child = node.children[index];
      const children = [...node.children];
      children.splice(index, 1, this.updateNodeAt(child, path, pathIndex + 1, update));
      return { ...(node as any), children } as T;
    }
  }

  updateChildren(path: KeyPath, update: (children: ReadonlyArray<T>) => ReadonlyArray<T>) {
    return this.updateNode(path, (node) => ({ ...(node as any), children: update(node.children) } as T));
  }
}

function computeMappingAndPaths<T extends Traversable<T>>(
  keyOf: (node: T) => string,
  mutableMapping: Immutable.Map<string, Immutable.Set<T>>,
  mutableParents: Immutable.Map<T, ParentReference<T>>,
  parent: T
) {
  if (!parent.children) {
    return;
  }

  parent.children.forEach((node, index) => {
    mutableParents.update(node, (existing) => {
      if (existing) {
        throw new Error(
          `Duplicate item '${keyOf(node)}' exists in both ` +
            `'${keyOf(existing.parent)}' and '${keyOf(parent)}' parents`
        );
      }
      return { parent, index };
    });
    mutableMapping.update(keyOf(node), Immutable.Set<T>(), (items) => items.add(node));

    computeMappingAndPaths(keyOf, mutableMapping, mutableParents, node);
  });
}

export function mapBottomUp<T extends Traversable<T>>(root: T, mapper: (node: T) => T): T {
  const mapNode = (node: T) => {
    if (node.children) {
      const children = node.children.map(mapNode);
      return mapper({ ...(node as any), children });
    } else {
      return mapper(node);
    }
  };
  return mapNode(root);
}
