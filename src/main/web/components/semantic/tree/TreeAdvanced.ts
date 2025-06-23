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

import { ProviderPropsAdvanced, TreeNode } from './TreeTypes';

import 'react-treeview/react-treeview.css';
import * as styles from './Tree.scss';

export interface TreeAdvancedProps extends ProviderPropsAdvanced {}

interface State {
  collapsedBookkeeping?: BookeepingDictionary;
  activeNode?: any;
  expandedChildren: Map<string, ReadonlyArray<TreeNode>>; // Store dynamically loaded children
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
      expandedChildren: new Map(),
    };
  }

  public render() {
    return D.div({ className: styles.tree }, this.getTrees(this.props.nodeData));
  }

  public componentWillMount() {
    const bookkeeping: BookeepingDictionary = {};
    // initalize the bookkeeping map with all keys of all nodes
    const keys = _.reduce(this.props.nodeData, (all, current) => all.concat(this.getAllKeys(current)), []);
    // set all markers to collapsed by default
    _.forEach(keys, (k) => {
      bookkeeping[k] = true;
    });

    // if there are any keys that should be opened, set them to not collapsed
    _.forEach(this.collectOpenKeys(this.props.nodeData), (k) => {
      bookkeeping[k] = false;
    });

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

    const renderedNode = D.span(
      {
        key: this.key + nodeKey + i,
        className: this.getCssClassesForNode(children !== null, this.state.activeNode === node),
        onClick: this.handleClick.bind(null, node),
      },
      nodeLabelTemplate,
      loadingIndicator
    );

    return hasChildren
      ? createElement(
          ReactTreeView,
          {
            key: nodeKey + isCollapsed,
            nodeLabel: renderedNode,
            collapsed: isCollapsed,
            onClick: () => this.handleCollapsibleClick(nodeKey, node),
          },
          children
        )
      : renderedNode;
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

  private getCssClassesForNode = (hasChildren: boolean, isActive: boolean): string => {
    const base = hasChildren ? styles.treeNode : styles.leafNode;
    return isActive ? classnames([base, styles.activeNode]) : base;
  };

  private isCollapsed = (nodeKey: any, node: any): boolean => {
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
