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
import * as Kefir from 'kefir';
import { orderBy } from 'lodash';
import * as SparqlJs from 'sparqljs';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';
import * as LabelsService from 'platform/api/services/resource-label';

import { breakGraphCycles, transitiveReduction, findRoots } from './GraphAlgorithms';
import { KeyedForest, KeyPath, mapBottomUp } from './KeyedForest';
import { TreeNode, mergeRemovingDuplicates } from './NodeModel';

export interface Node extends TreeNode {
  readonly iri: Rdf.Iri;
  readonly tuple: SparqlClient.Binding;
  label?: Rdf.Literal;
  readonly children?: ReadonlyArray<Node>;
  readonly reachedLimit?: boolean;
  /** search relevance */
  readonly score?: number;
}

export namespace Node {
  export const rootKey = 'SparqlNode:root';
  export const keyOf = (node: Node) => (node.iri ? node.iri.value : rootKey);
  export const readyToLoadRoot: Node = {
    iri: Rdf.iri(rootKey),
    children: undefined,
    reachedLimit: false,
    tuple: {},
  };
  export const emptyRoot: Node = {
    iri: Rdf.iri(rootKey),
    children: [],
    reachedLimit: true,
    tuple: {},
  };

  export const readyToLoadForest = KeyedForest.create(keyOf, readyToLoadRoot);
  export const emptyForest = KeyedForest.create(keyOf, emptyRoot);

  export function set(node: Node, props: Partial<Node>): Node {
    return { ...node, ...props };
  }

  export function getLabel(node: Node) {
    return node.label ? node.label.value : node.iri.value;
  }
}

export class SparqlNodeModel {
  private readonly rootsQuery: SparqlJs.SelectQuery;
  private readonly childrenQuery: SparqlJs.SelectQuery;
  private readonly parentsQuery: SparqlJs.SelectQuery;
  private readonly limit: number | undefined;
  private readonly useLabelService: boolean;

  readonly sparqlOptions: () => SparqlClient.SparqlOptions;

  constructor(params: {
    rootsQuery: SparqlJs.SelectQuery;
    childrenQuery: SparqlJs.SelectQuery;
    parentsQuery: SparqlJs.SelectQuery;
    limit?: number;
    sparqlOptions: () => SparqlClient.SparqlOptions;
    useLabelService?: boolean;
  }) {
    const { rootsQuery, childrenQuery, parentsQuery, limit, sparqlOptions, useLabelService = false } = params;
    this.rootsQuery = rootsQuery;
    this.childrenQuery = childrenQuery;
    this.parentsQuery = parentsQuery;
    this.limit = limit;
    this.sparqlOptions = sparqlOptions;
    this.useLabelService = useLabelService;
  }

  hasMoreChildren(node: Node): boolean {
    return !node.error && !node.reachedLimit;
  }

  loadMoreChildren(parent: Node): Kefir.Property<Node> {
    const parametrized =
      Node.keyOf(parent) === Node.rootKey
        ? this.rootsQuery
        : SparqlClient.setBindings(this.childrenQuery, { parent: parent.iri });

    const hasLimit = typeof this.limit === 'number';
    if (hasLimit) {
      parametrized.limit = this.limit;
      parametrized.offset = parent.children ? parent.children.length : 0;
    }

    return SparqlClient.select(parametrized, this.sparqlOptions())
      .flatMapErrors((error) => Kefir.constant({ error }))
      .flatMap(this.processQueryResult(parent, hasLimit))
      .toProperty();
  }

  private processQueryResult = (parent: Node, hasLimit: boolean) => (result: SparqlClient.SparqlSelectResult | { error: any }) => {
    if ('error' in result) {
      return Kefir.constant(Node.set(parent, { error: result.error }));
    }

    const nodes = nodesFromQueryResult(result, this.useLabelService);
    return this.applyLabels(nodes).map(nodesWithLabels => {
      const initialChildren = parent.children || [];
      const children = mergeRemovingDuplicates(Node.keyOf, initialChildren, nodesWithLabels);
      return Node.set(parent, {
        error: undefined,
        children,
        reachedLimit: !hasLimit || children.length === initialChildren.length || nodes.length < this.limit,
      });
    });
  }

  private applyLabels = (nodes: Node[]): Kefir.Property<Node[]> => {
    if (!this.useLabelService) {
      return Kefir.constant(nodes);
    }
    const iris = nodes.map(node => node.iri);
    return LabelsService.getLabels(iris, this.sparqlOptions()).map(labels => 
      nodes.map(node => ({
        ...node,
        label: labels.has(node.iri) ? Rdf.literal(labels.get(node.iri)) : undefined,
      }))
    );
  }

  loadFromLeafs(leafs: ReadonlyArray<Node>, options: { transitiveReduction: boolean }): Kefir.Property<Node> {
    const initialOrphans = Immutable.List(leafs as Node[])
      .groupBy((node) => node.iri.value)
      .map((group) => group.first())
      .map<MutableNode>(({ iri, label, tuple: binding, score, reachedLimit }) => ({
        iri,
        label,
        binding,
        score,
        reachedLimit,
        children: new Set<MutableNode>(),
      }))
      .toArray();

    if (initialOrphans.length === 0) {
      return Kefir.constant(Node.readyToLoadRoot);
    }

    return restoreGraphFromLeafs(initialOrphans, this.parentsQuery, this.sparqlOptions(), this.useLabelService).map((nodes) => {
      const graph = Array.from(nodes.values());
      breakGraphCycles(graph);
      if (options.transitiveReduction) {
        transitiveReduction(graph);
      }
      const roots = findRoots(graph);
      const children = asImmutableForest(roots);
      return Node.set(Node.readyToLoadRoot, { children });
    });
  }

  loadParent(key: string): Kefir.Property<string> {
    const parameters = [{ item: Rdf.iri(key) }];
    const parametrized = SparqlClient.prepareParsedQuery(parameters)(this.parentsQuery);
    return SparqlClient.select(parametrized, this.sparqlOptions())
      .flatMap(
        ({ results }): Kefir.Observable<string> => {
          for (const { item, parent } of results.bindings) {
            if (!(item && item.value === key)) {
              continue;
            }
            if (!(parent && parent.isIri())) {
              return Kefir.constantError<any>(
                new Error(`parentsQuery returned tuple without 'parent' (or it isn't an IRI)`)
              );
            }
            return Kefir.constant(parent.value);
          }
          return Kefir.constant(Node.rootKey);
        }
      )
      .toProperty();
  }
}

export function nodesFromQueryResult(result: SparqlClient.SparqlSelectResult, useLabelService: boolean): Node[] {
  return result.results.bindings
    .map(
      (binding): Node => {
        const { item, label, hasChildren } = binding;
        if (!(item && item.isIri())) {
          return undefined;
        }

        const nodeLabel = useLabelService ? undefined : (label && label.isLiteral() ? label : undefined);

        return hasChildren && hasChildren.value === 'false'
          ? { iri: item, label: nodeLabel, tuple: binding, children: [], reachedLimit: true }
          : { iri: item, label: nodeLabel, tuple: binding, reachedLimit: false };
      }
    )
    .filter((node) => node !== undefined);
}

export function sealLazyExpanding(root: Node): Node {
  return mapBottomUp<Node>(root, (node) => {
    const sealed =
      !node.reachedLimit && node.children && node.children.length > 0 ? Node.set(node, { reachedLimit: true }) : node;
    const expanded = sealed.reachedLimit && !sealed.expanded ? Node.set(sealed, { expanded: true }) : sealed;
    return expanded;
  });
}

export interface MutableNode {
  iri: Rdf.Iri;
  label: Rdf.Literal;
  binding: SparqlClient.Binding;
  reachedLimit: boolean;
  children: Set<MutableNode>;
  score?: number;
}

interface ParentsResult {
  result: SparqlClient.SparqlSelectResult;
  requested: string[];
}

function restoreGraphFromLeafs(
  leafs: MutableNode[],
  parentsQuery: SparqlJs.SelectQuery,
  options: SparqlClient.SparqlOptions,
  useLabelService: boolean
): Kefir.Property<Map<string, MutableNode>> {
  return Kefir.stream<Map<string, MutableNode>>((emitter) => {
    const nodes = new Map(leafs.map<[string, MutableNode]>((node) => [node.iri.value, node]));
    let unresolvedOrphans = new Set(nodes.keys());

    const processResult = ({ result, requested }: ParentsResult) => {
      for (const binding of result.results.bindings) {
        const { item, parent, parentLabel } = binding;
        if (!(item && item.isIri() && parent && parent.isIri())) {
          continue;
        }

        unresolvedOrphans.delete(item.value);
        const node = nodes.get(item.value);

        const existingNode = nodes.get(parent.value);
        if (existingNode) {
          existingNode.children.add(node);
        } else {
          const parentOrphan: MutableNode = {
            iri: parent,
            label: parentLabel && parentLabel.isLiteral() ? parentLabel : undefined,
            binding: binding,
            reachedLimit: false,
            children: new Set<MutableNode>([nodes.get(item.value)]),
          };
          nodes.set(parentOrphan.iri.value, parentOrphan);
          unresolvedOrphans.add(parentOrphan.iri.value);
        }
      }

      requested.forEach(key => unresolvedOrphans.delete(key));

      return unresolvedOrphans.size === 0;
    };

    const applyLabels = () => {
      if (!useLabelService) {
        return Kefir.constant(nodes);
      }
      const newNodes = Array.from(nodes.values()).filter(node => !node.label);
      return LabelsService.getLabels(newNodes.map(node => node.iri), options)
        .map(labels => {
          newNodes.forEach(node => {
            if (labels.has(node.iri)) {
              node.label = Rdf.literal(labels.get(node.iri));
            }
          });
          return nodes;
        });
    };

    const request = (orphanKeys: string[]) => {
      const parametrized = SparqlClient.prepareParsedQuery(orphanKeys.map((key) => ({ item: Rdf.iri(key) })))(parentsQuery);
      return SparqlClient.select(parametrized, options)
        .map((result) => ({ result, requested: orphanKeys }));
    };

    const processIteration = () => {
      if (unresolvedOrphans.size === 0) {
        applyLabels()
          .onValue(result => {
            emitter.emit(result);
            emitter.end();
          })
          .onError(error => {
            emitter.error(error);
            emitter.end();
          });
      } else {
        request(Array.from(unresolvedOrphans))
          .onValue(reqResult => {
            const isComplete = processResult(reqResult);
            if (isComplete) {
              applyLabels()
                .onValue(finalResult => {
                  emitter.emit(finalResult);
                  emitter.end();
                })
                .onError(error => {
                  emitter.error(error);
                  emitter.end();
                });
            } else {
              // Continue iteration only if not complete and there are still orphans
              // This check is important to prevent infinite loops if processResult doesn't reduce orphans
              if (unresolvedOrphans.size > 0) {
                processIteration();
              } else { // Should ideally be caught by isComplete, but as a safeguard
                applyLabels()
                  .onValue(finalResult => {
                    emitter.emit(finalResult);
                    emitter.end();
                  })
                  .onError(error => {
                    emitter.error(error);
                    emitter.end();
                  });
              }
            }
          })
          .onError(error => {
            emitter.error(error);
            emitter.end();
          });
      }
    };

    processIteration();

    return () => {
      // Cleanup logic if needed, e.g., cancel ongoing requests
    };
  }).toProperty();
}

const COMPARE_BY_SCORE_THEN_BY_LABEL: ReadonlyArray<(node: Node) => any> = [
  (node: Node) => (typeof node.score === 'number' ? -node.score : 0),
  (node: Node) => (node.label ? node.label.value : node.iri.value),
];

function asImmutableForest(roots: Set<MutableNode>): ReadonlyArray<Node> {
  return Array.from(roots).map(
    (root): Node => {
      const children = orderBy(asImmutableForest(root.children), COMPARE_BY_SCORE_THEN_BY_LABEL);
      const total = children.reduce((sum, { score = 0 }) => sum + score, 0);
      return {
        iri: root.iri,
        label: root.label,
        children,
        tuple: root.binding,
        reachedLimit: root.reachedLimit,
        score: total + (root.score === undefined ? 0 : root.score),
      };
    }
  );
}
