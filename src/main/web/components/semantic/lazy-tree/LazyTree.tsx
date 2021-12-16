/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as React from 'react';
import * as Immutable from 'immutable';

import { Cancellation } from 'platform/api/async';
import { SparqlUtil } from 'platform/api/sparql';
import { trigger, listen } from 'platform/api/events';

import { Component } from 'platform/api/components';
import { TemplateItem } from 'platform/components/ui/template';
import { Spinner } from 'platform/components/ui/spinner';
import { Draggable } from 'platform/components/dnd';

import {
  KeyPath,
  TreeSelection,
  SelectionNode,
  Node,
  TreeNode,
  LazyTreeSelector,
  LazyTreeSelectorProps,
  SemanticTreeInput,
  ComplexTreePatterns,
  LightwightTreePatterns,
  SingleFullSubtree,
  SparqlNodeModel,
  createDefaultTreeQueries,
  KeyedForest,
  loadPath,
  expandPath,
  queryMoreChildren
} from 'platform/components/semantic/lazy-tree';

import { ItemSelected, Focus } from './LazyTreeEvents';

import * as styles from './LazyTree.scss';
import { Rdf } from 'platform/api/rdf';

interface BaseLazyTreeProps {
  /**
   * ID for issuing component events.
   */
  id?: string;

  /**
   * How many items should be loaded for every scroll page.
   *
   * @default 50
   */
  pageSize?: number;

  /**
   * Template for node additional info.
   */
  infoTemplate?: string;

  /**
   * IRI of the element that should be focused by default.
   */
  focused?: string;
}

export type LazyTreeProps =
  { type: 'simple'; config: LightwightTreePatterns } & BaseLazyTreeProps |
  { type: 'query', config: ComplexTreePatterns } & BaseLazyTreeProps;

interface State {
  patterns?: ComplexTreePatterns;
  model?: SparqlNodeModel;
  forest?: KeyedForest<Node>;
  expandingToScroll?: boolean;
  expandTarget?: Node;
  highlightedPath?: KeyPath;
  loading: boolean;
}

/**
 *   <semantic-lazy-tree id='scheme-tree' info-template='{{> template}}' type='simple' config='{"scheme": "[[this]]"}'>
 *     <template id='template'>
 *      Some additional info or actions to show together with the node
 *    </template>
 *  </semantic-lazy-tree>
 */
export class LazyTree extends Component<LazyTreeProps, State> {
  private tree: LazyTreeSelector;
  private searchedPaths = Immutable.Set<Immutable.List<string>>();
  private expandingCancellation = Cancellation.cancelled;
  private treeSelectionRef: SemanticTreeInput;

  static defaultProps = {
    pageSize: 50
  }

  constructor(props: LazyTreeProps, context: any) {
    super(props, context);
    this.state = {
      loading: true,
    };
  }

  componentDidMount() {
    const patterns =
      this.props.type === 'query' ? this.props.config :
      createDefaultTreeQueries(this.props.config);
    const model = new SparqlNodeModel({
      rootsQuery: SparqlUtil.parseQuery(patterns.rootsQuery),
      childrenQuery: SparqlUtil.parseQuery(patterns.childrenQuery),
      parentsQuery: SparqlUtil.parseQuery(patterns.parentsQuery),
      sparqlOptions: () => ({ context: this.context.semanticContext }),
      limit: this.props.pageSize,
    });

    model.loadMoreChildren(Node.readyToLoadRoot).onValue(
      node => {
        this.setState({
          loading: false,
          expandingToScroll: false,
          forest: KeyedForest.create(Node.keyOf, node),
          patterns, model
        });
      }
    );

    if (this.props.id) {
      this.cancel.map(
        listen({
          target: this.props.id,
          eventType: Focus,
        })
      ).onValue(
        event => this.treeSelectionRef.setValue(Rdf.iri(event.data.iri))
      )
    }
  }

  render() {
    if (this.state.loading) {
      return <div>Loading</div>;
    } else {
      return this.renderTree();
    }
  }

  renderTree() {
    const { patterns, forest, expandingToScroll, highlightedPath } = this.state;
    const { focused } = this.props;

    let highlightedNodes: ReadonlyArray<Node> = [];
    if (highlightedPath) {
      const highlightTarget = forest.fromKeyPath(highlightedPath);
      if (highlightTarget) {
        highlightedNodes = forest.getNodePath(highlightTarget);
      }
    }
    const props: LazyTreeSelectorProps<Node> = {
      forest,
      isLeaf: this.isLeaf,
      childrenOf: this.childrenOf,
      renderItem: (node) => this.renderTreeNodeRow(node, highlightedNodes),
      requestMore: this.requestMore,
      hideCheckboxes: true,
      onExpandedOrCollapsed: this.onExpandedOrCollapsed,
      isExpanded: (node) => node.expanded,
      selectionMode: SingleFullSubtree<Node>(),
      onItemClick: this.onItemClick,
    };

    return (
      <div className={styles.component}>
        <SemanticTreeInput
          {...patterns}
          ref={this.onSelectionReady}
          multipleSelection={true}
          onSelectionClick={this.onSearchBadgeClick}
          onSelectionChanged={this.onSearchSelectionChanged}
          initialSelection={focused && focused.length > 0 ? [Rdf.iri(focused)] : []}
        />
        <div className={styles.alignmentTreeContainer}>
          {expandingToScroll ? this.renderExpandToScrollMessage() : null}
          <LazyTreeSelector {...props} ref={this.onTreeMount} className={styles.alignmentTree} />
        </div>
      </div>
    );
  }

  private renderTreeNodeRow(node: Node, highlightedNodes: ReadonlyArray<Node>) {
    const decoratorsClass = this.computeDecoratorsClass(node, highlightedNodes);
    return (
      <span className={styles.alignmentNodeRow}>
        <Draggable iri={node.iri.value}>
          {this.renderTreeNode(node, decoratorsClass)}
        </Draggable>
        {this.renderNodeInfoTemplate(node)}
      </span>
    );
  }

  private renderTreeNode(node: Node, decoratorsClass: string) {
    const title = node.iri.value;
    return (
      <span className={decoratorsClass} title={title}>
        <span>{Node.getLabel(node)}</span>
      </span>
    );
  }

  private renderNodeInfoTemplate(node: Node) {
    if (this.props.infoTemplate) {
      return <TemplateItem template={{source: this.props.infoTemplate, options: {iri: node.iri.value, label: node.label.value}}} />;
    } else {
      return null;
    }
  }

  private renderExpandToScrollMessage() {
    const { expandTarget } = this.state;
    return (
      <div className={styles.scrollNotification}>
        Scrolling to item <span className={styles.scrollToName}>{expandTarget.label.value}</span>
        <Spinner className={styles.scrollSpinner} spinnerDelay={0} messageDelay={Infinity} />
      </div>
    );
  }

  private onSelectionReady = (selectionInput?: SemanticTreeInput) => {
    if (selectionInput) {
      this.treeSelectionRef = selectionInput;
      if (this.props.focused && this.props.focused.length > 0) {
        selectionInput.setValue(Rdf.iri(this.props.focused));
      }
    }
  }

  private computeDecoratorsClass(item: Node, highlightedNodes: ReadonlyArray<Node>): string {
    const classes: string[] = [styles.decoratedNodeBody];

    const pathIndex = highlightedNodes.indexOf(item);
    if (pathIndex >= 0) {
      const isTarget = pathIndex === highlightedNodes.length - 1;
      classes.push(isTarget ? styles.decorateHighlightLeaf : styles.decorateHighlightParent);
    }
    return classes.join(' ');
  }

  private onTreeMount = (tree: LazyTreeSelector) => {
    this.tree = tree;
  };

  private onSearchBadgeClick = (selection: TreeSelection<Node>, target: SelectionNode<Node>) => {
    const path = selection.getKeyPath(target);
    this.onExpandAndScrollToPath(path, target);
  };

  /** Auto-scroll to newly selected single path in search input. */
  private onSearchSelectionChanged = (selection: TreeSelection<Node>) => {
    const previousPaths = this.searchedPaths;
    this.searchedPaths = TreeSelection.leafs(selection)
      .map((node) => Immutable.List(selection.getKeyPath(node) as string[]))
      .toSet();

    const newlySelectedPaths = this.searchedPaths.filter((path) => !previousPaths.has(path));
    if (newlySelectedPaths.size === 1) {
      const path = newlySelectedPaths.first().toArray() as KeyPath;
      this.onExpandAndScrollToPath(path, selection.fromKeyPath(path));
    }
  };

  private onItemClick = (item: Node) => {
    trigger({ eventType: ItemSelected, source: this.props.id, data: { iri: item.iri.value}});
  }

  private isLeaf = (item: Node) => {
    const { model } = this.state;
    return item.children ? item.children.length === 0 && !model.hasMoreChildren(item) : undefined;
  };

  private childrenOf = (node: Node) => {
    const { model } = this.state;
    const { children, loading } = node;
    return { children, loading, hasMoreItems: model.hasMoreChildren(node) };
  };

  private requestMore = (node: Node): void => {
    const path = this.state.forest.getKeyPath(node);
    const { model, forest } = this.state;
    const [loadingForest, forestChange] = queryMoreChildren((parent) => model.loadMoreChildren(parent), forest, path);
    this.cancel.map(forestChange).observe({
      value: (changeForest) => {
        this.setState({
          forest: changeForest(forest)
        });
      },
    });
    this.setState({
      forest: loadingForest
    });
  };

  private onExpandedOrCollapsed = (item: Node, expanded: boolean) => {
    const path = this.state.forest.getKeyPath(item);
    const forest = this.state.forest.updateNode(path, (node) => TreeNode.set(node, { expanded }));
    this.setState({ forest });
  };

  onExpandAndScrollToPath(path: KeyPath, target: Node) {
    const onExpandingStateChanged = () => {
      const { expandingToScroll, highlightedPath } = this.state;
      if (!expandingToScroll && highlightedPath) {
        this.scrollToPath(highlightedPath);
      }
    };


    this.setState({
      expandingToScroll: true,
      expandTarget: target,
    }, () => {
      this.expandingCancellation = this.cancel.deriveAndCancel(this.expandingCancellation);
      this.expandingCancellation
          .map(
            loadPath(
              (parent) => this.state.model.hasMoreChildren(parent),
              (parent) => this.state.model.loadMoreChildren(parent),
              this.state.forest,
              path
            ).map((forest) => expandPath(forest, path))
          )
          .observe({
            value: (forest) => {
              this.setState({
                forest,
                expandingToScroll: false,
                highlightedPath: path,
              }, onExpandingStateChanged);
            },
            error: (error) => {
              console.error(error);
              this.setState({
                expandingToScroll: false,
                highlightedPath: undefined,
              });
            },
          });
    });
  }

  cancelExpandingToScroll() {
    if (this.state.expandingToScroll) {
      this.expandingCancellation.cancelAll();
      this.setState({
        expandingToScroll: false,
        expandTarget: undefined,
        highlightedPath: undefined,
      });
    }
  }

  scrollToPath(path: KeyPath) {
    this.tree.scrollToPath(path);
  }
}

export default LazyTree;
