/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

import * as _ from 'lodash';
import { DOM as D, Props as ReactProps, createElement } from 'react';
import * as maybe from 'data.maybe';

import { Rdf }  from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { Component } from 'platform/api/components';
import { ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';
import { TemplateItem } from 'platform/components/ui/template';

import { Tree } from './Tree';

interface TreeNode {
  key: string;
  data?: {};
  children?: string[];
}

export interface SemanticTreeConfig {
  /**
   * SPARQL Select query. By default query should have at least two projection variables - `parent` and `node`. So basically tree structure is represented as list of parent-child relations. It is possible to override expected binding variables, see options bellow
   */
  query: string;

  /**
   * <semantic-link uri='http://help.metaphacts.com/resource/FrontendTemplating'>Template</semantic-link> which is used to render every tree node. Template has access to all projection variables for a single result tuple.
   * By default `<semantic-link>` component is used for node visualization.
   * **The template MUST have a single HTML root element.**
   */
  tupleTemplate?: string;

  /**
   * <semantic-link uri='http://help.metaphacts.com/resource/FrontendTemplating'>Template</semantic-link> which is applied when query returns no results.
   * **The template MUST have a single HTML root element.**
   */
  noResultTemplate?: string;

  /**
   * List of node IRIs that should be used as a starting points for tree visualization.
   * If omitted default roots are calculated with the assumption that the node is root if it doesn't have any parent
   */
  roots?: string[];

  /**
   * SPARQL Select projection variable name that is used to represent **parent** value in parent-child relation
   * @default parent
   */
  parentBindingName?: string;

  /**
   * SPARQL Select projection variable name that is used to represent **child** value in parent-child relation.
   */
  nodeBindingName?: string;

  /**
   * Specifies if tree should be collapsed by default
   *
   * @default false
   */
  collapsed?: boolean;

  /**
   * List of node IRIs that should be opened by default
   */
  keysOpened?: string[];
}

export type Props = SemanticTreeConfig & ReactProps<SemanticTree>;

interface State {
  data?: any[];
  isLoading?: boolean;
  errorMessage?: Data.Maybe<string>;
}

interface TreeNodeMap {
     [index: string]: TreeNode;
}

export class SemanticTree extends Component<Props, State> {
  private roots: string[];

  constructor(props: Props, context) {
    super(props, context);
    this.state = {
      isLoading: true,
      errorMessage: maybe.Nothing<string>(),
    };
    this.roots = [];
  }

  public static defaultProps = {
    parentBindingName: 'parent',
    nodeBindingName: 'node',
    roots: [],
    keysOpened: [],
    tupleTemplate: '<semantic-link uri="{{data.node.value}}"></semantic-link>',
  };

  public componentDidMount() {
    SparqlClient.select(this.props.query, this.context.semanticContext).onValue(
      this.processSparqlResult
    );
  }

  public render() {
    if (this.state.errorMessage.isJust) {
      return createElement(ErrorNotification, {errorMessage: this.state.errorMessage.get()});
    }
    return this.state.isLoading ? createElement(Spinner) : this.getTreeComponent(this.state.data);
  }

  private getTreeComponent = (data: any[]) => {
    return _.isEmpty(data) ?
      createElement(TemplateItem, {template: {source: this.props.noResultTemplate}}) : D.div({},
          createElement(Tree, {
            tupleTemplate: this.handleDeprecatedLayout(),
            onNodeClick: this.onNodeClick,
            nodeData: data,
            nodeKey: 'key',
            collapsed: this.props.collapsed,
            keysOpened: this.props.keysOpened,
        })
    );
  }

  private processSparqlResult = (res: SparqlClient.SparqlSelectResult): void => {
    if (SparqlUtil.isSelectResultEmpty(res)) {
        this.setState({data: [], isLoading: false});
        return;
    }

    const map = this.transformBindingsToMap(res.results.bindings);
    // if roots are specified we take those
    const rootNodes = _.isEmpty(this.props.roots) ? this.roots : this.props.roots;
    const data = _.reduce(rootNodes, (total, currentRoot) => {
      if (!map[currentRoot]) {
        this.setState({
          errorMessage: maybe.Just(`Root node ${currentRoot} does not exist.`),
        });
        return total;
      }
      return total.concat(this.getChildren(map, currentRoot, map[currentRoot].data));
    }, []);
    this.setState({data: data, isLoading: false});
  }

  private onNodeClick = (node: any) => {
    // empty default onNodeClick
  }

  private transformBindingsToMap = (bindings: SparqlClient.Bindings) => {
    const { nodeBindingName, parentBindingName } = this.props;
      return _.reduce<SparqlClient.Dictionary<Rdf.Node>, TreeNodeMap>(bindings, (total, b) => {
          // init map entries
          if (!total[b[nodeBindingName].value]) {
            total[b[nodeBindingName].value] = {
              key: b[nodeBindingName].value,
              data: b, children: [],
            };
          } else if (_.isEmpty(total[b[nodeBindingName].value].data)) {
            total[b[nodeBindingName].value].data = b;
          }

          // init placeholder for parent, if exists
          if (b[parentBindingName] && !total[b[parentBindingName].value]) {
              total[b[parentBindingName].value] = {
                key: b[parentBindingName].value, data: {},
                children: [b[nodeBindingName].value],
              };
          } else if (b[parentBindingName]) {
            total[b[parentBindingName].value].children.push(b[nodeBindingName].value);
          }else {
            // remember root nodes i.e. roots are those which do not have a parent
            if (!_.includes(this.roots, b[nodeBindingName].value)) {
              this.roots.push(b[nodeBindingName].value);
            }
          }

          return total;
      }, {});
  }

  private getChildren = (m: TreeNodeMap, nodeKey: string, nodeData: {}): TreeNode => {
       if (m[nodeKey].children.length <= 0) {
         return { key: nodeKey, data: nodeData};
       }

      const node = m[nodeKey];

      const children = _.reduce( node.children, (total, child) => {
          total.push(this.getChildren(m, child, m[child].data));
          return total;
      }, []);

      return {
          key: nodeKey,
          data: nodeData,
          children: children,
      };
  }

  private handleDeprecatedLayout(): string {
    if (_.has(this.props, 'layout')) {
      console.warn(
        'layout property in semantic-tree is deprecated, please use flat properties instead'
      );
      return this.props['layout']['tupleTemplate'];
    }
    return this.props.tupleTemplate;
  }
}

export default SemanticTree;
