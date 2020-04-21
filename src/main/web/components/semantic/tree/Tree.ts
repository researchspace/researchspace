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

import { ProviderProps, TreeNode } from './SemanticTree';

import 'react-treeview/react-treeview.css';
import * as styles from './Tree.scss';

export interface TreeProps extends ProviderProps {}

interface State {
  collapsedBookkeeping?: BookeepingDictionary;
  activeNode?: any;
}

interface BookeepingDictionary {
  [index: string]: boolean;
}

export class Tree extends Component<TreeProps, State> {
  private key: string;
  constructor(props: TreeProps, context: any) {
    super(props, context);
    this.key = Math.random().toString(36).slice(2);
    this.state = {
      collapsedBookkeeping: {},
    };
  }

  public render() {
    // TODO add optional button to collapse/expand all nodes
    return D.div({ className: styles.tree }, this.getTrees(this.props.nodeData));
  }

  public componentWillMount() {
    const bookkeeping: BookeepingDictionary = {};
    // initalize the bookkeeping map with all keys of all nodes
    const keys = _.reduce(this.props.nodeData, (all, current) => all.concat(this.getAllKeys(current)), []);
    // set all markers to default as provided by the props
    _.forEach(keys, (k) => {
      bookkeeping[k] = this.props.collapsed;
    });

    // if in collapsed mode, check of keys that should be opened
    // and set all keys on the path to false (i.e. not collapsed)
    if (this.props.collapsed) {
      _.forEach(this.collectOpenKeys(this.props.nodeData), (k) => {
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

  private handleCollapsibleClick = (i) => {
    this.setState((state) => {
      const collapsedBookkeeping = this.state.collapsedBookkeeping;
      collapsedBookkeeping[i] = !collapsedBookkeeping[i];
      return { collapsedBookkeeping: collapsedBookkeeping };
    });
  };

  private getTrees = (data: ReadonlyArray<TreeNode>) => {
    return data.map((node, i: number) => this.renderNode(node, i));
  };

  private renderNode = (node: any, i: number) => {
    const nodeLabelTemplate = createElement(TemplateItem, {
      template: {
        source: this.props.tupleTemplate,
        options: { ...node, ...node.data },
      },
    });
    const hasChildren = this.nodeHasChildren(node);

    const nodeKey = _.isUndefined(this.props.nodeKey) ? i : node[this.props.nodeKey];
    const children = hasChildren && !this.isCollapsed(nodeKey, node) ? this.getTrees(node['children']) : null;

    const isCollapsed = this.isCollapsed(nodeKey, node);
    const renderedNode = D.span(
      {
        key: this.key + nodeKey + i,
        className: this.getCssClassesForNode(children, this.state.activeNode === node),
        onClick: this.handleClick.bind(null, node),
      },
      nodeLabelTemplate
    );

    return hasChildren
      ? createElement(
          ReactTreeView,
          {
            key: nodeKey + isCollapsed,
            nodeLabel: renderedNode,
            collapsed: isCollapsed,
            onClick: this.handleCollapsibleClick.bind(null, nodeKey),
          },
          children
        )
      : renderedNode;
  };

  private nodeHasChildren = (node: any): boolean => {
    return !_.isUndefined(node['children']) && !_.isEmpty(node['children']);
  };

  private getCssClassesForNode = (hasChildren: boolean, isActive: boolean): string => {
    const base = hasChildren ? styles.treeNode : styles.leafNode;
    return isActive ? classnames([base, styles.activeNode]) : base;
  };

  private isCollapsed = (i: any, node: any): boolean => {
    // check whether any of the deeply nested children nodes is listed
    // to be opened on intial rendering
    // if (this.props.collapsed && this.hasNestedOpenedKey(node)) {
    //   return false;
    // }
    return this.state.collapsedBookkeeping[i];
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

export default Tree;
