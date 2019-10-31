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

import * as Kefir from 'kefir';

import { KeyedForest, KeyPath, Traversable } from './KeyedForest';

export interface TreeNode {
  readonly children?: ReadonlyArray<TreeNode>;
  readonly expanded?: boolean;
  readonly loading?: boolean;
  readonly error?: boolean;
}
export namespace TreeNode {
  export type Properties<T> = {
    children?: ReadonlyArray<T>;
    expanded?: boolean;
    loading?: boolean;
    error?: boolean;
  };

  export function set<T extends TreeNode>(node: T, props: Properties<T>): T {
    return {...node as any, ...props} as T;
  }
}

export type ChildrenLoader<T> = (parent: T) => Kefir.Property<T>;
export type ForestChange<T> = Kefir.Property<(forest: KeyedForest<T>) => KeyedForest<T>>;

export function queryMoreChildren<T extends TreeNode & Traversable<T>>(
  loadChildren: ChildrenLoader<T>,
  forest: KeyedForest<T>,
  path: KeyPath
): [KeyedForest<T>, ForestChange<T>] {
  const node = forest.fromKeyPath(path);
  if (node.loading || node.error) { return [forest, Kefir.constant(r => r)]; }

  const newForest = forest.updateNode(path, target => TreeNode.set(target, {loading: true}));

  const change = loadChildren(node).map(loaded => {
    return (currentForest: KeyedForest<T>) => currentForest.updateNode(path, () => {
      if (loaded.error) {
        console.error(loaded.error);
      }
      return TreeNode.set(loaded, {loading: false});
    });
  });

  return [newForest, change];
}

export function mergeRemovingDuplicates<T>(
  keyOf: (item: T) => string,
  oldNodes: ReadonlyArray<T>,
  newNodes: ReadonlyArray<T>
): T[] {
  const existingKeys: { [key: string]: T } = Object.create(null);
  oldNodes.forEach(node => { existingKeys[keyOf(node)] = node; });
  const nodes = [...oldNodes];
  // don't trust data source to return elements with distinct IRIs
  for (const node of newNodes) {
    const key = keyOf(node);
    if (!existingKeys[key]) {
      existingKeys[key] = node;
      nodes.push(node);
    }
  }
  return nodes;
}

export function loadPath<T extends TreeNode & Traversable<T>>(
  shouldLoadChildren: (parent: T) => boolean,
  loadChildren: ChildrenLoader<T>,
  forest: KeyedForest<T>,
  path: KeyPath
): Kefir.Property<KeyedForest<T>> {
  let pathIndex = 0;
  let latest = forest;
  const loadedPath = [...latest.getKeyPath(latest.root)];

  return Kefir.repeat<boolean>(() => {
    if (pathIndex >= path.length) {
      return false;
    }
    const targetKey = path[pathIndex];
    const parent = latest.fromKeyPath(loadedPath);

    if (shouldLoadChildren(parent)) {
      const parentPath = latest.getKeyPath(parent);
      const [loading, forestChange] = queryMoreChildren(loadChildren, latest, parentPath);
      return forestChange.map(change => {
        latest = change(latest);
        return true;
      });
    }

    const children: ReadonlyArray<T> = parent.children;
    if (children) {
      const target = children.find(child => latest.keyOf(child) === targetKey);
      if (target) {
        pathIndex++;
        loadedPath.push(targetKey);
        return Kefir.constant(true);
      }
    }

    return Kefir.constantError<any>(new Error(
      `Failed to find child ${targetKey} on parent ${latest.keyOf(parent)}`
    ));
  }).takeErrors(1).last().map(() => latest).toProperty();
}

export function expandPath<T extends TreeNode & Traversable<T>>(
  forest: KeyedForest<T>, path: KeyPath
) {
  const expandNode = (node: T, nextPathIndex: number): T => {
    if (nextPathIndex >= path.length) {
      // leave target node collapsed
      return node;
    }
    const key = path[nextPathIndex];
    const index = forest.getChildIndex(node, key);
    const child = node.children[index];
    const children = [...node.children];
    children.splice(index, 1, expandNode(child, nextPathIndex + 1));
    return TreeNode.set(node, {children, expanded: true});
  };
  return forest.setRoot(expandNode(forest.root, 0));
}
