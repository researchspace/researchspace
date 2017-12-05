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

import * as Kefir from 'kefir';
import { assign } from 'lodash';
import { List, Iterable } from 'immutable';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';
import { Cancellation } from 'platform/api/async';

import { KeyedForest, OffsetPath } from './KeyedForest';
import { LazyTreeSelector, LazyTreeSelectorProps as LazyTreeProps } from './LazyTreeSelector';
import { breakGraphCycles, transitiveReduction, findRoots } from './GraphAlgorithms';

export interface Node {
  readonly iri: Rdf.Iri;
  readonly label?: Rdf.Literal;
  readonly children?: List<Node>;
  readonly expanded?: boolean;

  readonly loading?: boolean;
  readonly error?: boolean;
  readonly hasMoreItems?: boolean;

  /** search relevance */
  readonly score?: number;
}
export namespace Node {
  export type Properties = {
    label?: Rdf.Literal;
    children?: List<Node>;
    expanded?: boolean;
    loading?: boolean;
    error?: boolean;
    hasMoreItems?: boolean;
    score?: number;
  };

  export function set(node: Node, props: Properties) {
    return assign({}, node, props) as Node;
  }
}

export type NodeTreeProps = LazyTreeProps<Node>;
export type NodeTreeSelector = { new (props: LazyTreeProps<Node>): LazyTreeSelector<Node> };
export const NodeTreeSelector = LazyTreeSelector as NodeTreeSelector;

const ROOT_IRI = Rdf.iri('tree:root');
export const EmptyForest = KeyedForest.create(
  (node: Node) => (node.iri || ROOT_IRI).value);

export type RootsChange = Kefir.Property<(forest: KeyedForest<Node>) => KeyedForest<Node>>;

export function queryMoreChildren(
  forest: KeyedForest<Node>,
  path: OffsetPath,
  rootsQuery: SparqlJs.SelectQuery,
  childrenQuery: SparqlJs.SelectQuery,
  limit: number,
  options: SparqlClient.SparqlOptions
): [KeyedForest<Node>, RootsChange] {
  const node = forest.fromOffsetPath(path);
  if (node.loading || node.error) { return [forest, Kefir.constant(r => r)]; }

  const newForest = forest.updateNode(path, target => Node.set(target, {loading: true}));

  const parametrized = forest.isRoot(node)
    ? rootsQuery : SparqlClient.setBindings(childrenQuery, {'parent': node.iri});
  parametrized.limit = limit;
  parametrized.offset = node.children ? node.children.size : 0;
  parametrized.variables = ['?item', '?label', '?hasChildren'] as SparqlJs.Term[];

  type Result = { nodes?: List<Node>; error?: any; };
  const change = SparqlClient.select(parametrized, options)
    .map<Result>(queryResult => ({nodes: nodesFromQueryResult(queryResult)}))
    .flatMapErrors<Result>(error => Kefir.constant({error}))
    .map(({nodes, error}) => {
      return (currentForest: KeyedForest<Node>) => currentForest.updateNode(path, target => {
        if (error) {
          console.error(error);
          return Node.set(target, {loading: false, error});
        } else {
          const initialChildren = target.children ? target.children : List<Node>();
          const children = mergeRemovingDuplicates(initialChildren, nodes);
          return Node.set(target, {
            loading: false, error: undefined, children,
            hasMoreItems: children.size !== initialChildren.size && nodes.size === limit,
          });
        }
      });
    })
    .toProperty();

  return [newForest, change];
}

export function mergeRemovingDuplicates(oldNodes: List<Node>, newNodes: List<Node>) {
  const existingKeys: { [key: string]: Node } = {};
  oldNodes.forEach(node => { existingKeys[node.iri.value] = node; });
  // don't trust data source to return elements with distinct IRIs
  return oldNodes.withMutations(nodes => {
    newNodes.forEach(node => {
      if (!existingKeys[node.iri.value]) {
        existingKeys[node.iri.value] = node;
        nodes.push(node);
      }
    });
  });
}

export function nodesFromQueryResult(result: SparqlClient.SparqlSelectResult): List<Node> {
  return List(result.results.bindings.map<Node>(binding => {
    const {item, label, hasChildren} = binding;
    if (!(item && item.isIri())) { return undefined; }

    const nodeLabel = (label && label.isLiteral()) ? label : undefined;

    if (hasChildren && hasChildren.value === 'false') {
      return {iri: item, label: nodeLabel, children: List<Node>(), hasMoreItems: false};
    } else {
      return {iri: item, label: nodeLabel, hasMoreItems: true};
    }
  }).filter(node => node !== undefined));
}

export interface MutableNode {
  iri: Rdf.Iri;
  label: Rdf.Literal;
  hasMoreItems: boolean;
  children: Set<MutableNode>;
  score?: number;
}

export function restoreForestFromLeafs(
  leafs: Iterable<any, Node>,
  parentsQuery: SparqlJs.SelectQuery,
  cancellation: Cancellation,
  options: SparqlClient.SparqlOptions
): Kefir.Property<List<Node>> {
  const initialOrphans = leafs
    .groupBy(node => node.iri.value)
    .map(group => group.first())
    .map<MutableNode>(({iri, label, score, hasMoreItems}) => ({
        iri, label, score, hasMoreItems,
        children: new Set<MutableNode>(),
    }))
    .toArray();

  if (initialOrphans.length === 0) {
    return Kefir.constant(List<Node>());
  }

  return restoreGraphFromLeafs(initialOrphans, parentsQuery, cancellation, options)
    .map(nodes => {
      const graph = Array.from(nodes.values());
      breakGraphCycles(graph);
      transitiveReduction(graph);
      const roots = findRoots(graph);
      return asImmutableForest(roots);
    });
}

function restoreGraphFromLeafs(
  leafs: MutableNode[],
  parentsQuery: SparqlJs.SelectQuery,
  cancellation: Cancellation,
  options: SparqlClient.SparqlOptions
): Kefir.Property<Map<string, MutableNode>> {
  return Kefir.stream<Map<string, MutableNode>>(emitter => {
    const nodes = new Map(leafs.map<[string, MutableNode]>(
      node => [node.iri.value, node]));
    let unresolvedOrphans = new Set(nodes.keys());
    let disposed = false;

    cancellation.onCancel(() => { disposed = true; });

    const onError = (error: any) => {
      disposed = true;
      emitter.error(error);
      emitter.end();
    };

    type ParentsResult = { requested: string[]; result: SparqlClient.SparqlSelectResult; };
    let onResult: (result: ParentsResult) => void;

    const request = (orphanKeys: string[]) => {
      const parametrized = SparqlClient.prepareParsedQuery(
        orphanKeys.map(key => ({'item': Rdf.iri(key)})))(parentsQuery);
      SparqlClient.select(parametrized, options)
        .map(result => ({result, requested: orphanKeys}))
        .onValue(onResult)
        .onError(onError);
    };

    onResult = ({result, requested}) => {
      if (disposed) { return; }

      for (const {item, parent, parentLabel} of result.results.bindings) {
        if (!(item.isIri() && parent.isIri())) { continue; }

        unresolvedOrphans.delete(item.value);
        const node = nodes.get(item.value);

        const existingNode = nodes.get(parent.value);
        if (existingNode) {
          existingNode.children.add(node);
        } else {
          const parentOrphan: MutableNode = {
            iri: parent,
            label: (parentLabel && parentLabel.isLiteral()) ? parentLabel : undefined,
            hasMoreItems: false,
            children: new Set<MutableNode>([nodes.get(item.value)]),
          };
          nodes.set(parentOrphan.iri.value, parentOrphan);
          unresolvedOrphans = unresolvedOrphans.add(parentOrphan.iri.value);
        }
      }

      for (const requestedKey of requested) {
        unresolvedOrphans.delete(requestedKey);
      }

      if (unresolvedOrphans.size === 0) {
        emitter.emit(nodes);
        emitter.end();
      } else {
        request(Array.from(unresolvedOrphans.values()));
      }
    };

    request(leafs.map(orphan => orphan.iri.value));

    return () => { disposed = true; };
  }).toProperty();
}

/** Convert into immutable tree and sort by search relevance. */
function asImmutableForest(roots: Set<MutableNode>): List<Node> {
  return List(Array.from(roots).map<Node>(root => {
    const children = asImmutableForest(root.children).sortBy(node => -node.score).toList();
    const total = children.reduce((sum, {score}) => sum + score, 0);
    const hasMoreItems = root.hasMoreItems && root.children.size === 0;
    return {
      iri: root.iri,
      label: root.label,
      children,
      expanded: !hasMoreItems,
      hasMoreItems: hasMoreItems,
      score: total + (root.score === undefined ? 0 : root.score),
    };
  }));
}
