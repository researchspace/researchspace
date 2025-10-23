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
import { TreeNode, ProviderPropsAdvanced, RelatedNodeCriteria, FilterOption } from './TreeTypes';

export interface SortOption {
  label: string;        // Display name in dropdown
  binding: string;      // SPARQL binding name to sort by
  type: 'string' | 'number' | 'date';  // Data type for proper comparison
  defaultDirection?: 'asc' | 'desc';   // Optional default direction
}

export interface SemanticTreeAdvancedConfig extends SemanticTreeConfig {
  /**
   * Whether to show tree connector lines
   * @default false
   */
  showTreeLines?: boolean;
  
  /**
   * Style of tree lines ('solid' or 'dotted')
   * @default 'solid'
   */
  treeLineStyle?: 'solid' | 'dotted';
  
  /**
   * Array of criteria for finding related nodes.
   * Each criterion defines a SPARQL query that will be executed
   * when the user selects it from the hover menu.
   * The query should return node IRIs in a ?node binding.
   * The current node's IRI will be injected as $__nodeIri__
   * 
   * @example
   * ```
   * [
   *   {
   *     label: "Same Extension",
   *     icon: "fa fa-file",
   *     query: "SELECT ?node WHERE { 
   *       <$__nodeIri__> ex:hasExtension ?ext . 
   *       ?node ex:hasExtension ?ext . 
   *       FILTER(?node != <$__nodeIri__>)
   *     }"
   *   }
   * ]
   * ```
   */
  relatedNodeCriteria?: RelatedNodeCriteria[];
  
  /**
   * Whether to show related node buttons on hover
   * @default true if relatedNodeCriteria is provided
   */
  showRelatedNodeButtons?: boolean;
  
  /**
   * CSS class for the related nodes button container
   */
  relatedNodeButtonClass?: string;

  /**
   * Callback when related nodes are found
   */
  onRelatedNodesFound?: (sourceNodeIri: string, criterion: RelatedNodeCriteria, foundNodeIds: string[]) => void;

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

  /**
   * Optional SPARQL Select query to find the path from a node to the root.
   * Used for highlighting nodes that are not in the initial query results.
   * The query should return all ancestors of a given node.
   * The node IRI will be injected as $__node__ variable.
   * 
   * Example:
   * ```
   * SELECT DISTINCT ?ancestor WHERE {
   *   <$__node__> (rdfs:subClassOf)* ?ancestor .
   * }
   * ```
   */
  pathToRootQuery?: string;

  /**
   * Optional SPARQL Select query for searching nodes.
   * The query should return node IRIs that match the search criteria.
   * The search text will be injected as $__searchText__ variable.
   * 
   * Example:
   * ```
   * SELECT DISTINCT ?node WHERE {
   *   ?node rdfs:label ?label .
   *   FILTER(CONTAINS(LCASE(?label), LCASE("$__searchText__")))
   * }
   * ```
   */
  searchQuery?: string;

  /**
   * Placeholder text for the search input.
   * @default 'Search...'
   */
  searchPlaceholder?: string;

  /**
   * Whether to show the search bar.
   * @default true if searchQuery is provided
   */
  showSearch?: boolean;

  /**
   * Array of sort options available to the user.
   * Each option specifies a SPARQL binding that can be used for sorting.
   * @example
   * ```
   * [
   *   { label: "Title", binding: "title", type: "string" },
   *   { label: "Child Count", binding: "childCount", type: "number" },
   *   { label: "Creation Date", binding: "created", type: "date" }
   * ]
   * ```
   */
  sortOptions?: SortOption[];
  
  /**
   * Initial sort configuration.
   * @example { binding: "title", direction: "asc" }
   */
  initialSort?: {
    binding: string;
    direction: 'asc' | 'desc';
  };
  
  /**
   * Whether to show sort controls.
   * @default true if sortOptions are provided
   */
  showSortControls?: boolean;
  
  /**
   * Custom CSS class for sort controls container.
   */
  sortControlsClass?: string;
  
  /**
   * Array of filter options that allow users to include/exclude nodes based on SPARQL conditions.
   * Each filter will be rendered as a checkbox. When checked, the filter condition will be
   * applied to exclude nodes from the tree.
   * The condition should be a SPARQL ASK query fragment with $__nodeIri__ as placeholder.
   * 
   * @example
   * ```
   * [
   *   {
   *     label: "Exclude omitted",
   *     description: "Hide nodes with 'Omitted information' as label",
   *     condition: "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ASK { <$__nodeIri__> rdfs:label \"Omitted information\" }",
   *     defaultChecked: false
   *   }
   * ]
   * ```
   */
  filterOptions?: FilterOption[];
  
  /**
   * Whether to show filter controls.
   * @default true if filterOptions are provided
   */
  showFilterControls?: boolean;
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
  searchText: string; // Current search input text
  isSearching: boolean; // Whether a search is in progress
  isExpanding: boolean; // Whether tree expansion is in progress after search
  currentSortBinding?: string; // Current field being sorted by
  currentSortDirection: 'asc' | 'desc'; // Current sort direction
  activeFilters: Set<string>; // Set of active filter labels
  filteredData?: ReadonlyArray<TreeNode>; // Data after applying filters
  isApplyingFilters: boolean; // Whether filters are being applied
  selectedNodeKey?: string; // Key of the currently selected node
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
    
    // Initialize sort state from props
    const initialSortBinding = props.initialSort?.binding || 
                              (props.sortOptions && props.sortOptions.length > 0 ? props.sortOptions[0].binding : undefined);
    const initialSortDirection = props.initialSort?.direction || 
                                (props.sortOptions?.find(opt => opt.binding === initialSortBinding)?.defaultDirection) || 
                                'asc';
    
    // Initialize active filters from defaultChecked
    const activeFilters = new Set<string>();
    if (props.filterOptions) {
      props.filterOptions.forEach(filter => {
        if (filter.defaultChecked) {
          activeFilters.add(filter.label);
        }
      });
    }
    
    this.state = {
      isLoading: true,
      errorMessage: maybe.Nothing<string>(),
      expandedNodes: new Map(),
      loadingNodes: new Set(),
      loadingTimers: new Map(),
      highlightedNodes: new Set(),
      searchText: '',
      isSearching: false,
      isExpanding: false,
      currentSortBinding: initialSortBinding,
      currentSortDirection: initialSortDirection,
      activeFilters,
      isApplyingFilters: false,
      selectedNodeKey: undefined,
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
      
      this.cancellation.map(
        listen({
          eventType: 'Component.TemplateUpdate',
          target: this.props.id,
        })
      ).onValue(this.handleTemplateUpdateEvent);
    }
  }
  
  private handleTemplateUpdateEvent = (event: any) => {
    if (event.data && event.data.iri) {
      const nodeKey = event.data.iri;
      console.log('Template update event received, setting selection:', nodeKey);
      this.setState({ selectedNodeKey: nodeKey }, () => {
        console.log('Selected node key is now:', this.state.selectedNodeKey);
      });
    }
  };

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
        this.setState({
          highlightedTreeData: undefined,
          highlightedNodes: new Set()
        });
        this.expandedKeysForHighlighting = [];
        return;
      }
      
      // Update highlighted nodes state immediately for visual feedback
      this.setState({
        highlightedNodes: new Set(nodeIds)
      });
      
      // Phase 2: Load paths to highlighted nodes
      if (this.props.pathToRootQuery && this.props.expandQuery) {
        const pathLoadStart = performance.now();
        await this.loadPathsToHighlightedNodes(nodeIds);
        const pathLoadTime = performance.now() - pathLoadStart;
        console.log(`  Phase 2 - Path Loading: ${pathLoadTime.toFixed(2)}ms (Cache size: ${this.state.expandedNodes.size})`);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Phase 3: Build complete tree with cache
      const buildTreeStart = performance.now();
      const completeTree = this.buildCompleteTreeWithCache(this.state.data);
      const buildTreeTime = performance.now() - buildTreeStart;
      console.log(`  Phase 3 - Build Complete Tree: ${buildTreeTime.toFixed(2)}ms`);
      
      // Phase 4: Filter tree for highlighted nodes
      const filterStart = performance.now();
      const highlightedTreeData = this.filterTreeForHighlightedNodes(completeTree, new Set(nodeIds));
      const filterTime = performance.now() - filterStart;
      console.log(`  Phase 4 - Filter Tree: ${filterTime.toFixed(2)}ms (${highlightedTreeData.length} root nodes)`);
      
      if (highlightedTreeData.length === 0) {
        this.setState({ highlightedTreeData: undefined });
        return;
      }
      
      // Phase 5: Collect keys to expand
      const collectStart = performance.now();
      const keysToExpand = this.collectKeysInPathsToHighlightedNodes(highlightedTreeData, new Set(nodeIds));
      const collectTime = performance.now() - collectStart;
      console.log(`  Phase 5 - Collect Expansion Keys: ${collectTime.toFixed(2)}ms (${keysToExpand.length} keys)`);
      
      this.updateExpandedKeys(keysToExpand);
      this.setState({ highlightedTreeData });
      
    } catch (error) {
      console.error('Error highlighting nodes:', error);
      this.setState({ highlightedTreeData: undefined });
    }
  };

  private buildCompleteTreeWithCache = (nodes: ReadonlyArray<TreeNode>): ReadonlyArray<TreeNode> => {
    return nodes.map(node => {
      const cachedChildren = this.state.expandedNodes.get(node.key);
      const children = cachedChildren || node.children;
      
      // Recursively build complete tree for children
      const completeChildren = children.length > 0 ? this.buildCompleteTreeWithCache(children) : [];
      
      return {
        ...node,
        children: completeChildren
      };
    });
  };

  private collectKeysInPathsToHighlightedNodes = (nodes: ReadonlyArray<TreeNode>, highlightedIds: Set<string>): string[] => {
    const keysToExpand: string[] = [];
    
    const collectKeys = (nodes: ReadonlyArray<TreeNode>, currentPath: string[]): boolean => {
      let hasHighlightedDescendant = false;
      
      for (const node of nodes) {
        const nodeId = node.data[this.props.nodeBindingName].value;
        const nodeKey = node.key;
        const isHighlighted = highlightedIds.has(nodeId) || highlightedIds.has(nodeKey);
        
        // Check if this node or any of its descendants are highlighted
        let nodeHasHighlighted = isHighlighted;
        
        // Continue recursively with this node added to the path
        if (node.children.length > 0) {
          const childHasHighlighted = collectKeys(node.children, [...currentPath, nodeKey]);
          nodeHasHighlighted = nodeHasHighlighted || childHasHighlighted;
        }
        
        if (nodeHasHighlighted) {
          // Add all keys in the current path plus this node to the expansion list
          keysToExpand.push(...currentPath, nodeKey);
          hasHighlightedDescendant = true;
        }
      }
      
      return hasHighlightedDescendant;
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

  private loadPathsToHighlightedNodes = async (nodeIds: string[]): Promise<void> => {
    if (!this.props.pathToRootQuery || !this.props.expandQuery) {
      return;
    }

    try {
      // Sub-phase 2a: Execute path-to-root queries
      const pathQueryStart = performance.now();
      const pathPromises = nodeIds.map(async (nodeId) => {
        const query = this.props.pathToRootQuery.replace(/\$__node__/g, nodeId);
        const context = this.context.semanticContext;
        
        try {
          const result = await SparqlClient.select(query, { context }).toPromise();
          
          if (!SparqlUtil.isSelectResultEmpty(result)) {
            const ancestors = result.results.bindings
              .map(binding => binding['ancestor'].value)
              .filter(ancestor => ancestor !== nodeId)
              .reverse();
            
            return { nodeId, ancestors };
          }
        } catch (error) {
          console.error(`Error loading path for node ${nodeId}:`, error);
        }
        return null;
      });

      const pathResults = await Promise.all(pathPromises);
      const validPaths = pathResults.filter(p => p !== null);
      const pathQueryTime = performance.now() - pathQueryStart;
      console.log(`    Sub-phase 2a - Path Queries: ${pathQueryTime.toFixed(2)}ms (${validPaths.length}/${nodeIds.length} successful)`);
      
      // Sub-phase 2b: Build path tree structure
      const buildPathStart = performance.now();
      const pathTree = this.buildPathTree(validPaths);
      const buildPathTime = performance.now() - buildPathStart;
      console.log(`    Sub-phase 2b - Build Path Tree: ${buildPathTime.toFixed(2)}ms`);
      
      // Sub-phase 2c: Expand nodes sequentially
      const expandStart = performance.now();
      await this.loadPathTreeSequentially(pathTree);
      const expandTime = performance.now() - expandStart;
      console.log(`    Sub-phase 2c - Sequential Expansion: ${expandTime.toFixed(2)}ms`);

    } catch (error) {
      console.error('Error loading paths to highlighted nodes:', error);
    }
  };

  private buildPathTree = (paths: Array<{nodeId: string, ancestors: string[]}>) => {
    const pathTree = new Map<string, Set<string>>();
    
    paths.forEach(path => {
      const fullPath = [...path.ancestors, path.nodeId];
      
      for (let i = 0; i < fullPath.length - 1; i++) {
        const parent = fullPath[i];
        const child = fullPath[i + 1];
        
        if (!pathTree.has(parent)) {
          pathTree.set(parent, new Set());
        }
        pathTree.get(parent).add(child);
      }
    });
    
    return pathTree;
  };

  private loadPathTreeSequentially = async (pathTree: Map<string, Set<string>>) => {
    // Find root nodes (nodes that are not children of any other node)
    const allChildren = new Set<string>();
    pathTree.forEach(children => {
      Array.from(children).forEach(child => allChildren.add(child));
    });
    
    const roots = Array.from(pathTree.keys()).filter(node => !allChildren.has(node));
    
    // Expand all root paths in parallel
    const rootPromises = roots.map(root => this.loadPathFromRoot(root, pathTree));
    await Promise.all(rootPromises);
  };

  private loadPathFromRoot = async (nodeIri: string, pathTree: Map<string, Set<string>>, parentNode?: TreeNode) => {
    let treeNode: TreeNode | null = await this.findOrLoadNode(nodeIri, parentNode);
    
    if (!treeNode) {
      return;
    }
    
    const childrenToLoad = pathTree.get(nodeIri);
    if (childrenToLoad && childrenToLoad.size > 0) {
      const hasLazyChildren = treeNode.data[this.props.hasChildrenBinding]?.value === 'true';
      const cachedChildren = this.state.expandedNodes.get(treeNode.key);
      
      if (hasLazyChildren && !cachedChildren) {
        await this.expandNode(treeNode);
      }
      
      for (const childIri of Array.from(childrenToLoad)) {
        await this.loadPathFromRoot(childIri, pathTree, treeNode);
      }
    }
  };
  
  private findOrLoadNode = async (nodeIri: string, parentNode?: TreeNode): Promise<TreeNode | null> => {
    let searchScope: ReadonlyArray<TreeNode>;
    
    if (parentNode) {
      const cachedChildren = this.state.expandedNodes.get(parentNode.key);
      searchScope = cachedChildren || parentNode.children;
    } else {
      searchScope = this.state.data || [];
    }
    
    let node = this.findNodeByIriInTree(searchScope, nodeIri);
    
    if (node) {
      return node;
    }
    
    if (parentNode) {
      const hasLazyChildren = parentNode.data[this.props.hasChildrenBinding]?.value === 'true';
      const alreadyExpanded = this.state.expandedNodes.has(parentNode.key);
      
      if (hasLazyChildren && !alreadyExpanded) {
        const expandedChildren = await this.expandNode(parentNode);
        node = this.findNodeByIriInTree(expandedChildren, nodeIri);
        if (node) {
          return node;
        }
      }
    } else if (this.state.data) {
      for (const rootNode of this.state.data) {
        const hasLazyChildren = rootNode.data[this.props.hasChildrenBinding]?.value === 'true';
        const alreadyExpanded = this.state.expandedNodes.has(rootNode.key);
        
        if (hasLazyChildren && !alreadyExpanded) {
          const expandedChildren = await this.expandNode(rootNode);
          node = this.findNodeByIriInTree(expandedChildren, nodeIri);
          if (node) {
            return node;
          }
        }
      }
    }
    
    return null;
  };

  private findNodeByIriInTree = (nodes: ReadonlyArray<TreeNode>, nodeIri: string): TreeNode | null => {
    if (!nodes) return null;
    
    for (const node of nodes) {
      const currentNodeIri = node.data[this.props.nodeBindingName]?.value;
      
      // Direct IRI comparison only - no pattern matching
      if (currentNodeIri === nodeIri) {
        return node;
      }
      
      // Also check by key if different from the IRI
      if (node.key === nodeIri) {
        return node;
      }
      
      // Search in children recursively
      const found = this.findNodeByIriInTree(node.children, nodeIri);
      if (found) {
        return found;
      }
    }
    return null;
  };

  // These methods are now replaced by the new implementation above

  private collectExistingNodeIds = (nodes: ReadonlyArray<TreeNode>, existingNodes: Set<string>) => {
    nodes.forEach(node => {
      const nodeId = node.data[this.props.nodeBindingName].value;
      existingNodes.add(nodeId);
      if (node.children.length > 0) {
        this.collectExistingNodeIds(node.children, existingNodes);
      }
    });
  };

  private expandPathFromRoot = async (rootId: string, targetNodes: Set<string>) => {
    // Find the root node in our tree
    const rootNode = this.findNodeByIdInTree(this.state.data, rootId);
    if (!rootNode) {
      console.warn(`Root node ${rootId} not found in tree`);
      return;
    }

    // Recursively expand nodes that are in our target set
    await this.expandNodeRecursively(rootNode, targetNodes);
  };

  private findNodeByIdInTree = (nodes: ReadonlyArray<TreeNode>, nodeId: string): TreeNode | null => {
    for (const node of nodes) {
      const currentNodeId = node.data[this.props.nodeBindingName].value;
      if (currentNodeId === nodeId) {
        return node;
      }
      const found = this.findNodeByIdInTree(node.children, nodeId);
      if (found) {
        return found;
      }
    }
    return null;
  };

  private expandNodeRecursively = async (node: TreeNode, targetNodes: Set<string>) => {
    const nodeId = node.data[this.props.nodeBindingName].value;
    
    // Check if this node has children that need to be loaded
    const hasChildrenValue = node.data[this.props.hasChildrenBinding];
    const hasLazyChildren = hasChildrenValue && hasChildrenValue.value === 'true';
    
    if (hasLazyChildren && node.children.length === 0) {
      // Load children for this node
      const children = await this.expandNode(node);
      
      // Update the tree structure with the loaded children
      if (children.length > 0) {
        await this.updateTreeWithLoadedChildren(node.key, children);
        
        // Continue expanding children that are in our target set
        for (const child of children) {
          const childId = child.data[this.props.nodeBindingName].value;
          if (targetNodes.has(childId)) {
            await this.expandNodeRecursively(child, targetNodes);
          }
        }
      }
    } else {
      // Node already has children, check if any need to be expanded
      for (const child of node.children) {
        const childId = child.data[this.props.nodeBindingName].value;
        if (targetNodes.has(childId)) {
          await this.expandNodeRecursively(child, targetNodes);
        }
      }
    }
  };

  private updateTreeWithLoadedChildren = async (parentKey: string, children: ReadonlyArray<TreeNode>) => {
    return new Promise<void>((resolve) => {
      this.setState(prevState => {
        const updatedData = this.addChildrenToNode(prevState.data, parentKey, children);
        return { data: updatedData };
      }, resolve);
    });
  };

  private addChildrenToNode = (nodes: ReadonlyArray<TreeNode>, parentKey: string, newChildren: ReadonlyArray<TreeNode>): ReadonlyArray<TreeNode> => {
    return nodes.map(node => {
      if (node.key === parentKey) {
        return {
          ...node,
          children: newChildren
        };
      }
      return {
        ...node,
        children: this.addChildrenToNode(node.children, parentKey, newChildren)
      };
    });
  };

  private filterTreeForHighlightedNodes = (nodes: ReadonlyArray<TreeNode>, highlightedIds: Set<string>): ReadonlyArray<TreeNode> => {
    const result: TreeNode[] = [];
    
    for (const node of nodes) {
      const nodeId = node.data[this.props.nodeBindingName]?.value;
      const nodeKey = node.key;
      const isHighlighted = highlightedIds.has(nodeId) || highlightedIds.has(nodeKey);
      
      let nodeChildren = node.children;
      if (this.state.expandedNodes.has(nodeKey)) {
        nodeChildren = this.state.expandedNodes.get(nodeKey) || node.children;
      }
      
      const filteredChildren = this.filterTreeForHighlightedNodes(nodeChildren, highlightedIds);
      const hasHighlightedDescendant = filteredChildren.length > 0;
      
      if (isHighlighted || hasHighlightedDescendant) {
        const allChildren = nodeChildren;
        const hiddenSiblingsCount = allChildren.length - filteredChildren.length;
        let childrenToShow = filteredChildren;
        
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
      return [];
    }

    const nodeKey = node.key;
    
    if (enableCache && this.state.expandedNodes.has(nodeKey)) {
      const cachedChildren = this.state.expandedNodes.get(nodeKey) || [];
      if (this.state.activeFilters.size > 0) {
        const activeFilterConfigs = this.props.filterOptions?.filter(f => 
          this.state.activeFilters.has(f.label)
        ) || [];
        if (activeFilterConfigs.length > 0) {
          const excludedNodes = await this.buildExcludedNodesSet(activeFilterConfigs);
          return this.filterTreeWithExclusions(cachedChildren, excludedNodes);
        }
      }
      return cachedChildren;
    }

    const timer = window.setTimeout(() => {
      this.setState(prevState => ({
        loadingNodes: new Set(Array.from(prevState.loadingNodes).concat([nodeKey]))
      }));
    }, 1000);

    this.setState(prevState => ({
      loadingTimers: new Map(Array.from(prevState.loadingTimers.entries()).concat([[nodeKey, timer]]))
    }));

    try {
      const queryWithNode = expandQuery.replace(/\{\{clickedNode\}\}/g, node.data[this.props.nodeBindingName].value);
      const context = this.context.semanticContext;
      const result = await SparqlClient.select(queryWithNode, { context }).toPromise();
      
      if (SparqlUtil.isSelectResultEmpty(result)) {
        const emptyResult: ReadonlyArray<TreeNode> = [];
        await this.updateExpandedCache(nodeKey, emptyResult);
        return emptyResult;
      }

      const { nodeBindingName, parentBindingName } = this.props;
      const graph = transformBindingsToGraph({
        bindings: result.results.bindings,
        nodeBindingName,
        parentBindingName,
      });

      breakGraphCycles(graph.nodes);
      const parentNode = graph.map.get(node.key);

      if (parentNode) {
        let childNodes = makeImmutableForest(parentNode.children);
        
        if (this.state.currentSortBinding) {
          childNodes = this.sortTreeNodes(childNodes);
        }
        
        if (this.state.activeFilters.size > 0) {
          const activeFilterConfigs = this.props.filterOptions?.filter(f => 
            this.state.activeFilters.has(f.label)
          ) || [];
          if (activeFilterConfigs.length > 0) {
            const excludedNodes = await this.buildExcludedNodesSet(activeFilterConfigs);
            childNodes = this.filterTreeWithExclusions(childNodes, excludedNodes);
          }
        }
        
        await this.updateExpandedCache(nodeKey, childNodes);
        return childNodes;
      }
      
      return [];
      
    } catch (error) {
      console.error('Error expanding node:', error);
      this.setState(prevState => ({
        errorMessage: maybe.Just(`Error expanding node: ${error.message || error}`)
      }));
      return [];
    } finally {
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

  private updateExpandedCache = (nodeKey: string, children: ReadonlyArray<TreeNode>): Promise<void> => {
    return new Promise((resolve) => {
      if (this.props.enableCache) {
        this.setState(prevState => {
          const newCache = new Map(prevState.expandedNodes);
          newCache.set(nodeKey, children);
          return { expandedNodes: newCache };
        }, resolve);
      } else {
        resolve();
      }
    });
  }

  public render() {
    if (this.state.errorMessage.isJust) {
      return createElement(ErrorNotification, { errorMessage: this.state.errorMessage.get() });
    }
    return this.state.isLoading ? createElement(Spinner) : this.renderTree();
  }

  private buildFilteredCacheFromTree(nodes: ReadonlyArray<TreeNode>): Map<string, ReadonlyArray<TreeNode>> {
    const filteredCache = new Map<string, ReadonlyArray<TreeNode>>();
    
    const extractChildren = (nodes: ReadonlyArray<TreeNode>) => {
      for (const node of nodes) {
        if (node.children.length > 0) {
          filteredCache.set(node.key, node.children);
          // Recursively extract from children
          extractChildren(node.children);
        }
      }
    };
    
    extractChildren(nodes);
    return filteredCache;
  }

  private renderTree() {
    const { data } = this.state;
    if (data.length === 0) {
      return createElement(TemplateItem, { template: { source: this.props.noResultTemplate } });
    }

    // Use filtered data if filters are active, otherwise use highlighted or normal data
    const dataToShow = this.state.filteredData || this.state.highlightedTreeData || data;

    // Combine original keysOpened with keys that should be expanded for highlighting
    const allKeysOpened = this.state.highlightedTreeData 
      ? [...this.props.keysOpened, ...this.expandedKeysForHighlighting]
      : this.props.keysOpened;

    // When highlighting is active, don't collapse nodes by default
    const shouldCollapseNodes = this.state.highlightedTreeData ? false : this.props.collapsed;

    // Build a filtered cache from the highlighted tree data
    const cacheToUse = this.state.highlightedTreeData 
      ? this.buildFilteredCacheFromTree(this.state.highlightedTreeData)
      : this.state.expandedNodes;

    const providerProps: ProviderPropsAdvanced = {
      tupleTemplate: this.handleDeprecatedLayout(),
      onNodeClick: this.onNodeClick,
      onNodeExpand: this.props.expandQuery ? this.expandNode : undefined,
      nodeData: dataToShow,
      nodeKey: 'key',
      collapsed: shouldCollapseNodes,
      keysOpened: allKeysOpened,
      loadingNodes: this.state.loadingNodes,
      hasChildrenBinding: this.props.hasChildrenBinding,
      loadingTemplate: this.props.loadingTemplate,
      highlightedNodes: this.state.highlightedNodes,
      selectedNodeKey: this.state.selectedNodeKey,
      // Use filtered cache when highlighting to show filtered tree structure with expand siblings buttons
      preloadedChildren: cacheToUse,
      relatedNodeCriteria: this.props.relatedNodeCriteria,
      onFindRelatedNodes: this.props.relatedNodeCriteria ? this.handleFindRelatedNodes : undefined,
      showTreeLines: this.props.showTreeLines,
      treeLineStyle: this.props.treeLineStyle,
    };

    const { provider, d3TreeOptions } = this.props;
    const isD3Provider = provider === 'd3-sankey' || provider === 'd3-dendrogram' || provider === 'd3-collapsible-tree';

    let treeElement;
    if (isD3Provider) {
      treeElement = createElement(D3Tree, {
        ...providerProps,
        provider: provider as D3TreeProviderKind,
        options: d3TreeOptions,
      });
    } else if (typeof provider === 'string' && provider !== 'html') {
      console.warn(`Unknown semantic tree provider '${provider}'`);
    } else {
      // Force TreeAdvanced to re-initialize when highlighting changes by using a different key
      const treeKey = this.state.highlightedTreeData ? 'highlighted-tree' : 'normal-tree';
      treeElement = createElement(TreeAdvanced, { ...providerProps, key: treeKey });
    }

    // Check if we should show the search bar, sort controls, and filter controls
    const showSearch = this.props.showSearch !== false && this.props.searchQuery;
    const showSort = this.props.sortOptions && this.props.sortOptions.length > 0 && this.props.showSortControls !== false;
    const showFilters = this.props.showFilterControls !== false && this.props.filterOptions && this.props.filterOptions.length > 0;

    return D.div({},
      showFilters && this.renderFilterControls(),
      showSort && this.renderSortControls(),
      showSearch && this.renderSearchBar(),
      D.div({
        style: {
          position: 'relative',
          opacity: (this.state.isSearching || this.state.isExpanding) ? 0.4 : 1,
          pointerEvents: (this.state.isSearching || this.state.isExpanding) ? 'none' : 'auto',
          transition: 'opacity 0.3s ease'
        }
      }, treeElement)
    );
  }

  private renderFilterControls = () => {
    if (!this.props.filterOptions || this.props.filterOptions.length === 0 || this.props.showFilterControls === false) {
      return null;
    }

    return D.div(
      {
        style: {
          marginBottom: '10px',
          padding: '8px',
          backgroundColor: '#f0f8ff',
          borderRadius: '4px',
          border: '1px solid #d0e8ff'
        }
      },
      D.div({
        style: {
          fontWeight: 'bold',
          fontSize: '14px',
          marginBottom: '6px',
          color: '#333'
        }
      }, 'Filters:'),
      D.div({
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px'
        }
      },
        this.props.filterOptions.map(filter =>
          D.label({
            key: filter.label,
            style: {
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none'
            },
            title: filter.description
          },
            D.input({
              type: 'checkbox',
              checked: this.state.activeFilters.has(filter.label),
              onChange: () => this.handleFilterToggle(filter.label),
              disabled: this.state.isApplyingFilters,
              style: {
                marginRight: '6px',
                cursor: this.state.isApplyingFilters ? 'not-allowed' : 'pointer'
              }
            }),
            D.span({
              style: {
                fontSize: '14px',
                color: this.state.isApplyingFilters ? '#999' : '#333'
              }
            }, filter.label)
          )
        ),
        this.state.isApplyingFilters && D.div({
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#007bff'
          }
        },
          D.i({ className: 'fa fa-spinner fa-spin' }),
          D.span({ style: { fontSize: '13px' } }, 'Applying filters...')
        )
      )
    );
  };

  private handleFilterToggle = async (filterLabel: string) => {
    this.setState(prevState => {
      const newActiveFilters = new Set(prevState.activeFilters);
      if (newActiveFilters.has(filterLabel)) {
        newActiveFilters.delete(filterLabel);
      } else {
        newActiveFilters.add(filterLabel);
      }
      return { activeFilters: newActiveFilters };
    }, () => {
      // Apply filters after state update
      this.applyFilters();
    });
  };

  private applyFilters = async () => {
    if (!this.props.filterOptions || this.state.activeFilters.size === 0) {
      // No filters active, clear filtered data and cache
      this.setState({ 
        filteredData: undefined,
        expandedNodes: new Map() // Clear cache when filters are removed
      });
      return;
    }

    this.setState({ isApplyingFilters: true });

    try {
      const activeFilterConfigs = this.props.filterOptions.filter(f => 
        this.state.activeFilters.has(f.label)
      );

      // Build a set of all nodes to exclude by running SELECT queries
      const excludedNodes = await this.buildExcludedNodesSet(activeFilterConfigs);

      // Apply filters to the tree data using the exclusion set
      const filteredData = this.filterTreeWithExclusions(this.state.data, excludedNodes);
      
      this.setState({ 
        filteredData,
        expandedNodes: new Map(), // Clear cache to force re-expansion with filters
        isApplyingFilters: false 
      });
    } catch (error) {
      console.error('Error applying filters:', error);
      this.setState({
        isApplyingFilters: false,
        errorMessage: maybe.Just(`Filter error: ${error.message || error}`)
      });
    }
  };

  private buildExcludedNodesSet = async (filters: FilterOption[]): Promise<Set<string>> => {
    const excludedNodes = new Set<string>();
    
    // Run each filter's SELECT query to get nodes to exclude
    for (const filter of filters) {
      try {
        const selectQuery = filter.condition;
        const context = this.context.semanticContext;
        const result = await SparqlClient.select(selectQuery, { context }).toPromise();
        
        if (!SparqlUtil.isSelectResultEmpty(result)) {
          // Add all returned node IRIs to the exclusion set
          result.results.bindings.forEach(binding => {
            if (binding['node']) {
              const nodeIri = binding['node'].value;
              excludedNodes.add(nodeIri);
            }
          });
        }
      } catch (error) {
        console.error(`Error executing filter "${filter.label}":`, error);
        // Continue with other filters even if one fails
      }
    }
    
    return excludedNodes;
  };

  private filterTreeWithExclusions = (
    nodes: ReadonlyArray<TreeNode>,
    excludedNodes: Set<string>
  ): ReadonlyArray<TreeNode> => {
    const result: TreeNode[] = [];

    for (const node of nodes) {
      const nodeIri = node.data[this.props.nodeBindingName].value;
      
      // Check if this node is in the exclusion set
      const isExcluded = excludedNodes.has(nodeIri) || excludedNodes.has(node.key);
      
      // Filter children recursively
      const filteredChildren = node.children.length > 0 
        ? this.filterTreeWithExclusions(node.children, excludedNodes)
        : [];
      
      // Include node if NOT excluded OR has children that passed filters
      if (!isExcluded || filteredChildren.length > 0) {
        result.push({
          ...node,
          children: filteredChildren
        });
      }
    }
    
    return result;
  };

  private renderSearchBar() {
    const placeholder = this.props.searchPlaceholder || 'Search...';
    
    return D.div(
      { 
        style: { 
          marginBottom: '10px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        } 
      },
      D.div({
        style: {
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }
      },
        D.input({
          type: 'text',
          placeholder: placeholder,
          value: this.state.searchText,
          onChange: this.handleSearchInputChange,
          onKeyPress: this.handleSearchKeyPress,
          style: {
            width: '100%',
            padding: '6px 12px',
            paddingRight: this.state.isSearching ? '36px' : '12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px'
          },
          disabled: this.state.isSearching
        }),
        this.state.isSearching && D.div({
          style: {
            position: 'absolute',
            right: '8px',
            display: 'flex',
            alignItems: 'center'
          }
        },
          D.i({
            className: 'fa fa-spinner fa-spin',
            style: {
              color: '#007bff',
              fontSize: '16px'
            }
          })
        )
      ),
      D.button({
        onClick: this.executeSearch,
        disabled: (this.state.isSearching || this.state.isExpanding) || !this.state.searchText.trim(),
        style: {
          padding: '6px 16px',
          backgroundColor: (this.state.isSearching || this.state.isExpanding) || !this.state.searchText.trim() ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: (this.state.isSearching || this.state.isExpanding) || !this.state.searchText.trim() ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }
      }, 
        (this.state.isSearching || this.state.isExpanding) && D.i({
          className: 'fa fa-spinner fa-spin',
          style: { fontSize: '14px' }
        }),
        this.state.isSearching ? 'Searching...' : this.state.isExpanding ? 'Expanding...' : 'Search'
      ),
      this.state.highlightedNodes.size > 0 && D.div({
        style: {
          padding: '6px 12px',
          backgroundColor: '#e7f3ff',
          color: '#0066cc',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }
      },
        D.i({ className: 'fa fa-check-circle' }),
        D.span({}, `${this.state.highlightedNodes.size} result${this.state.highlightedNodes.size === 1 ? '' : 's'}`)
      ),
      this.state.searchText && D.button({
        onClick: this.clearSearch,
        disabled: this.state.isSearching,
        style: {
          padding: '6px 16px',
          backgroundColor: this.state.isSearching ? '#ccc' : '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: this.state.isSearching ? 'not-allowed' : 'pointer',
          fontSize: '14px'
        }
      }, 'Clear')
    );
  }

  private handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ searchText: event.target.value });
  };

  private handleSearchKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && this.state.searchText.trim()) {
      this.executeSearch();
    }
  };

  private executeSearch = async () => {
    if (!this.props.searchQuery || !this.state.searchText.trim()) {
      return;
    }

    this.setState({ isSearching: true });
    
    // Performance tracking
    const perfStart = performance.now();
    console.log(`\n=== SEARCH PERFORMANCE: "${this.state.searchText.trim()}" ===`);

    try {
      // Phase 1: Execute search query
      const queryStart = performance.now();
      const query = this.props.searchQuery.replace(/\$__searchText__/g, this.state.searchText.trim());
      const context = this.context.semanticContext;
      const result = await SparqlClient.select(query, { context }).toPromise();
      const queryTime = performance.now() - queryStart;
      
      if (SparqlUtil.isSelectResultEmpty(result)) {
        console.log(`No results found (Query: ${queryTime.toFixed(2)}ms)`);
        this.setState({ highlightedNodes: new Set() });
        await this.highlightNodes([]);
      } else {
        const nodeIds = result.results.bindings
          .map(binding => binding['node'] ? binding['node'].value : null)
          .filter(id => id !== null);

        console.log(`Found ${nodeIds.length} nodes (Query: ${queryTime.toFixed(2)}ms)`);
        this.setState({ highlightedNodes: new Set(nodeIds), isSearching: false, isExpanding: true });
        
        // Phase 2: Highlight nodes (includes path loading and tree filtering)
        await this.highlightNodes(nodeIds);
        this.setState({ isExpanding: false });
      }
      
      const totalTime = performance.now() - perfStart;
      console.log(`TOTAL SEARCH TIME: ${totalTime.toFixed(2)}ms`);
      console.log(`=== END SEARCH PERFORMANCE ===\n`);
      
    } catch (error) {
      console.error('Error executing search:', error);
      this.setState({
        errorMessage: maybe.Just(`Search error: ${error.message || error}`)
      });
    } finally {
      this.setState({ isSearching: false, isExpanding: false });
    }
  };

  private clearSearch = () => {
    this.setState({ 
      searchText: '',
      highlightedNodes: new Set()
    });
    // Clear highlighting
    this.highlightNodes([]);
  };

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
    let data = makeImmutableForest(roots);

    // Apply initial sorting if configured
    if (this.props.sortOptions && this.props.sortOptions.length > 0 && this.state.currentSortBinding) {
      data = this.sortTreeNodes(data);
    }

    if (notFound.length === 0) {
      this.setState({ data, isLoading: false }, () => {
        // Apply filters after data is loaded if there are active filters
        if (this.state.activeFilters.size > 0) {
          this.applyFilters();
        }
      });
    } else {
      const notFoundRoots = notFound.map((root) => `'${root}'`).join(', ');
      this.setState({
        data,
        isLoading: false,
        errorMessage: maybe.Just(`Expected roots not found: ${notFoundRoots}`),
      }, () => {
        // Apply filters after data is loaded if there are active filters
        if (this.state.activeFilters.size > 0) {
          this.applyFilters();
        }
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
    
    // Set this node as selected
    console.log('Node clicked, setting as selected:', node.key);
    this.setState({ selectedNodeKey: node.key }, () => {
      console.log('Selected node key is now:', this.state.selectedNodeKey);
    });
  };

  private handleFindRelatedNodes = async (node: TreeNode, criterion: RelatedNodeCriteria) => {
    const nodeIri = node.data[this.props.nodeBindingName].value;
    
    console.log(`Finding related nodes for ${nodeIri} using criterion: ${criterion.label}`);
    
    // Show loading state (reuse search loading state)
    this.setState({ isSearching: true });
    
    try {
      // Replace placeholder with actual node IRI
      const query = criterion.query.replace(/\$__nodeIri__/g, nodeIri);
      
      const context = this.context.semanticContext;
      const result = await SparqlClient.select(query, { context }).toPromise();
      
      if (!SparqlUtil.isSelectResultEmpty(result)) {
        const relatedNodeIds = result.results.bindings
          .map(binding => binding['node']?.value)
          .filter(id => id !== null && id !== undefined);
        
        console.log(`Found ${relatedNodeIds.length} related nodes using criterion: ${criterion.label}`);
        
        // Include the source node in highlighting for context
        const allHighlightedNodes = [nodeIri, ...relatedNodeIds];
        
        // Update highlighted nodes
        this.setState({
          highlightedNodes: new Set(allHighlightedNodes)
        });
        
        // Trigger highlighting
        await this.highlightNodes(allHighlightedNodes);
        
        // Optional: Call callback if provided
        if (this.props.onRelatedNodesFound) {
          this.props.onRelatedNodesFound(nodeIri, criterion, relatedNodeIds);
        }
      } else {
        console.log(`No related nodes found for criterion: ${criterion.label}`);
        // Clear highlighting to show no results
        this.setState({
          highlightedNodes: new Set()
        });
        await this.highlightNodes([]);
      }
    } catch (error) {
      console.error(`Error finding related nodes with criterion "${criterion.label}":`, error);
      this.setState({
        errorMessage: maybe.Just(`Error finding related nodes: ${error.message || error}`)
      });
    } finally {
      this.setState({ isSearching: false });
    }
  };

  private handleExpandSiblings = (expandNode: any) => {
    const parentKey = expandNode.data.parentKey.value;
    console.log('Expanding siblings for parent:', parentKey);
    
    // First build the complete tree with cache to find all children
    const completeTree = this.buildCompleteTreeWithCache(this.state.data);
    
    // Find the parent node in the complete tree
    const originalParent = this.findNodeInTree(completeTree, parentKey);
    if (originalParent) {
      console.log(`Found parent node with ${originalParent.children.length} children`);
      // Update the highlighted tree data to include all children of this parent
      this.expandSiblingsForParent(parentKey, originalParent.children);
    } else {
      console.warn(`Parent node ${parentKey} not found in tree`);
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

    // First, check if we have cached children for the parent
    const cachedChildren = this.state.expandedNodes.get(parentKey);
    const childrenToProcess = cachedChildren || allChildren;

    // Show ALL children but only expand those that contain highlighted nodes
    // First, we need to process each child to determine if it should be expanded
    const processedChildren = childrenToProcess.map(child => {
      // Build complete child with cache
      const completeChild = this.buildCompleteNodeWithCache(child);
      
      // Check if this child or any of its descendants contain highlighted nodes
      const childContainsHighlighted = this.nodeContainsHighlightedDescendants(completeChild, this.state.highlightedNodes);
      
      if (childContainsHighlighted) {
        // If it contains highlighted nodes, filter its children to show the highlighted paths
        const filteredChildChildren = this.filterTreeForHighlightedNodes(completeChild.children, this.state.highlightedNodes);
        return {
          ...completeChild,
          children: filteredChildChildren
        };
      } else {
        // If it doesn't contain highlighted nodes, show it collapsed (no children)
        return {
          ...completeChild,
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

  private buildCompleteNodeWithCache = (node: TreeNode): TreeNode => {
    const cachedChildren = this.state.expandedNodes.get(node.key);
    const children = cachedChildren || node.children;
    
    // Recursively build complete tree for children
    const completeChildren = children.length > 0 ? children.map(child => this.buildCompleteNodeWithCache(child)) : [];
    
    return {
      ...node,
      children: completeChildren
    };
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

  private sortTreeNodes = (nodes: ReadonlyArray<TreeNode>): ReadonlyArray<TreeNode> => {
    if (!this.state.currentSortBinding) {
      return nodes;
    }

    const sortOption = this.props.sortOptions?.find(
      opt => opt.binding === this.state.currentSortBinding
    );
    
    if (!sortOption) {
      return nodes;
    }

    const sortedNodes = [...nodes].sort((a, b) => {
      // Skip "expand siblings" nodes - keep them at the end
      if (a.data.expandSiblings && a.data.expandSiblings.value === 'true') {
        return 1;
      }
      if (b.data.expandSiblings && b.data.expandSiblings.value === 'true') {
        return -1;
      }

      const aValue = a.data[sortOption.binding]?.value;
      const bValue = b.data[sortOption.binding]?.value;

      // Handle missing values - put them at the end
      if (!aValue && !bValue) return 0;
      if (!aValue) return 1;
      if (!bValue) return -1;

      let comparison = 0;
      
      switch (sortOption.type) {
        case 'number':
          comparison = parseFloat(aValue) - parseFloat(bValue);
          break;
        case 'date':
          comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
          break;
        case 'string':
        default:
          // Use localeCompare for better string sorting (handles numbers in strings correctly)
          comparison = aValue.localeCompare(bValue, undefined, { 
            numeric: true,
            sensitivity: 'base' 
          });
          break;
      }

      return this.state.currentSortDirection === 'asc' ? comparison : -comparison;
    });

    // Recursively sort children
    return sortedNodes.map(node => ({
      ...node,
      children: this.sortTreeNodes(node.children)
    }));
  };

  private handleSortFieldChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newBinding = event.target.value;
    const sortOption = this.props.sortOptions?.find(opt => opt.binding === newBinding);
    const direction = sortOption?.defaultDirection || 'asc';
    
    this.setState({
      currentSortBinding: newBinding,
      currentSortDirection: direction
    }, this.applySortToCurrentData);
  };

  private toggleSortDirection = () => {
    this.setState(prevState => ({
      currentSortDirection: prevState.currentSortDirection === 'asc' ? 'desc' : 'asc'
    }), this.applySortToCurrentData);
  };

  private applySortToCurrentData = () => {
    if (this.state.data) {
      const sortedData = this.sortTreeNodes(this.state.data);
      this.setState({ data: sortedData });
      
      // Also update highlighted tree if active
      if (this.state.highlightedTreeData) {
        const sortedHighlighted = this.sortTreeNodes(this.state.highlightedTreeData);
        this.setState({ highlightedTreeData: sortedHighlighted });
      }
      
      // Update cached expanded nodes with sorted versions
      if (this.state.expandedNodes.size > 0) {
        const sortedCache = new Map<string, ReadonlyArray<TreeNode>>();
        this.state.expandedNodes.forEach((children, key) => {
          sortedCache.set(key, this.sortTreeNodes(children));
        });
        this.setState({ expandedNodes: sortedCache });
      }
    }
  };

  private renderSortControls = () => {
    if (!this.props.sortOptions || this.props.sortOptions.length === 0 || this.props.showSortControls === false) {
      return null;
    }

    const { currentSortBinding, currentSortDirection } = this.state;
    
    return D.div(
      { 
        className: this.props.sortControlsClass || 'tree-sort-controls',
        style: { 
          marginBottom: '10px',
          padding: '8px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        } 
      },
      D.label({ 
        style: { 
          marginRight: '5px',
          fontWeight: 'bold',
          fontSize: '14px'
        } 
      }, 'Sort by:'),
      D.select({
        value: currentSortBinding || '',
        onChange: this.handleSortFieldChange,
        style: {
          padding: '4px 8px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          fontSize: '14px',
          minWidth: '150px'
        }
      },
        !currentSortBinding && D.option({ 
          value: '', 
          disabled: true 
        }, 'Select field...'),
        this.props.sortOptions.map(option =>
          D.option({ 
            key: option.binding, 
            value: option.binding 
          }, option.label)
        )
      ),
      currentSortBinding && D.button({
        onClick: this.toggleSortDirection,
        style: {
          padding: '4px 12px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          backgroundColor: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '14px'
        },
        title: currentSortDirection === 'asc' ? 'Sort Ascending' : 'Sort Descending'
      },
        D.i({
          className: currentSortDirection === 'asc' ? 'fa fa-sort-amount-asc' : 'fa fa-sort-amount-desc',
          style: { marginRight: '4px' }
        }),
        currentSortDirection === 'asc' ? 'A → Z' : 'Z → A'
      )
    );
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
