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

import { Tree } from './Tree';
import { D3Tree, D3TreeProviderKind, D3TreeOptions } from './D3Tree';

export interface SemanticTreeConfig {
  /**
   * Determines visual style of the tree. Defaults to HTML rendering if left unspecified.
   * @default 'html'
   */
  provider?: SemanticTreeKind;

  /**
   * SPARQL Select query. The query should have at least two projection
   * variables -  `node` and `parent` i.e. the tree structure needs to be returned
   * as adjacency list of node-parent relations.
   * It is possible to override the expected binding variable names (c.f. options below)
   * Example:
   * ```
   * SELECT ?node ?parent WHERE {
   *  ?node a owl:Class .
   *  OPTIONAL{?node rdfs:subClassOf ?parent }
   * }
   * ```
   * Depending on your data, you may need to traverse the graph using **SPARQL
   * property path operations** (e.g. rdfs:subClassOf+ or rdsf:subClassOf*)
   * in order to collect all node-parent relations.
   *
   * Example:
   * ```
   * SELECT DISTINCT ?node ?parent WHERE {
   *   { { ?? rdfs:subClassOf* ?node }
   *   UNION
   *   { ?node rdfs:subClassOf* ?? } }
   *   OPTIONAL { ?node rdfs:subClassOf ?parent. FILTER(ISIRI(?parent)) }
   *   FILTER(ISIRI(?node))
   * }
   * ```
   */
  query: string;

  /**
   * <semantic-link uri='http://help.researchspace.org/resource/FrontendTemplating'>Template</semantic-link>
   * which is used to render every tree node. Template has access to all projection
   * variables for a single result tuple.
   * By default `<semantic-link>` component is used for node visualization.
   */
  tupleTemplate?: string;

  /**
   * <semantic-link uri='http://help.researchspace.org/resource/FrontendTemplating'>Template</semantic-link>
   * which is applied when the query returns no results.
   */
  noResultTemplate?: string;

  /**
   * List of node IRIs that should be used as root nodes for the tree visualization.
   * If omitted default roots are calculated with the assumption that
   * the node is root if it doesn't have any parent.
   */
  roots?: string[];

  /**
   * SPARQL Select projection variable name that is used to represent
   * **parent** value in parent-child relation
   * @default 'parent'
   */
  parentBindingName?: string;

  /**
   * SPARQL Select projection variable name that is used to represent
   * **child** value in parent-child relation.
   * @default 'node'
   */
  nodeBindingName?: string;

  /**
   * Specifies if tree should be collapsed by default
   *
   * @default false
   */
  collapsed?: boolean;

  /**
   * Array of node IRIs that should be opened by default.
   */
  keysOpened?: string[];

  /**
   * Options for D3-based tree to customize, for example, the width of the nodes
   * to fit longer labels.
   *
   * Example:
   * ```
   * d3-tree-options='{"nodeWidth":160, "nodeHeight":25}'
   * ```
   * **Make sure that numbers aren't quoted in `""`**.
   */
  d3TreeOptions?: D3TreeOptions;

  /**
   * ID for issuing component events.
   */
  id?: string;
}

export type SemanticTreeKind = 'html' | D3TreeProviderKind;

export type Props = SemanticTreeConfig & ReactProps<SemanticTree>;

export interface ProviderProps {
  tupleTemplate: string;
  onNodeClick?: (node: TreeNode) => void;
  nodeData: ReadonlyArray<TreeNode>;
  nodeKey?: string;
  collapsed: boolean;
  keysOpened: ReadonlyArray<string>;
}

export interface TreeNode {
  readonly key: string;
  readonly data: SparqlClient.Binding;
  readonly children: ReadonlyArray<TreeNode>;
}

interface State {
  data?: ReadonlyArray<TreeNode>;
  isLoading?: boolean;
  errorMessage?: Data.Maybe<string>;
}

export class SemanticTree extends Component<Props, State> {
  static readonly defaultProps: Partial<Props> = {
    provider: 'html',
    parentBindingName: 'parent',
    nodeBindingName: 'node',
    roots: [],
    keysOpened: [],
    tupleTemplate: '<semantic-link iri="{{node.value}}"></semantic-link>',
  };

  private readonly cancellation = new Cancellation();
  private querying = this.cancellation.derive();

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {
      isLoading: true,
      errorMessage: maybe.Nothing<string>(),
    };
  }

  public componentDidMount() {
    this.loadData(this.props);
  }

  public componentWillReceiveProps(props: Props) {
    if (props.query !== this.props.query) {
      this.loadData(props);
    }
  }

  public componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private loadData(props: Props) {
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

    const providerProps: ProviderProps = {
      tupleTemplate: this.handleDeprecatedLayout(),
      onNodeClick: this.onNodeClick,
      nodeData: data,
      nodeKey: 'key',
      collapsed: this.props.collapsed,
      keysOpened: this.props.keysOpened,
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

    return D.div({}, createElement(Tree, providerProps));
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
      console.warn('layout property in semantic-tree is deprecated, please use flat properties instead');
      return this.props['layout']['tupleTemplate'];
    }
    return this.props.tupleTemplate;
  }
}

interface MutableNode {
  key: string;
  data: SparqlClient.Binding;
  /**
   * Children are kept in insertion order from the query result.
   * The collection is represented by Set to be compatible with graph algorithms.
   */
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

export default SemanticTree;
