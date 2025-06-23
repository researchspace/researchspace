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
import { BuiltInEvents, trigger, listen } from 'platform/api/events';
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
  highlightedNodes: Set<string>; // Set of highlighted node IRIs/keys
  highlightedTreeData?: ReadonlyArray<TreeNode>; // Filtered tree data showing only highlighted paths
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
      highlightedNodes: new Set(),
    };
  }

  public componentDidMount() {
    this.loadData(this.props);
    this.setupEventListeners();
  }

  public componentWillReceiveProps(props: PropsAdvanced) {
    if (props.query !== this.props.query) {
      this.loadData(props);
    }
  }

  public componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private setupEventListeners() {
    if (this.props.id) {
      this.cancellation.map(
        listen({
          eventType: 'SemanticTreeHighlightNodes',
          target: this.props.id,
        })
      ).onValue(this.handleHighlightNodesEvent);
    }
  }

  private handleHighlightNodesEvent = (event: any) => {
    console.log('SemanticTreeAdvanced received SemanticTreeHighlightNodes event:', event);
    
    if (event.data && event.data.nodeIds && Array.isArray(event.data.nodeIds)) {
      const nodeIds = event.data.nodeIds as string[];
      console.log('Highlighting nodes:', nodeIds);
      
      this.setState({
        highlightedNodes: new Set(nodeIds)
      });

      // Trigger highlighting logic
      this.highlightNodes(nodeIds);
    } else {
      console.warn('Invalid event data for SemanticTreeHighlightNodes:', event.data);
    }
  };

  private highlightNodes = async (nodeIds: string[]) => {
    if (!this.state.data) {
      return;
    }

    try {
      if (nodeIds.length === 0) {
        // Clear highlighting - show original tree
        this.setState({
          highlightedTreeData: undefined
        });
        return;
      }

      // For now, we'll use the existing tree data and filter it to show highlighted paths
      // In a full implementation, you might want to query for the specific nodes and their paths
      const highlightedTreeData = this.filterTreeForHighlightedNodes(this.state.data, new Set(nodeIds));
      
      console.log('Filtered tree data:', highlightedTreeData);
      
      // If no nodes were found, don't filter the tree - just highlight what we can find
      if (highlightedTreeData.length === 0) {
        console.warn('No matching nodes found for highlighting, keeping original tree structure');
        // Don't set highlightedTreeData, just keep the highlighting state for visual styling
        return;
      }
      
      // Collect only keys in paths to highlighted nodes (not all nodes)
      const keysToExpand = this.collectKeysInPathsToHighlightedNodes(highlightedTreeData, new Set(nodeIds));
      console.log('Keys to expand (only paths to highlighted nodes):', keysToExpand);
      
      this.setState({
        highlightedTreeData
      }, () => {
        // Force a re-render after state update
        this.forceUpdate();
      });

      // Update the provider props to include the expanded keys
      this.updateExpandedKeys(keysToExpand);
    } catch (error) {
      console.error('Error highlighting nodes:', error);
    }
  };

  private collectKeysInPathsToHighlightedNodes = (nodes: ReadonlyArray<TreeNode>, highlightedIds: Set<string>): string[] => {
    const keysToExpand: string[] = [];
    
    const collectKeys = (nodes: ReadonlyArray<TreeNode>, currentPath: string[]): void => {
      for (const node of nodes) {
        const nodeId = node.data[this.props.nodeBindingName].value;
        const nodeKey = node.key;
        const isHighlighted = highlightedIds.has(nodeId) || highlightedIds.has(nodeKey);
        
        if (isHighlighted) {
          // Add all keys in the current path to the expansion list
          keysToExpand.push(...currentPath);
        }
        
        // Continue recursively with this node added to the path
        if (node.children.length > 0) {
          collectKeys(node.children, [...currentPath, nodeKey]);
        }
      }
    };
    
    collectKeys(nodes, []);
    return Array.from(new Set(keysToExpand)); // Remove duplicates
  };

  private collectAllKeysInTree = (nodes: ReadonlyArray<TreeNode>): string[] => {
    const allKeys: string[] = [];
    
    const collectKeys = (nodes: ReadonlyArray<TreeNode>): void => {
      for (const node of nodes) {
        // Skip expand siblings buttons
        if (node.data.expandSiblings && node.data.expandSiblings.value === 'true') {
          continue;
        }
        
        allKeys.push(node.key);
        
        // Continue recursively with children
        if (node.children.length > 0) {
          collectKeys(node.children);
        }
      }
    };
    
    collectKeys(nodes);
    return allKeys;
  };

  private updateExpandedKeys = (keysToExpand: string[]) => {
    // Update the keysOpened prop to include the keys that should be expanded
    // This will be passed to the TreeAdvanced component
    this.expandedKeysForHighlighting = keysToExpand;
  };

  private expandedKeysForHighlighting: string[] = [];

  private filterTreeForHighlightedNodes = (nodes: ReadonlyArray<TreeNode>, highlightedIds: Set<string>): ReadonlyArray<TreeNode> => {
    const result: TreeNode[] = [];
    
    for (const node of nodes) {
      const nodeId = node.data[this.props.nodeBindingName].value;
      const nodeKey = node.key;
      const isHighlighted = highlightedIds.has(nodeId) || highlightedIds.has(nodeKey);
      
      console.log(`Checking node: ${nodeId} (key: ${nodeKey}), highlighted: ${isHighlighted}`);
      
      // Check if any descendant is highlighted
      const filteredChildren = this.filterTreeForHighlightedNodes(node.children, highlightedIds);
      const hasHighlightedDescendant = filteredChildren.length > 0;
      
      if (isHighlighted || hasHighlightedDescendant) {
        // If this node has children but only some are highlighted, add "expand siblings" functionality
        const allChildren = node.children;
        const hiddenSiblingsCount = allChildren.length - filteredChildren.length;
        
        let childrenToShow = filteredChildren;
        
        // Add "expand siblings" button if there are hidden siblings
        if (hiddenSiblingsCount > 0 && filteredChildren.length > 0) {
          const expandSiblingsNode: TreeNode = {
            key: `${nodeKey}_expand_siblings`,
            data: {
              [this.props.nodeBindingName]: Rdf.literal(`expand_${hiddenSiblingsCount}_siblings`),
              expandSiblings: Rdf.literal('true'),
              hiddenCount: Rdf.literal(hiddenSiblingsCount.toString()),
              parentKey: Rdf.literal(nodeKey)
            },
            children: []
          };
          
          childrenToShow = [...filteredChildren, expandSiblingsNode];
        }
        
        result.push({
          ...node,
          children: childrenToShow
        });
      }
    }
    
    return result;
  };

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

    // Combine original keysOpened with keys that should be expanded for highlighting
    const allKeysOpened = this.state.highlightedTreeData 
      ? [...this.props.keysOpened, ...this.expandedKeysForHighlighting]
      : this.props.keysOpened;

    // When highlighting is active, keep the default collapsed behavior but expand specific paths
    const shouldCollapseNodes = this.props.collapsed;

    const providerProps: ProviderPropsAdvanced = {
      tupleTemplate: this.handleDeprecatedLayout(),
      onNodeClick: this.onNodeClick,
      onNodeExpand: this.props.expandQuery ? this.expandNode : undefined,
      nodeData: this.state.highlightedTreeData || data,
      nodeKey: 'key',
      collapsed: shouldCollapseNodes,
      keysOpened: allKeysOpened,
      loadingNodes: this.state.loadingNodes,
      hasChildrenBinding: this.props.hasChildrenBinding,
      loadingTemplate: this.props.loadingTemplate,
      highlightedNodes: this.state.highlightedNodes,
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

    // Force TreeAdvanced to re-initialize when highlighting changes by using a different key
    const treeKey = this.state.highlightedTreeData ? 'highlighted-tree' : 'normal-tree';
    
    return D.div({}, createElement(TreeAdvanced, { ...providerProps, key: treeKey }));
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
    // Check if this is an "expand siblings" node
    if (node.data.expandSiblings && node.data.expandSiblings.value === 'true') {
      this.handleExpandSiblings(node);
      return;
    }
    // empty default onNodeClick for regular nodes
  };

  private handleExpandSiblings = (expandNode: any) => {
    const parentKey = expandNode.data.parentKey.value;
    console.log('Expanding siblings for parent:', parentKey);
    
    // Find the parent node in the original data and show all its children
    const originalParent = this.findNodeInTree(this.state.data, parentKey);
    if (originalParent) {
      // Update the highlighted tree data to include all children of this parent
      this.expandSiblingsForParent(parentKey, originalParent.children);
    }
  };

  private findNodeInTree = (nodes: ReadonlyArray<TreeNode>, nodeKey: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.key === nodeKey) {
        return node;
      }
      const found = this.findNodeInTree(node.children, nodeKey);
      if (found) {
        return found;
      }
    }
    return null;
  };

  private expandSiblingsForParent = (parentKey: string, allChildren: ReadonlyArray<TreeNode>) => {
    if (!this.state.highlightedTreeData) {
      return;
    }

    // Show ALL children but only expand those that contain highlighted nodes
    // First, we need to process each child to determine if it should be expanded
    const processedChildren = allChildren.map(child => {
      // Check if this child or any of its descendants contain highlighted nodes
      const childContainsHighlighted = this.nodeContainsHighlightedDescendants(child, this.state.highlightedNodes);
      
      if (childContainsHighlighted) {
        // If it contains highlighted nodes, filter its children to show the highlighted paths
        const filteredChildChildren = this.filterTreeForHighlightedNodes(child.children, this.state.highlightedNodes);
        return {
          ...child,
          children: filteredChildChildren
        };
      } else {
        // If it doesn't contain highlighted nodes, show it collapsed (no children)
        return {
          ...child,
          children: []
        };
      }
    });
    
    // Update the highlighted tree data to replace the filtered children with all processed children
    const updatedTreeData = this.replaceChildrenInTree(
      this.state.highlightedTreeData, 
      parentKey, 
      processedChildren
    );

    // Only collect expansion keys from children that actually have content (contain highlighted nodes)
    const childrenWithContent = processedChildren.filter(child => child.children.length > 0);
    const additionalKeysToExpand = this.collectKeysInPathsToHighlightedNodes(childrenWithContent, this.state.highlightedNodes);
    const allKeysToExpand = Array.from(new Set([...this.expandedKeysForHighlighting, ...additionalKeysToExpand]));
    this.updateExpandedKeys(allKeysToExpand);

    this.setState({
      highlightedTreeData: updatedTreeData
    });
  };

  private nodeContainsHighlightedDescendants = (node: TreeNode, highlightedIds: Set<string>): boolean => {
    const nodeId = node.data[this.props.nodeBindingName].value;
    const nodeKey = node.key;
    const isHighlighted = highlightedIds.has(nodeId) || highlightedIds.has(nodeKey);
    
    if (isHighlighted) {
      return true;
    }
    
    // Check children recursively
    for (const child of node.children) {
      if (this.nodeContainsHighlightedDescendants(child, highlightedIds)) {
        return true;
      }
    }
    
    return false;
  };

  private replaceChildrenInTree = (
    nodes: ReadonlyArray<TreeNode>, 
    parentKey: string, 
    newChildren: ReadonlyArray<TreeNode>
  ): ReadonlyArray<TreeNode> => {
    return nodes.map(node => {
      if (node.key === parentKey) {
        return {
          ...node,
          children: newChildren
        };
      }
      return {
        ...node,
        children: this.replaceChildrenInTree(node.children, parentKey, newChildren)
      };
    });
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
