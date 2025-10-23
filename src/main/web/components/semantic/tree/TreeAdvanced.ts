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

import { Component, createElement, MouseEvent } from 'react';
import * as D from 'react-dom-factories';
import * as _ from 'lodash';
import * as ReactTreeView from 'react-treeview';
import * as classnames from 'classnames';

import { TemplateItem } from 'platform/components/ui/template';

import { ProviderPropsAdvanced, TreeNode, RelatedNodeCriteria } from './TreeTypes';

import 'react-treeview/react-treeview.css';
import * as styles from './Tree.scss';

export interface TreeAdvancedProps extends ProviderPropsAdvanced {
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
}

interface State {
  collapsedBookkeeping?: BookeepingDictionary;
  activeNode?: any;
  expandedChildren: Map<string, ReadonlyArray<TreeNode>>; // Store dynamically loaded children
  hoveredNodeKey?: string;
  activeDropdownKey?: string; // Track which dropdown is open
  dropdownPosition?: { top: number; left: number }; // Track dropdown position
  dropdownNode?: TreeNode; // Track which node the dropdown is for
}

interface BookeepingDictionary {
  [index: string]: boolean;
}

export class TreeAdvanced extends Component<TreeAdvancedProps, State> {
  private key: string;
  constructor(props: TreeAdvancedProps, context: any) {
    super(props, context);
    this.key = Math.random().toString(36).slice(2);
    this.state = {
      collapsedBookkeeping: {},
      expandedChildren: props.preloadedChildren || new Map(),
    };
  }

  public render() {
    const treeClasses = [styles.tree];
    
    // Add tree lines classes if enabled
    if (this.props.showTreeLines) {
      treeClasses.push('treeWithLines');
      if (this.props.treeLineStyle === 'dotted') {
        treeClasses.push('dottedLines');
      }
    }
    
    return D.div(
      { 
        className: classnames(treeClasses),
        style: { position: 'relative' }
      }, 
      this.getTrees(this.props.nodeData),
      // Render dropdown portal outside of tree structure
      this.state.activeDropdownKey && this.state.dropdownNode && this.renderDropdownPortal()
    );
  }

  public componentWillMount() {
    this.initializeCollapsedState(this.props);
  }

  public componentWillReceiveProps(nextProps: TreeAdvancedProps) {
    // Re-initialize collapsed state when keysOpened changes
    if (nextProps.keysOpened !== this.props.keysOpened || 
        nextProps.collapsed !== this.props.collapsed ||
        nextProps.nodeData !== this.props.nodeData) {
      this.initializeCollapsedState(nextProps);
    }
    
    // Update expanded children if preloaded children are provided
    if (nextProps.preloadedChildren && nextProps.preloadedChildren !== this.props.preloadedChildren) {
      this.setState({
        expandedChildren: nextProps.preloadedChildren
      });
    }
  }

  public componentDidMount() {
    // Add click outside listener to close dropdown
    document.addEventListener('click', this.handleClickOutside);
  }

  public componentWillUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
  }

  private handleClickOutside = (event: any) => {
    // Close dropdown if clicking outside
    if (this.state.activeDropdownKey && 
        !event.target.closest('.related-nodes-dropdown-portal') && 
        !event.target.closest('.related-nodes-icon-btn')) {
      this.setState({ 
        activeDropdownKey: null, 
        hoveredNodeKey: null,
        dropdownPosition: undefined,
        dropdownNode: undefined
      });
    }
  };

  private initializeCollapsedState(props: TreeAdvancedProps) {
    const bookkeeping: BookeepingDictionary = {};
    
    // Process nodes recursively to set up initial collapsed state
    const processNode = (node: TreeNode) => {
      const nodeKey = this.getNodeKey(node);
      
      // Check if this node has lazy children that haven't been loaded
      const hasLazyChildren = props.onNodeExpand && this.nodeHasLazyChildren(node);
      const hasLoadedChildren = this.nodeHasChildren(node);
      const hasExpandedChildren = this.state.expandedChildren.has(nodeKey);
      
      // Determine initial collapsed state
      if (hasLazyChildren && !hasLoadedChildren && !hasExpandedChildren) {
        // Lazy-loadable nodes without loaded children should always start collapsed
        bookkeeping[nodeKey] = true;
      } else if (bookkeeping[nodeKey] === undefined) {
        // For other nodes, use the default collapsed prop
        bookkeeping[nodeKey] = props.collapsed !== false;
      }
      
      // Process static children recursively
      if (hasLoadedChildren) {
        node.children.forEach(child => processNode(child));
      }
      
      // Process expanded children if they exist
      if (hasExpandedChildren) {
        const expandedChildren = this.state.expandedChildren.get(nodeKey);
        if (expandedChildren) {
          expandedChildren.forEach(child => processNode(child));
        }
      }
    };
    
    // Process all root nodes
    props.nodeData.forEach(node => processNode(node));

    // Override with any keys that should be opened
    _.forEach(this.collectOpenKeys(props.nodeData), (k) => {
      bookkeeping[k] = false;
    });

    // Also mark any keys in keysOpened as not collapsed
    if (props.keysOpened) {
      _.forEach(props.keysOpened, (k) => {
        bookkeeping[k] = false;
      });
    }

    this.setState({ collapsedBookkeeping: bookkeeping });
  }

  private collectOpenKeys = (nodes: ReadonlyArray<TreeNode>): string[] => {
    return _.reduce(
      nodes,
      (collectedKeys, node) => {
        if (this.nodeHasChildren(node) && this.hasNestedOpenedKey(node)) {
          return collectedKeys.concat(this.collectOpenKeys(node.children).concat([this.getNodeKey(node)]));
        }
        return collectedKeys;
      },
      []
    );
  };

  private getNodeKey = (node: TreeNode): string => {
    return node[this.props.nodeKey];
  };

  private getAllKeys = (node: TreeNode): any[] => {
    if (!node['children']) {
      return [this.getNodeKey(node)];
    }
    return _.reduce(node['children'], (all, current) => all.concat(this.getAllKeys(current)), [
      node[this.props.nodeKey],
    ]);
  };

  private handleClick = (node: any, e: MouseEvent<HTMLSpanElement>) => {
    if (this.props.onNodeClick) {
      this.props.onNodeClick(node);
    }
    this.setState({
      activeNode: node,
    });
  };

  private handleCollapsibleClick = async (nodeKey: string, node: TreeNode) => {
    const isCurrentlyCollapsed = this.state.collapsedBookkeeping[nodeKey];
    const hasLazyChildren = this.props.onNodeExpand && this.nodeHasLazyChildren(node);
    const needsToLoadChildren = hasLazyChildren && !this.state.expandedChildren.has(nodeKey);
    
    // If expanding and we need to load children
    if (isCurrentlyCollapsed && needsToLoadChildren) {
      try {
        const children = await this.props.onNodeExpand(node);
        const newBookkeeping = { ...this.state.collapsedBookkeeping };
        
        // Initialize collapsed state for newly loaded children
        const childKeys = _.reduce(children, (all, current) => all.concat(this.getAllKeys(current)), []);
        _.forEach(childKeys, (k) => {
          newBookkeeping[k] = true;
        });
        
        // Expand the current node after loading children
        newBookkeeping[nodeKey] = false;

        this.setState(prevState => ({
          expandedChildren: new Map(Array.from(prevState.expandedChildren.entries()).concat([[nodeKey, children]])),
          collapsedBookkeeping: newBookkeeping,
        }));
      } catch (error) {
        console.error('Error expanding node:', error);
        return; // Don't toggle if expansion failed
      }
    } else {
      // Normal toggle for nodes that don't need to load children
      this.setState((state) => {
        const collapsedBookkeeping = { ...this.state.collapsedBookkeeping };
        collapsedBookkeeping[nodeKey] = !collapsedBookkeeping[nodeKey];
        return { collapsedBookkeeping: collapsedBookkeeping };
      });
    }
  };

  private getTrees = (data: ReadonlyArray<TreeNode>) => {
    return data.map((node, i: number) => {
      const nodeKey = _.isUndefined(this.props.nodeKey) ? i : node[this.props.nodeKey];
      return D.div({ key: `node_${nodeKey}_${i}` }, this.renderNode(node, i));
    });
  };

  private renderNode = (node: any, i: number) => {
    const nodeKey = _.isUndefined(this.props.nodeKey) ? i : node[this.props.nodeKey];
    
    // Check if this node is currently loading
    const isLoading = this.props.loadingNodes.has(nodeKey);
    
    // Determine if node has children (either static or lazy-loadable)
    const hasStaticChildren = this.nodeHasChildren(node);
    const hasLazyChildren = this.props.onNodeExpand && this.nodeHasLazyChildren(node);
    const hasChildren = hasStaticChildren || hasLazyChildren;
    
    // Get children to render
    let childrenToRender: ReadonlyArray<TreeNode> = [];
    if (hasStaticChildren) {
      childrenToRender = node.children;
    } else if (hasLazyChildren && this.state.expandedChildren.has(nodeKey)) {
      childrenToRender = this.state.expandedChildren.get(nodeKey) || [];
    }

    // Get the collapsed state from bookkeeping
    // For lazy nodes without loaded children, ensure they're collapsed
    let isCollapsed = this.state.collapsedBookkeeping[nodeKey];
    if (isCollapsed === undefined) {
      // If not in bookkeeping yet, default based on whether it has lazy children
      isCollapsed = hasLazyChildren && !this.state.expandedChildren.has(nodeKey);
    }
    
    // For nodes with lazy children, we should show them even if no children are loaded yet
    // This ensures the collapse arrow appears correctly
    const shouldShowChildren = !isCollapsed && childrenToRender.length > 0;
    const children = shouldShowChildren ? this.getTrees(childrenToRender) : null;

    // Create node label
    const nodeLabelTemplate = createElement(TemplateItem, {
      template: {
        source: this.props.tupleTemplate,
        options: { ...node, ...node.data },
      },
    });

    // Create loading indicator if needed
    const loadingIndicator = isLoading
      ? createElement(TemplateItem, {
          template: {
            source: this.props.loadingTemplate,
            options: { ...node, ...node.data },
          },
        })
      : null;

    // Wrap the node with hover detection and related nodes icon
    const nodeWithRelatedButton = D.div({
      className: 'tree-node-container',
      style: { 
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: '100%'
      },
      onMouseEnter: () => this.setState({ hoveredNodeKey: nodeKey }),
      onMouseLeave: () => {
        if (this.state.activeDropdownKey !== nodeKey) {
          this.setState({ hoveredNodeKey: null });
        }
      }
    },
      D.span(
        {
          key: this.key + nodeKey + i,
          className: this.getCssClassesForNode(children !== null, this.state.activeNode === node, node),
          onClick: this.handleClick.bind(null, node),
        },
        nodeLabelTemplate,
        loadingIndicator
      ),
      this.renderRelatedNodeIcon(node, nodeKey)
    );

    return hasChildren
      ? createElement(
          ReactTreeView,
          {
            key: `${nodeKey}_${isCollapsed}_${childrenToRender.length}`, // Include children count in key to force re-render
            nodeLabel: nodeWithRelatedButton,
            collapsed: isCollapsed,
            onClick: () => this.handleCollapsibleClick(nodeKey, node),
          },
          children
        )
      : nodeWithRelatedButton;
  };

  private renderRelatedNodeIcon = (node: TreeNode, nodeKey: string) => {
    const { relatedNodeCriteria, onFindRelatedNodes } = this.props;
    
    if (!relatedNodeCriteria || relatedNodeCriteria.length === 0) {
      return null;
    }
    
    const isHovered = this.state.hoveredNodeKey === nodeKey;
    const isDropdownOpen = this.state.activeDropdownKey === nodeKey;
    const shouldShow = isHovered || isDropdownOpen;
    
    if (!shouldShow) {
      return null;
    }
    
    return D.div({
      className: 'related-nodes-dropdown-container',
      style: {
        marginLeft: '8px',
        position: 'relative',
        display: 'inline-block'
      }
    },
      // The icon button
      D.button({
        className: 'related-nodes-icon-btn',
        onClick: (e) => {
          e.stopPropagation();
          this.toggleDropdown(nodeKey, node, e.currentTarget as HTMLElement);
        },
        style: {
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '3px',
          padding: '2px 6px',
          cursor: 'pointer',
          fontSize: '12px',
          color: '#666',
          transition: 'all 0.2s ease',
          opacity: shouldShow ? 1 : 0
        },
        title: 'Find related nodes'
      },
        D.i({ className: 'fa fa-link' })
      )
    );
  };

  private renderDropdownPortal = () => {
    const { relatedNodeCriteria } = this.props;
    const { dropdownPosition, dropdownNode } = this.state;
    
    if (!dropdownPosition || !dropdownNode) {
      return null;
    }
    
    return D.div({
      className: 'related-nodes-dropdown-portal',
      style: {
        position: 'fixed',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        zIndex: 999999, // Very high z-index to ensure it's always on top
        pointerEvents: 'auto'
      }
    },
      D.div({
        className: 'related-nodes-dropdown',
        style: {
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
          minWidth: '200px',
          maxHeight: '300px',
          overflowY: 'auto',
          animation: 'fadeIn 0.2s ease'
        },
        onClick: (e) => e.stopPropagation()
      },
        relatedNodeCriteria.map((criterion, index) =>
          D.div({
            key: index,
            className: 'dropdown-item',
            style: {
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              borderBottom: index < relatedNodeCriteria.length - 1 ? '1px solid #f0f0f0' : 'none',
              transition: 'background-color 0.2s ease'
            },
            onMouseEnter: (e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            },
            onClick: () => {
              this.handleRelatedNodeCriterionClick(dropdownNode, criterion);
              this.setState({ 
                activeDropdownKey: null, 
                hoveredNodeKey: null,
                dropdownPosition: undefined,
                dropdownNode: undefined
              });
            },
            title: criterion.description
          },
            criterion.icon && D.i({
              className: criterion.icon,
              style: { 
                marginRight: '8px',
                width: '16px',
                textAlign: 'center',
                color: '#666'
              }
            }),
            D.span({}, criterion.label)
          )
        )
      )
    );
  };

  private toggleDropdown = (nodeKey: string, node: TreeNode, buttonElement: HTMLElement) => {
    if (this.state.activeDropdownKey === nodeKey) {
      // Close dropdown
      this.setState({ 
        activeDropdownKey: null,
        dropdownPosition: undefined,
        dropdownNode: undefined
      });
    } else {
      // Open dropdown and calculate position
      const rect = buttonElement.getBoundingClientRect();
      const estimatedDropdownHeight = 200;
      const estimatedDropdownWidth = 200;
      
      // Calculate vertical position - always try to place below first
      let top = rect.bottom + 4;
      
      // If dropdown would go off bottom of screen, place it above
      if (top + estimatedDropdownHeight > window.innerHeight) {
        top = Math.max(4, rect.top - estimatedDropdownHeight - 4);
      }
      
      // Ensure dropdown doesn't go above viewport
      top = Math.max(4, top);
      // Ensure dropdown doesn't go below viewport
      top = Math.min(top, window.innerHeight - estimatedDropdownHeight - 4);
      
      // Calculate horizontal position - prefer right-aligned to button
      let left = rect.left;
      
      // If dropdown would go off right edge, align to right side of button
      if (left + estimatedDropdownWidth > window.innerWidth) {
        left = Math.max(4, rect.right - estimatedDropdownWidth);
      }
      
      // Final safety check - ensure it doesn't go off left edge
      left = Math.max(4, left);
      
      this.setState({
        activeDropdownKey: nodeKey,
        dropdownPosition: { top, left },
        dropdownNode: node
      });
    }
  };

  private handleRelatedNodeCriterionClick = (node: TreeNode, criterion: RelatedNodeCriteria) => {
    if (this.props.onFindRelatedNodes) {
      this.props.onFindRelatedNodes(node, criterion);
    }
  };

  private nodeHasChildren = (node: any): boolean => {
    return !_.isUndefined(node['children']) && !_.isEmpty(node['children']);
  };

  private nodeHasLazyChildren = (node: any): boolean => {
    // Check if node has the hasChildren binding indicating it can be expanded
    const hasChildrenValue = node.data[this.props.hasChildrenBinding];
    if (hasChildrenValue) {
      return hasChildrenValue.value === 'true' || hasChildrenValue.value === true;
    }
    return false;
  };

  private getCssClassesForNode = (hasChildren: boolean, isActive: boolean, node?: any): string => {
    const base = hasChildren ? styles.treeNode : styles.leafNode;
    let classes = [base];
    
    if (isActive) {
      classes.push(styles.activeNode);
    }
    
    // Check if this node is selected
    if (node && this.props.selectedNodeKey && node.key === this.props.selectedNodeKey) {
      classes.push('selectedTreeNode');
    }
    
    // Check if this node is highlighted (from search)
    if (node && this.props.highlightedNodes && this.props.highlightedNodes.size > 0) {
      const nodeId = node.data['node'] ? node.data['node'].value : node.key;
      const isHighlighted = this.props.highlightedNodes.has(nodeId) || this.props.highlightedNodes.has(node.key);
      if (isHighlighted) {
        // Use direct CSS class name instead of CSS modules for highlighting
        classes.push('highlightedTreeNode');
      }
    }
    
    return classnames(classes);
  };

  private isCollapsed = (nodeKey: any, node: any): boolean => {
    // First check if this key is in the keysOpened prop
    if (this.props.keysOpened && this.props.keysOpened.includes(nodeKey)) {
      return false; // Not collapsed if it's in keysOpened
    }
    // Otherwise use the bookkeeping state
    return this.state.collapsedBookkeeping[nodeKey];
  };

  private hasNestedOpenedKey = (node: any) => {
    if (_.includes(this.props.keysOpened, this.getNodeKey(node))) {
      return true;
    }
    if (_.isUndefined(node['children'])) {
      return false;
    }
    for (const n in node['children']) {
      if (this.hasNestedOpenedKey(node['children'][n])) {
        return true;
      }
    }
    return false;
  };
}

export default TreeAdvanced;
