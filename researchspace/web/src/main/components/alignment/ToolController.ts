/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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
import * as Immutable from 'immutable';
import * as SparqlJs from 'sparqljs';

import { Cancellation } from 'platform/api/async';
import { Rdf, turtle } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil, QueryVisitor } from 'platform/api/sparql';

import {
  ComplexTreePatterns, KeyedForest, KeyPath, SparqlNodeModel, TreeSelection,
  TreeNode, Node, queryMoreChildren, loadPath, expandPath, mapBottomUp,
} from 'platform/components/semantic/lazy-tree';

import {
  AlignmentNode, AlignKind, AlignmentNodeModel, AlignmentState, AlignmentMetadata,
  asNarrowMatch, unalignAll, validateAlignment,
} from './AlignmentNodeModel';
import { MatchEntry, groupMatches } from './Serialization';

export interface AlignmentQueries extends ComplexTreePatterns {
  /**
   * Node info query with [?item] inputs through VALUES(...) clause
   * and [?item, ?label, ?hasChildren] output variables.
   */
  readonly nodeQuery: string;
}

export interface ToolState {
  readonly source: PanelState;
  readonly target: PanelState;
  readonly savedMatches: Immutable.Map<string, Immutable.Map<string, MatchEntry>>;
  readonly matches: Immutable.Map<string, Immutable.Map<string, MatchEntry>>;
  readonly metadata: AlignmentMetadata;
  readonly draggedNodes?: ReadonlyArray<AlignmentNode>;
}

export enum AlignementRole {
  Source = 1,
  Target,
}

export interface PanelState {
  readonly queries: ParsedQueries;
  readonly patterns: ComplexTreePatterns;
  readonly model: AlignmentNodeModel;
  readonly forest: KeyedForest<AlignmentNode>;
  readonly selection: TreeSelection<AlignmentNode>;
  readonly expandingToScroll: boolean;
  readonly expandingCancellation: Cancellation;
  readonly expandTarget?: Node;
  readonly highlightedPath?: KeyPath;
}
export namespace PanelState {
  export function get(state: ToolState, role: AlignementRole): PanelState {
    return role === AlignementRole.Source ? state.source : state.target;
  }

  export function set(state: PanelState, change: Partial<PanelState>): PanelState {
    return {...state, ...change};
  }

  export function mergeIn(
    state: ToolState,
    role: AlignementRole,
    change: Partial<PanelState>
  ): Partial<ToolState> {
    const previous = get(state, role);
    const merged = set(previous, change);
    return role === AlignementRole.Source ? {source: merged} : {target: merged};
  }
}

export interface ParsedQueries {
  rootsQuery: SparqlJs.SelectQuery;
  childrenQuery: SparqlJs.SelectQuery;
  parentsQuery: SparqlJs.SelectQuery;
  searchQuery: SparqlJs.SelectQuery;
}

export type StateChanger = (change: StateChange, callback?: (result: ToolState) => void) => void;
export type StateChange = (state: ToolState) => Partial<ToolState> | null;

export class ToolController {
  private readonly cancellation: Cancellation;
  private readonly updateState: StateChanger;
  private readonly getSparqlOptions: () => SparqlClient.SparqlOptions;
  private readonly scrollToPath: (role: AlignementRole, path: KeyPath) => void;
  private readonly showValidationError: (message: string) => void;

  private changeQueue: StateChange[] = [];
  private changeCallbacks: Array<(result: ToolState) => void> = [];
  private changingState = false;

  constructor(params: {
    cancellation: Cancellation;
    updateState: StateChanger;
    getSparqlOptions: () => SparqlClient.SparqlOptions;
    scrollToPath: (role: AlignementRole, path: KeyPath) => void;
    showValidationError: (message: string) => void;
  }) {
    this.cancellation = params.cancellation;
    this.updateState = params.updateState;
    this.getSparqlOptions = params.getSparqlOptions;
    this.scrollToPath = params.scrollToPath;
    this.showValidationError = params.showValidationError;
  }

  loadState(
    queries: AlignmentQueries,
    alignment: AlignmentState
  ): Kefir.Property<ToolState> {
    const {source, target} = alignment.metadata;
    const sourceQueries = createQueries(queries, source);
    const targetQueries = createQueries(queries, target);

    const sourceModel = new SparqlNodeModel({
      rootsQuery: sourceQueries.queries.rootsQuery,
      childrenQuery: sourceQueries.queries.childrenQuery,
      parentsQuery: sourceQueries.queries.parentsQuery,
      sparqlOptions: this.getSparqlOptions,
    });
    const targetModel = new SparqlNodeModel({
      rootsQuery: targetQueries.queries.rootsQuery,
      childrenQuery: targetQueries.queries.childrenQuery,
      parentsQuery: targetQueries.queries.parentsQuery,
      sparqlOptions: this.getSparqlOptions,
    });

    const targetPanelModel = new AlignmentNodeModel({
      baseModel: targetModel,
      baseNodeQuery: targetQueries.nodeQuery,
      alignedModel: sourceModel,
      alignNodeQuery: sourceQueries.nodeQuery,
    });

    return targetPanelModel.loadState(alignment).map(loadedTrees => {
      const matches = Immutable.Map<string, Immutable.Map<string, MatchEntry>>();
      const state: ToolState = {
        metadata: alignment.metadata,
        source: {
          queries: sourceQueries.queries,
          patterns: sourceQueries.patterns,
          model: new AlignmentNodeModel({
            baseModel: sourceModel,
            alignedModel: targetModel,
          }),
          forest: loadedTrees.source,
          selection: TreeSelection.empty(loadedTrees.source),
          expandingToScroll: false,
          expandingCancellation: Cancellation.cancelled,
        },
        target: {
          queries: targetQueries.queries,
          patterns: targetQueries.patterns,
          model: targetPanelModel,
          forest: loadedTrees.target,
          selection: TreeSelection.empty(loadedTrees.target),
          expandingToScroll: false,
          expandingCancellation: Cancellation.cancelled,
        },
        matches: matches,
        savedMatches: matches,
      };

      const loadedState = syncDecoratorsAndMatches(state);
      const decorated: ToolState = {...state, ...loadedState, savedMatches: loadedState.matches};
      return decorated;
    });
  }

  enqueueStateUpdate(change: StateChange, callback?: (result: ToolState) => void) {
    this.changeQueue.push(change);
    if (callback) {
      this.changeCallbacks.push(callback);
    }

    if (this.changingState) {
      return;
    }

    this.updateState(initalState => {
      let totalChange: Partial<ToolState> = null;
      while (this.changeQueue.length > 0) {
        const enqueuedChange = this.changeQueue.shift();
        const computedChange = enqueuedChange({...initalState, ...totalChange});
        if (computedChange !== undefined && computedChange !== null) {
          totalChange = {...totalChange, ...computedChange};
        }
      }
      return totalChange;
    }, resultState => {
      while (this.changeCallbacks.length > 0) {
        const changeCallback = this.changeCallbacks.shift();
        changeCallback(resultState);
      }
    });
  }

  requestMore(role: AlignementRole, path: KeyPath) {
    this.enqueueStateUpdate(toolState => {
      const {model, forest} = PanelState.get(toolState, role);
      const [loadingForest, forestChange] = queryMoreChildren(
        parent => model.loadMoreChildren(parent), forest, path);
      this.cancellation.map(forestChange).observe({
        value: changeForest => {
          this.onMoreItemsLoaded(role, changeForest);
        },
      });
      return PanelState.mergeIn(toolState, role, {forest: loadingForest});
    });
  }

  private onMoreItemsLoaded(
    role: AlignementRole,
    changeForest: (forest: KeyedForest<AlignmentNode>) => KeyedForest<AlignmentNode>
  ) {
    this.enqueueStateUpdate(toolState => {
      this.enqueueStateUpdate(syncDecoratorsAndMatches);
      const {forest} = PanelState.get(toolState, role);
      return PanelState.mergeIn(toolState, role, {forest: changeForest(forest)});
    });
  }

  expandOrCollapse(role: AlignementRole, path: KeyPath, expanded: boolean) {
    this.enqueueStateUpdate(toolState => {
      const state = PanelState.get(toolState, role);
      const forest = state.forest.updateNode(path, node => TreeNode.set(node, {expanded}));
      return PanelState.mergeIn(toolState, role, {forest});
    });
  }

  setSelection(role: AlignementRole, selection: TreeSelection<AlignmentNode>) {
    this.enqueueStateUpdate(toolState => {
      return PanelState.mergeIn(toolState, role, {selection});
    });
  }

  expandAndScrollToPath(role: AlignementRole, path: KeyPath, target: Node) {
    const onExpandingStateChanged = (toolState: ToolState) => {
      const {expandingToScroll, highlightedPath} = PanelState.get(toolState, role);
      if (!expandingToScroll && highlightedPath) {
        this.scrollToPath(role, highlightedPath);
      }
    };

    this.enqueueStateUpdate(toolState => {
      const state = PanelState.get(toolState, role);
      const expandingCancellation = this.cancellation.deriveAndCancel(state.expandingCancellation);
      expandingCancellation.map(
        loadPath(
          parent => state.model.hasMoreChildren(parent),
          parent => state.model.loadMoreChildren(parent),
          state.forest,
          path
        ).map(forest => expandPath(forest, path))
      ).observe({
        value: forest => {
          this.enqueueStateUpdate(current => {
            this.enqueueStateUpdate(syncDecoratorsAndMatches);
            return PanelState.mergeIn(current, role, {
              forest, expandingToScroll: false, highlightedPath: path,
            });
          }, onExpandingStateChanged);
        },
        error: error => {
          console.error(error);
          this.enqueueStateUpdate(current => PanelState.mergeIn(current, role, {
            expandingToScroll: false, highlightedPath: undefined,
          }));
        },
      });
      return PanelState.mergeIn(toolState, role, {
        expandingToScroll: true,
        expandingCancellation,
        expandTarget: target,
      });
    }, onExpandingStateChanged);
  }

  cancelExpandingToScroll(role: AlignementRole) {
    this.enqueueStateUpdate(toolState => {
      const state = PanelState.get(toolState, role);
      if (state.expandingToScroll) {
        state.expandingCancellation.cancelAll();
        return PanelState.mergeIn(toolState, role, {
          expandingToScroll: false,
          expandTarget: undefined,
          highlightedPath: undefined,
        });
      }
      return null;
    });
  }

  alignNodes(
    targetPath: KeyPath,
    alignments: ReadonlyArray<{
      kind: AlignKind;
      sourceNode: AlignmentNode;
    }>,
  ) {
    this.enqueueStateUpdate(toolState => {
      const {target} = toolState;
      let forest = target.forest;

      for (const {kind, sourceNode} of alignments) {
        const {base, excludeFromAlignment} = sourceNode;
        if (!this.validate(target.forest, targetPath, base, kind)) {
          const targetNode = forest.fromKeyPath(targetPath);
          const targetIri = targetNode ? `<${forest.keyOf(targetNode)}>` : '<?>';
          console.warn(`Invalid alignment: ${base.iri} ${AlignKind[kind]} ${targetIri}`);
          continue;
        }
        if (kind === AlignKind.ExactMatch) {
          forest = target.forest.updateNode(
            targetPath, node => AlignmentNode.setExactMatch(node, base, excludeFromAlignment)
          );
        } else if (kind === AlignKind.NarrowerMatch) {
          forest = forest.updateNode(targetPath, node => {
            const aligned = AlignmentNode.addNarrowMatches(node, [
              asNarrowMatch(base, excludeFromAlignment),
            ]);
            return TreeNode.set(aligned, {expanded: true});
          });
        } else {
          throw new Error(`Invalid alignment relation type '${AlignKind[kind]}'`);
        }
      }

      this.enqueueStateUpdate(syncDecoratorsAndMatches);
      return PanelState.mergeIn(toolState, AlignementRole.Target, {forest});
    }, resultState => {
      const reloadTarget = alignments.some(({kind}) => kind === AlignKind.ExactMatch);
      if (reloadTarget) {
        this.requestMore(AlignementRole.Target, targetPath);
      }
    });
  }

  private validate(
    forest: KeyedForest<AlignmentNode>,
    targetPath: KeyPath,
    source: Node,
    kind: AlignKind
  ): boolean {
    const result = validateAlignment(forest, targetPath, source, kind);
    if (!result.valid) {
      this.showValidationError(result.message);
    }
    return result.valid;
  }

  unalignNode(targetPath: KeyPath) {
    this.enqueueStateUpdate(toolState => {
      const state = toolState.target;
      const node = state.forest.fromKeyPath(targetPath);
      if (!node || !node.aligned) {
        return null;
      }

      const sourceKey = Node.keyOf(node.aligned);
      const targetKey = Node.keyOf(AlignmentNode.getMatchTarget(node, state.forest).base);

      const forest = unalignAll(state.forest, sourceKey, targetKey);
      this.enqueueStateUpdate(syncDecoratorsAndMatches);
      return PanelState.mergeIn(toolState, AlignementRole.Target, {forest});
    });
  }

  setSavedState() {
    this.enqueueStateUpdate(toolState => ({dirty: false, savedMatches: toolState.matches}));
  }
}

function syncDecoratorsAndMatches(toolState: ToolState): Partial<ToolState> {
  const {source, target} = toolState;
  const matches = groupMatches(toolState.target.forest);
  const sources = Immutable.Map<string, MatchEntry>().withMutations(bySources => {
    matches.forEach(group => {
      group.forEach((match, sourceKey) => bySources.set(sourceKey, match));
    });
  });
  const sourceTree = source.forest.mapRoot(root => {
    const withSources = mapBottomUp<AlignmentNode>(root, node => {
      const entry = sources.get(AlignmentNode.keyOf(node));
      if (entry) {
        // update decorators and match info
        const excluded = entry.targetAligned.excludeFromAlignment;
        const decorated = decorateMatchChildren(
          node, node => !excluded.has(AlignmentNode.keyOf(node)));
        const matchedTargetNode = entry.targetBase.base;
        return AlignmentNode.set(decorated, {matchedTargetNode});
      } else if (node.matchedTargetNode) {
        // clear decorators and remove match info
        const decorated = decorateMatchChildren(node, () => false);
        return AlignmentNode.set(decorated, {matchedTargetNode: undefined});
      } else {
        return node;
      }
    });
    return decorateMatchParent(withSources);
  });
  const targetTree = target.forest.mapRoot(decorateMatchParent);
  return {
    matches,
    source: PanelState.set(source, {forest: sourceTree}),
    target: PanelState.set(target, {forest: targetTree}),
  };
}

function decorateMatchChildren(
  sourceNode: AlignmentNode, isAlignChild: (node: AlignmentNode) => boolean
) {
  const mapNode = (child: AlignmentNode) => {
    const decorateAlignChild = isAlignChild(child);
    const children = child.children.map(mapNode);
    return AlignmentNode.set(child, {decorateAlignChild, children});
  };
  return mapNode(sourceNode);
}

function decorateMatchParent(root: AlignmentNode): AlignmentNode {
  return mapBottomUp<AlignmentNode>(root, node => {
    const decorateAlignParent = node.children.some(child => {
      return Boolean(
        // source node is aligned
        child.matchedTargetNode ||
        // non-aligned target node is a parent of aligned child
        !node.aligned && child.aligned ||
        // node is a parent of decorated child
        child.decorateAlignParent
      );
    });
    return AlignmentNode.set(node, {decorateAlignParent});
  });
}

function createQueries(rawPatterns: AlignmentQueries, graph: Rdf.Iri): {
  queries: ParsedQueries;
  nodeQuery: SparqlJs.SelectQuery;
  patterns: ComplexTreePatterns;
} {
  const rootsQuery = SparqlUtil.parseQuery(rawPatterns.rootsQuery) as SparqlJs.SelectQuery;
  const childrenQuery = SparqlUtil.parseQuery(rawPatterns.childrenQuery) as SparqlJs.SelectQuery;
  const parentsQuery = SparqlUtil.parseQuery(rawPatterns.parentsQuery) as SparqlJs.SelectQuery;
  const searchQuery = SparqlUtil.parseQuery(rawPatterns.searchQuery) as SparqlJs.SelectQuery;
  const nodeQuery = SparqlUtil.parseQuery(rawPatterns.nodeQuery) as SparqlJs.SelectQuery;

  const binder = new IriBinder({
    'alignment:__graph__': graph,
  });

  [rootsQuery, childrenQuery, parentsQuery, searchQuery, nodeQuery]
    .forEach(q => binder.sparqlQuery(q));

  const patterns: ComplexTreePatterns = {
    rootsQuery: SparqlUtil.serializeQuery(rootsQuery),
    childrenQuery: SparqlUtil.serializeQuery(childrenQuery),
    parentsQuery: SparqlUtil.serializeQuery(parentsQuery),
    searchQuery: SparqlUtil.serializeQuery(searchQuery),
  };

  return {
    queries: {rootsQuery, childrenQuery, parentsQuery, searchQuery},
    nodeQuery,
    patterns,
  };
}

class IriBinder extends QueryVisitor {
  constructor(protected replacements: { [iri: string]: Rdf.Iri }) {
    super();
  }

  private tryReplace(termValue: string) {
    const replacement = this.replacements[termValue];
    if (replacement !== undefined) {
      return turtle.serialize.nodeToN3(replacement) as SparqlJs.Term;
    } else {
      return undefined;
    }
  }

  iri(iri: SparqlJs.Term) {
    return this.tryReplace(iri);
  }
}
