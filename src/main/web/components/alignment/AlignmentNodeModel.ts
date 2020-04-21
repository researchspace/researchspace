/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as Kefir from 'kefir';
import * as Immutable from 'immutable';
import * as SparqlJs from 'sparqljs';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';

import {
  KeyedForest,
  KeyPath,
  TreeNode,
  Node,
  SparqlNodeModel,
  TreeSelection,
  Traversable,
  SelectionNode,
  nodesFromQueryResult,
  mergeRemovingDuplicates,
} from 'platform/components/semantic/lazy-tree';

export enum AlignKind {
  ExactMatch = 1,
  NarrowerMatch,
  MatchChild,
}

export interface AlignmentNode extends TreeNode {
  readonly children: ReadonlyArray<AlignmentNode>;
  readonly base?: Node;
  readonly aligned?: Node;
  readonly alignKind: AlignKind;
  /** Keys of excluded from aligned subtree nodes. */
  readonly excludeFromAlignment: Immutable.Set<string>;
  /**
   * True if node is an ancestor of either aligned or decorated as aligned child.
   * ("Term has aligned descedants.")
   */
  readonly decorateAlignParent?: boolean;
  /** Corresponding target node for nodes in source tree. */
  readonly matchedTargetNode?: Node;
  /** True if node is a matched child in the source tree. */
  readonly decorateAlignChild?: boolean;
}

export namespace AlignmentNode {
  export const rootKey = 'AlignmentNode:root';
  export const keyOf = (node: AlignmentNode) => {
    return node.base ? Node.keyOf(node.base) : node.aligned ? Node.keyOf(node.aligned) : rootKey;
  };
  export const empty: AlignmentNode = {
    alignKind: AlignKind.ExactMatch,
    excludeFromAlignment: Immutable.Set<string>(),
    children: [],
  };
  export const readyToLoadBaseForest = KeyedForest.create(AlignmentNode.keyOf, {
    ...empty,
    base: Node.readyToLoadRoot,
  });

  export function set(node: AlignmentNode, props: Partial<AlignmentNode>): AlignmentNode {
    return { ...node, ...props };
  }

  export function getMatchTarget(node: AlignmentNode, forest: KeyedForest<AlignmentNode>) {
    return node.alignKind === AlignKind.ExactMatch ? node : forest.getParent(node);
  }

  export function setExactMatch(
    target: AlignmentNode,
    match: Node,
    excludeFromAlignment: Immutable.Set<string>
  ): AlignmentNode {
    let children = target.children.filter((child) => child.base);
    if (match.children) {
      const narrowerMatches = asMatchChildren(match.children, excludeFromAlignment);
      children = mergeChildren(children, narrowerMatches);
    }
    return set(target, { aligned: match, excludeFromAlignment, children });
  }

  export function addNarrowMatches(target: AlignmentNode, matches: ReadonlyArray<AlignmentNode>): AlignmentNode {
    const children = mergeChildren(target.children, matches);
    return set(target, { children });
  }

  export function unalign(node: AlignmentNode): AlignmentNode | undefined {
    if (node.aligned) {
      if (node.alignKind === AlignKind.ExactMatch) {
        return AlignmentNode.set(node, {
          aligned: undefined,
          children: node.children.filter((child) => child.alignKind !== AlignKind.MatchChild),
        });
      } else if (node.alignKind === AlignKind.NarrowerMatch) {
        return undefined;
      }
    }
    return node;
  }
}

export interface AlignmentMatch {
  kind: AlignKind.ExactMatch | AlignKind.NarrowerMatch;
  iri: Rdf.Iri;
  excluded: Immutable.Set<string>;
}

export interface AlignmentState {
  readonly matches: Immutable.Map<string, ReadonlyArray<AlignmentMatch>>;
  readonly metadata: AlignmentMetadata;
}

export interface AlignmentMetadata {
  iri: Data.Maybe<Rdf.Iri>;
  source: Rdf.Iri;
  target: Rdf.Iri;
  label: string;
  description: string;
}

export interface LoadedState {
  source: KeyedForest<AlignmentNode>;
  target: KeyedForest<AlignmentNode>;
}

export class AlignmentNodeModel {
  private readonly baseModel: SparqlNodeModel;
  private readonly alignedModel: SparqlNodeModel;

  private readonly baseNodeQuery: SparqlJs.SelectQuery | undefined;
  private readonly alignNodeQuery: SparqlJs.SelectQuery | undefined;

  constructor(params: {
    baseModel: SparqlNodeModel;
    alignedModel: SparqlNodeModel;
    /**
     * Node info query with [?item] inputs through VALUES(...) clause
     * and [?item, ?label, ?hasChildren] output variables.
     */
    baseNodeQuery?: SparqlJs.SelectQuery;
    alignNodeQuery?: SparqlJs.SelectQuery;
  }) {
    const { baseModel, alignedModel, baseNodeQuery, alignNodeQuery } = params;
    this.baseModel = baseModel;
    this.alignedModel = alignedModel;
    this.baseNodeQuery = baseNodeQuery;
    this.alignNodeQuery = alignNodeQuery;
  }

  hasMoreChildren(node: AlignmentNode): boolean {
    return (
      (node.base && this.baseModel.hasMoreChildren(node.base)) ||
      (node.aligned && this.alignedModel.hasMoreChildren(node.aligned))
    );
  }

  loadMoreChildren(parent: AlignmentNode): Kefir.Property<AlignmentNode> {
    const { base, aligned } = parent;
    if (!base && !aligned) {
      return Kefir.constant(parent);
    }

    return Kefir.combine({
      base: base && !base.reachedLimit ? this.baseModel.loadMoreChildren(base) : Kefir.constant(undefined),
      aligned:
        aligned && !aligned.reachedLimit ? this.alignedModel.loadMoreChildren(aligned) : Kefir.constant(undefined),
    })
      .map((loaded) => {
        let result = parent;

        if (loaded.base) {
          const baseChildren = loaded.base.children.map(asBaseNode);
          result = AlignmentNode.set(result, {
            base: loaded.base,
            children: mergeChildren(result.children, baseChildren),
          });
        }

        if (loaded.aligned) {
          const matchChildren = asMatchChildren(loaded.aligned.children, parent.excludeFromAlignment);
          result = AlignmentNode.set(result, {
            aligned: loaded.aligned,
            children: mergeChildren(result.children, matchChildren),
          });
        }

        const error = (result.base && result.base.error) || (result.aligned && result.aligned.error) || undefined;
        result = AlignmentNode.set(result, { error });

        return result;
      })
      .flatMapErrors((error) => Kefir.constant(AlignmentNode.set(parent, { error })))
      .take(1)
      .toProperty();
  }

  loadState(state: AlignmentState): Kefir.Property<LoadedState> {
    const targetsToLoad = state.matches.keySeq().toArray().map(Rdf.iri);
    const sourcesToLoad: Rdf.Iri[] = [];
    state.matches.forEach((matches) => {
      matches.forEach((match) => sourcesToLoad.push(match.iri));
    });

    if (sourcesToLoad.length === 0) {
      return Kefir.constant({
        source: AlignmentNode.readyToLoadBaseForest,
        target: AlignmentNode.readyToLoadBaseForest,
      });
    }

    function matchTargetNodes(targetTree: AlignmentNode, sourceLeafs: Immutable.Map<string, Node>) {
      let result = KeyedForest.create(AlignmentNode.keyOf, targetTree);
      state.matches.forEach((matches, targetKey) => {
        const exact = matches.find((match) => match.kind === AlignKind.ExactMatch);
        const narrow = matches.filter((match) => match.kind === AlignKind.NarrowerMatch);
        result.nodes.get(targetKey).forEach((target) => {
          result = result.updateNode(result.getKeyPath(target), (node) => {
            let aligned = node;
            if (exact) {
              aligned = AlignmentNode.setExactMatch(aligned, sourceLeafs.get(exact.iri.value), exact.excluded);
            }
            aligned = AlignmentNode.addNarrowMatches(
              aligned,
              narrow.map((match) => asNarrowMatch(sourceLeafs.get(match.iri.value), match.excluded))
            );
            return aligned;
          });
        });
      });
      return result;
    }

    return Kefir.combine({
      sourceData: this.loadSkeleton({ iris: sourcesToLoad, useBaseModel: false }),
      targetData: this.loadSkeleton({ iris: targetsToLoad, useBaseModel: true }),
    })
      .map(({ sourceData, targetData }) => {
        const source = KeyedForest.create(AlignmentNode.keyOf, sourceData.tree);
        const target = matchTargetNodes(targetData.tree, sourceData.leafs);
        return { source, target };
      })
      .toProperty();
  }

  private loadSkeleton(params: { iris: ReadonlyArray<Rdf.Iri>; useBaseModel: boolean }) {
    const model = params.useBaseModel ? this.baseModel : this.alignedModel;
    const nodeQuery = params.useBaseModel ? this.baseNodeQuery : this.alignNodeQuery;
    return loadNodesUsingNodeQuery(params.iris, nodeQuery, model.sparqlOptions()).flatMap((leafs) => {
      return model
        .loadFromLeafs(leafs.toArray(), { transitiveReduction: false })
        .map(asBaseNode)
        .map((tree) => ({ leafs, tree }));
    });
  }
}

function loadNodesUsingNodeQuery(
  iris: ReadonlyArray<Rdf.Iri>,
  nodeQuery: SparqlJs.SelectQuery,
  sparqlOptions: SparqlClient.SparqlOptions
): Kefir.Property<Immutable.Map<string, Node>> {
  const parameters = iris.map((iri) => ({ item: iri }));
  const parametrized = SparqlClient.prepareParsedQuery(parameters)(nodeQuery);
  return SparqlClient.select(parametrized, sparqlOptions).map((result) => {
    const nodes = nodesFromQueryResult(result);
    return Immutable.Map(nodes.map((node) => [node.iri.value, node] as [string, Node]));
  });
}

export function unalignAll(
  forest: KeyedForest<AlignmentNode>,
  sourceKey: string,
  targetKey: string
): KeyedForest<AlignmentNode> {
  let result = forest;
  while (true) {
    const target = findFirstAlignmentTarget(result, sourceKey, targetKey);
    if (!target) {
      break;
    }
    const unaligned = AlignmentNode.unalign(target);
    const path = result.getKeyPath(target);
    result = unaligned ? result.updateNode(path, () => unaligned) : result.removeNode(path);
  }
  return result;
}

function findFirstAlignmentTarget(forest: KeyedForest<AlignmentNode>, sourceKey: string, targetKey: string) {
  const emptyNodes = Immutable.Set<AlignmentNode>();
  const narrowMatch = forest.nodes
    .get(sourceKey, emptyNodes)
    .find((node) => node.alignKind === AlignKind.NarrowerMatch);
  if (narrowMatch) {
    return narrowMatch;
  }
  const exactMatch = forest.nodes
    .get(targetKey, emptyNodes)
    .find((node) => node.aligned && Node.keyOf(node.aligned) === sourceKey && node.alignKind === AlignKind.ExactMatch);
  return exactMatch;
}

export interface AlignValidationResult {
  valid: boolean;
  message?: string;
}

export function validateAlignment(
  forest: KeyedForest<AlignmentNode>,
  targetPath: KeyPath,
  source: Node,
  kind: AlignKind
): AlignValidationResult {
  // const target = forest.fromKeyPath(targetPath);
  // TODO
  return { valid: true };
}

function asBaseNode(node: Node): AlignmentNode {
  return AlignmentNode.set(AlignmentNode.empty, {
    base: node,
    children: (node.children || []).map(asBaseNode),
  });
}

function asMatchChildren(
  children: ReadonlyArray<Node> | undefined,
  excludeFromAlignment: Immutable.Set<string>
): ReadonlyArray<AlignmentNode> {
  return (children || [])
    .filter((node) => !excludeFromAlignment.has(Node.keyOf(node)))
    .map((node) =>
      AlignmentNode.set(AlignmentNode.empty, {
        aligned: node,
        alignKind: AlignKind.MatchChild,
        excludeFromAlignment,
        children: asMatchChildren(node.children, excludeFromAlignment),
      })
    );
}

export function asNarrowMatch(node: Node, excludeFromAlignment: Immutable.Set<string>) {
  return AlignmentNode.set(AlignmentNode.empty, {
    aligned: node,
    alignKind: AlignKind.NarrowerMatch,
    children: asMatchChildren(node.children, excludeFromAlignment),
    excludeFromAlignment,
  });
}

function mergeChildren(oldNodes: ReadonlyArray<AlignmentNode>, newNodes: ReadonlyArray<AlignmentNode>) {
  const result = mergeRemovingDuplicates(AlignmentNode.keyOf, oldNodes, newNodes);
  result.sort(compareAlignmentNodesByLabel);
  return result;
}

export function findExcludedChildren<T extends Traversable<T>>(
  root: T,
  selectionRoot: SelectionNode<T>,
  selection: TreeSelection<T>
) {
  const keyOf = selection.keyOf as (node: T) => string;
  return Immutable.Set<string>().withMutations((excluded) => {
    const visit = (node: T, selected: SelectionNode<T>) => {
      if (TreeSelection.isTerminal(selected)) {
        return;
      }
      for (const child of node.children) {
        const key = keyOf(child);
        const index = selection.getChildIndex(selected, key);
        if (typeof index === 'number') {
          const selectionChild = selected.children[index] as SelectionNode<T>;
          visit(child, selectionChild);
        } else {
          excluded.add(key);
        }
      }
    };
    visit(root, selectionRoot);
  });
}

function compareAlignmentNodesByLabel(first: AlignmentNode, second: AlignmentNode) {
  return getNodeLabel(first).localeCompare(getNodeLabel(second));
}

function getNodeLabel(node: AlignmentNode): string {
  const inner = node.base || node.aligned;
  return inner && inner.label ? inner.label.value : '';
}
