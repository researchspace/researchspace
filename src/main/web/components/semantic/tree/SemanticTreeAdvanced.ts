/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
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

import * as _ from 'lodash';
import { Props as ReactProps, createElement } from 'react';
import * as D from 'react-dom-factories';
import * as maybe from 'data.maybe';

import { Cancellation } from 'platform/api/async';
import { BuiltInEvents, trigger } from 'platform/api/events';
import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { Component } from 'platform/api/components';

import { breakGraphCycles, findRoots } from 'platform/components/semantic/lazy-tree';
import { ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';
import { TemplateItem } from 'platform/components/ui/template';

import TreeAdvanced from './TreeAdvanced';
import { D3Tree, D3TreeProviderKind, D3TreeOptions } from './D3Tree';
import { SemanticTreeConfig, SemanticTreeKind } from './SemanticTree';
import { TreeNode, ProviderPropsAdvanced } from './TreeTypes';

export interface SemanticTreeAdvancedConfig extends SemanticTreeConfig {
  /**
   * Optional SPARQL Select query for lazy loading child nodes when expanding.
   * When provided, enables lazy loading mode. The query should have the same structure
   * as the main query but will receive the clicked node's IRI as {{clickedNode}} variable.
   * 
   * Example:
   * ```
   * SELECT ?node ?parent WHERE {
   *   <{{clickedNode}}> rdfs:subClassOf ?node .
   *   BIND(<{{clickedNode}}> as ?parent)
   * }
   * ```
   */
  expandQuery?: string;

  /**
   * SPARQL Select projection variable name that indicates whether a node has children
   * that can be loaded lazily. Used to show expand/collapse indicators.
   * @default 'hasChildren'
   */
  hasChildrenBinding?: string;

  /**
   * Template to show while loading child nodes during expansion.
   * @default '<i class="fa fa-spinner fa-spin"></i> Loading...'
   */
  loadingTemplate?: string;

  /**
   * Whether to cache expanded node children to avoid re-querying.
   * @default true
   */
  enableCache?: boolean;
}

export type PropsAdvanced = SemanticTreeAdvancedConfig & ReactProps<SemanticTreeAdvanced>;

interface StateAdvanced {
  data?: ReadonlyArray<TreeNode>;
  isLoading?: boolean;
  errorMessage?: Data.Maybe<string>;
  expandedNodes: Map<string, ReadonlyArray<TreeNode>>; // Cache of loaded children
  loadingNodes: Set<string>; // Nodes currently being expanded
  loadingTimers: Map<string, number>; // Timers for delayed loading indicators
}

export class SemanticTreeAdvanced extends Component<PropsAdvanced, StateAdvanced> {
  static readonly defaultProps: Partial<PropsAdvanced> = {
    provider: 'html',
    parentBindingName: 'parent',
    nodeBindingName: 'node',
    roots: [],
    keysOpened: [],
    tupleTemplate: '<semantic-link iri="{{node.value}}"></semantic-link>',
    hasChildrenBinding: 'hasChildren',
    loadingTemplate: '<i class="fa fa-spinner fa-spin"></i> Loading...',
    enableCache: true,
  };

  private readonly cancellation = new Cancellation();
  private querying = this.cancellation.derive();

  constructor(props: PropsAdvanced, context: any) {
    super(props, context);
    this.state = {
      isLoading: true,
      errorMessage: maybe.Nothing<string>(),
      expandedNodes: new Map(),
      loadingNodes: new Set(),
      loadingTimers: new Map(),
    };
  }

  public componentDidMount() {
    this.loadData(this.props);
  }

  public componentWillReceiveProps(props: PropsAdvanced) {
    if (props.query !== this.props.query) {
      this.loadData(props);
    }
  }

  public componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private loadData(props: PropsAdvanced) {
    const context = this.context.semanticContext;
    this.querying = this.cancellation.deriveAndCancel(this.querying);
    const loading =
      this.querying.map(
        SparqlClient.select(props.query, { context })
      )
      .onError((errorMessage) => this.setState({ isLoading: false, errorMessage: maybe.Just(errorMessage) }))
      .onValue(this.processSparqlResult)
      .onEnd(() => {
        if (this.props.id) {
          trigger({ eventType: BuiltInEvents.ComponentLoaded, source: props.id });
        }
      });

    if (props.id) {
      trigger({
        eventType: BuiltInEvents.ComponentLoading,
        source: this.props.id,
        data: loading,
      });
    }
  }

  private expandNode = async (node: TreeNode): Promise<ReadonlyArray<TreeNode>> => {
    const { expandQuery, enableCache } = this.props;
    
    if (!expandQuery) {
      // No expand query provided, return empty array
      return [];
    }

    const nodeKey = node.key;
    
    // Check cache first
    if (enableCache && this.state.expandedNodes.has(nodeKey)) {
      return this.state.expandedNodes.get(nodeKey) || [];
    }

    // Set up a timer to show the loading indicator after 1 second
    const timer = window.setTimeout(() => {
      this.setState(prevState => ({
        loadingNodes: new Set(Array.from(prevState.loadingNodes).concat([nodeKey]))
      }));
    }, 1000);

    this.setState(prevState => ({
      loadingTimers: new Map(Array.from(prevState.loadingTimers.entries()).concat([[nodeKey, timer]]))
    }));

    try {
      // Inject the clicked node IRI into the expand query
      const queryWithNode = expandQuery.replace(/\{\{clickedNode\}\}/g, node.data[this.props.nodeBindingName].value);
      
      const context = this.context.semanticContext;
      const result = await SparqlClient.select(queryWithNode, { context }).toPromise();
      
      if (SparqlUtil.isSelectResultEmpty(result)) {
        const emptyResult: ReadonlyArray<TreeNode> = [];
        this.updateExpandedCache(nodeKey, emptyResult);
        return emptyResult;
      }

      // Process the expansion result
      const { nodeBindingName, parentBindingName } = this.props;
      const graph = transformBindingsToGraph({
        bindings: result.results.bindings,
        nodeBindingName,
        parentBindingName,
      });

      breakGraphCycles(graph.nodes);

      // Get the parent node from the graph, which is the node that was clicked
      const parentNode = graph.map.get(node.key);

      if (parentNode) {
        const childNodes = makeImmutableForest(parentNode.children);
        this.updateExpandedCache(nodeKey, childNodes);
        return childNodes;
      }
      
      // If for some reason the parent node is not found, return empty
      return [];
      
    } catch (error) {
      console.error('Error expanding node:', error);
      this.setState(prevState => ({
        errorMessage: maybe.Just(`Error expanding node: ${error.message || error}`)
      }));
      return [];
    } finally {
      // Clear the timer and remove loading state
      this.setState(prevState => {
        const timer = prevState.loadingTimers.get(nodeKey);
        if (timer) {
          clearTimeout(timer);
        }
        const newLoadingNodes = new Set(prevState.loadingNodes);
        newLoadingNodes.delete(nodeKey);
        const newLoadingTimers = new Map(prevState.loadingTimers);
        newLoadingTimers.delete(nodeKey);
        return { loadingNodes: newLoadingNodes, loadingTimers: newLoadingTimers };
      });
    }
  };

  private updateExpandedCache(nodeKey: string, children: ReadonlyArray<TreeNode>) {
    if (this.props.enableCache) {
      this.setState(prevState => ({
        expandedNodes: new Map(Array.from(prevState.expandedNodes.entries()).concat([[nodeKey, children]]))
      }));
    }
  }

  public render() {
    if (this.state.errorMessage.isJust) {
      return createElement(ErrorNotification, { errorMessage: this.state.errorMessage.get() });
    }
    return this.state.isLoading ? createElement(Spinner) : this.renderTree();
  }

  private renderTree() {
    const { data } = this.state;
    if (data.length === 0) {
      return createElement(TemplateItem, { template: { source: this.props.noResultTemplate } });
    }

    const providerProps: ProviderPropsAdvanced = {
      tupleTemplate: this.handleDeprecatedLayout(),
      onNodeClick: this.onNodeClick,
      onNodeExpand: this.props.expandQuery ? this.expandNode : undefined,
      nodeData: data,
      nodeKey: 'key',
      collapsed: this.props.collapsed,
      keysOpened: this.props.keysOpened,
      loadingNodes: this.state.loadingNodes,
      hasChildrenBinding: this.props.hasChildrenBinding,
      loadingTemplate: this.props.loadingTemplate,
    };

    const { provider, d3TreeOptions } = this.props;
    const isD3Provider = provider === 'd3-sankey' || provider === 'd3-dendrogram' || provider === 'd3-collapsible-tree';

    if (isD3Provider) {
      return createElement(D3Tree, {
        ...providerProps,
        provider: provider as D3TreeProviderKind,
        options: d3TreeOptions,
      });
    } else if (typeof provider === 'string' && provider !== 'html') {
      console.warn(`Unknown semantic tree provider '${provider}'`);
    }

    return D.div({}, createElement(TreeAdvanced, providerProps));
  }

  private processSparqlResult = (res: SparqlClient.SparqlSelectResult): void => {
    if (SparqlUtil.isSelectResultEmpty(res)) {
      this.setState({ data: [], isLoading: false });
      return;
    }

    const { nodeBindingName, parentBindingName } = this.props;
    // transform binding into graph instead of tree to support multiple parent nodes
    // and to reuse graph algorithms to gracefully handle cycles and tree roots
    const graph = transformBindingsToGraph({
      bindings: res.results.bindings,
      nodeBindingName,
      parentBindingName,
    });

    breakGraphCycles(graph.nodes);
    const { roots, notFound } = this.findRoots(graph);
    const data = makeImmutableForest(roots);

    if (notFound.length === 0) {
      this.setState({ data, isLoading: false });
    } else {
      const notFoundRoots = notFound.map((root) => `'${root}'`).join(', ');
      this.setState({
        data,
        isLoading: false,
        errorMessage: maybe.Just(`Expected roots not found: ${notFoundRoots}`),
      });
    }
  };

  private findRoots(graph: MutableGraph) {
    if (_.isEmpty(this.props.roots)) {
      const roots = findRoots(graph.nodes);
      return { roots, notFound: [] };
    } else {
      // if roots are specified we take those
      return findExpectedRoots(graph, this.props.roots);
    }
  }

  private onNodeClick = (node: any) => {
    // empty default onNodeClick
  };

  private handleDeprecatedLayout(): string {
    if (_.has(this.props, 'layout')) {
      console.warn('layout property in semantic-tree-advanced is deprecated, please use flat properties instead');
      return this.props['layout']['tupleTemplate'];
    }
    return this.props.tupleTemplate;
  }
}

// Reuse utility functions from SemanticTree
interface MutableNode {
  key: string;
  data: SparqlClient.Binding;
  children: Set<MutableNode>;
}

interface MutableGraph {
  map: Map<string, MutableNode>;
  nodes: MutableNode[];
}

function transformBindingsToGraph(params: {
  bindings: SparqlClient.Bindings;
  nodeBindingName: string;
  parentBindingName: string;
}): MutableGraph {
  const { bindings, nodeBindingName, parentBindingName } = params;

  const map = new Map<string, MutableNode>();
  const nodes: MutableNode[] = [];
  const edges: Array<{ parent: string; child: string }> = [];

  // construct nodes from bindings
  for (const binding of bindings) {
    const key = binding[nodeBindingName].value;
    const parent = binding[parentBindingName] ? binding[parentBindingName].value : undefined;

    const existing = map.get(key);
    if (!existing) {
      const node: MutableNode = { key, data: binding, children: new Set<MutableNode>() };
      map.set(key, node);
      nodes.push(node);
    } else if (_.isEmpty(existing.data)) {
      existing.data = binding;
    }

    if (typeof parent === 'string') {
      edges.push({ parent, child: key });
    }
  }

  // link nodes into graph
  for (const { parent, child } of edges) {
    const childNode = map.get(child);
    let parentNode = map.get(parent);
    if (!parentNode) {
      parentNode = synthesizeParentNode(parent, nodeBindingName);
      map.set(parent, parentNode);
      nodes.push(parentNode);
    }
    parentNode.children.add(childNode);
  }

  return { map, nodes };
}

function synthesizeParentNode(key: string, nodeBindingName: string): MutableNode {
  return {
    key,
    data: { [nodeBindingName]: Rdf.iri(key) },
    children: new Set<MutableNode>(),
  };
}

function findExpectedRoots({ map }: MutableGraph, expectedRoots: ReadonlyArray<string>) {
  const roots = new Set<MutableNode>();
  const notFound: string[] = [];
  for (const rootKey of expectedRoots) {
    const root = map.get(rootKey);
    if (root) {
      roots.add(root);
    } else {
      notFound.push(rootKey);
    }
  }
  return { roots, notFound };
}

function makeImmutableForest(nodes: Set<MutableNode>): ReadonlyArray<TreeNode> {
  return Array.from(nodes, makeImmutableNode);
}

function makeImmutableNode(node: MutableNode): TreeNode {
  return {
    key: node.key,
    data: node.data,
    children: makeImmutableForest(node.children),
  };
}

export default SemanticTreeAdvanced;
