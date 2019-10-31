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

/**
 * Break cycles in directed graph using topological sort.
 */
export function breakGraphCycles<T extends { children: Set<T>; }>(graph: T[]) {
  const visiting = new Set<T>();
  const visited = new Set<T>();
  const edgesToRemove: Array<[T, T]> = [];

  const toVisit = graph.slice();
  while (toVisit.length > 0) {
    const node = toVisit.pop();
    if (visited.has(node)) { continue; }

    if (visiting.has(node)) {
      visiting.delete(node);
      visited.add(node);
    } else {
      visiting.add(node);
      toVisit.push(node);

      node.children.forEach(child => {
        if (visiting.has(child)) {
          edgesToRemove.push([node, child]);
        } else if (!visited.has(child)) {
          toVisit.push(child);
        }
      });
    }
  }

  for (const [parent, child] of edgesToRemove) {
    parent.children.delete(child);
  }
}

/**
 * Remove redundant edges from directed acyclic graph
 * (so reachablility would be the same), should be O(N(N + E)).
 */
export function transitiveReduction<T extends { children: Set<T>; }>(graph: T[]) {
  const edgesToRemove: Array<[T, T]> = [];
  const visited = new Set<T>();

  function searchForRedundantEdges(parent: T, currentChild: T) {
    visited.add(currentChild);
    currentChild.children.forEach(grandChild => {
      if (visited.has(grandChild)) { return; }
      if (parent.children.has(grandChild)) {
        edgesToRemove.push([parent, grandChild]);
      }
      searchForRedundantEdges(parent, grandChild);
    });
  }

  for (const node of graph) {
    node.children.forEach(child => {
      visited.clear();
      searchForRedundantEdges(node, child);
    });
  }

  for (const [parent, child] of edgesToRemove) {
    parent.children.delete(child);
  }
}

export function findRoots<T extends { children: Set<T>; }>(graph: T[]): Set<T> {
  const roots = new Set(graph);
  graph.forEach(node => {
    node.children.forEach(child => roots.delete(child));
  });
  return roots;
}
