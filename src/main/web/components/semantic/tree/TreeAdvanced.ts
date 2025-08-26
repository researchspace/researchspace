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

export interface TreeAdvancedProps extends ProviderPropsAdvanced {}

interface State {
  collapsedBookkeeping?: BookeepingDictionary;
  activeNode?: any;
  expandedChildren: Map<string, ReadonlyArray<TreeNode>>; // Store dynamically loaded children
  hoveredNodeKey?: string;
  activeDropdownKey?: string; // Track which dropdown is open
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
    return D.div({ className: styles.tree }, this.getTrees(this.props.nodeData));
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
    if (this.state.activeDropdownKey && !event.target.closest('.related-nodes-dropdown-container')) {
      this.setState({ activeDropdownKey: null, hoveredNodeKey: null });
    }
  };

  private initializeCollapsedState(props: TreeAdvancedProps) {
    const bookkeeping: BookeepingDictionary = {};
    // initalize the bookkeeping map with all keys of all nodes
    const keys = _.reduce(props.nodeData, (all, current) => all.concat(this.getAllKeys(current)), []);
    
    // Set initial collapsed state based on the collapsed prop
    _.forEach(keys, (k) => {
      bookkeeping[k] = props.collapsed;
    });

    // if there are any keys that should be opened, set them to not collapsed
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
    
    // If expanding and we have an expand function and no children loaded yet
    if (isCurrentlyCollapsed && this.props.onNodeExpand && !this.state.expandedChildren.has(nodeKey)) {
      try {
        const children = await this.props.onNodeExpand(node);
        const newBookkeeping = { ...this.state.collapsedBookkeeping };
        const childKeys = _.reduce(children, (all, current) => all.concat(this.getAllKeys(current)), []);
        _.forEach(childKeys, (k) => {
          newBookkeeping[k] = true;
        });

        this.setState(prevState => ({
          expandedChildren: new Map(Array.from(prevState.expandedChildren.entries()).concat([[nodeKey, children]])),
          collapsedBookkeeping: newBookkeeping,
        }));
      } catch (error) {
        console.error('Error expanding node:', error);
        return; // Don't toggle if expansion failed
      }
    }

    // Toggle collapsed state
    this.setState((state) => {
      const collapsedBookkeeping = { ...this.state.collapsedBookkeeping };
      collapsedBookkeeping[nodeKey] = !collapsedBookkeeping[nodeKey];
      return { collapsedBookkeeping: collapsedBookkeeping };
    });
  };

  private getTrees = (data: ReadonlyArray<TreeNode>) => {
    return data.map((node, i: number) => this.renderNode(node, i));
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

    const isCollapsed = this.isCollapsed(nodeKey, node);
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
            key: nodeKey + isCollapsed,
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
          this.toggleDropdown(nodeKey);
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
      ),
      // The dropdown menu
      isDropdownOpen && this.renderRelatedNodesDropdown(node, nodeKey)
    );
  };

  private renderRelatedNodesDropdown = (node: TreeNode, nodeKey: string) => {
    const { relatedNodeCriteria } = this.props;
    
    return D.div({
      className: 'related-nodes-dropdown',
      style: {
        position: 'fixed',  // Changed from 'absolute' to 'fixed' to escape container overflow
        marginTop: '4px',
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        minWidth: '200px',
        zIndex: 10000,  // Increased z-index to ensure it's on top
        maxHeight: '300px',  // Add max height
        overflowY: 'auto'  // Add scroll if needed
      },
      ref: (el) => {
        // Position the dropdown relative to the button when it's rendered
        if (el) {
          const button = el.parentElement?.querySelector('.related-nodes-icon-btn');
          if (button) {
            const rect = button.getBoundingClientRect();
            el.style.top = `${rect.bottom + 4}px`;
            el.style.left = `${rect.left}px`;
            
            // Adjust position if dropdown would go off screen
            const dropdownRect = el.getBoundingClientRect();
            
            // Check if dropdown goes off the right edge of the screen
            if (dropdownRect.right > window.innerWidth) {
              el.style.left = `${rect.right - dropdownRect.width}px`;
            }
            
            // Check if dropdown goes off the bottom of the screen
            if (dropdownRect.bottom > window.innerHeight) {
              // Position above the button instead
              el.style.top = `${rect.top - dropdownRect.height - 4}px`;
            }
          }
        }
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
            this.handleRelatedNodeCriterionClick(node, criterion);
            this.setState({ activeDropdownKey: null, hoveredNodeKey: null });
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
    );
  };

  private toggleDropdown = (nodeKey: string) => {
    this.setState(prevState => ({
      activeDropdownKey: prevState.activeDropdownKey === nodeKey ? null : nodeKey
    }));
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
    
    // Check if this node is highlighted
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
