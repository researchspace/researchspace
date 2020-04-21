/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
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
import * as classnames from 'classnames';
import { Button, Popover, OverlayTrigger, Tooltip } from 'react-bootstrap';
import * as Immutable from 'immutable';

import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';

import { ResourceLink } from 'platform/api/navigation/components';
import { Draggable, Droppable } from 'platform/components/dnd';
import { Spinner } from 'platform/components/ui/spinner';
import { TemplateItem } from 'platform/components/ui/template';

import {
  KeyPath,
  TreeSelection,
  SelectionNode,
  Node,
  LazyTreeSelector,
  LazyTreeSelectorProps,
  SemanticTreeInput,
  SelectionMode,
  SingleFullSubtree,
  PartialSubtrees,
} from 'platform/components/semantic/lazy-tree';

import { AlignmentNode, AlignKind, findExcludedChildren } from './AlignmentNodeModel';
import { PanelState, AlignementRole } from './ToolController';

import * as styles from './MatchPanel.scss';

export interface MatchPanelProps {
  role: AlignementRole;
  state: PanelState;

  requestMoreItems: (path: KeyPath) => void;
  onExpandOrCollapse: (path: KeyPath, expanded: boolean) => void;
  onSelectionChanged?: (selection: TreeSelection<AlignmentNode>) => void;

  onExpandAndScrollToPath: (path: KeyPath, target: Node) => void;
  onCancelExpandingToScroll: () => void;

  draggedNodes?: ReadonlyArray<AlignmentNode>;
  onDragStart?: (nodes: AlignmentNode[]) => void;
  onDragEnd?: () => void;

  onAlign?: (sourceNodes: ReadonlyArray<AlignmentNode>, targetPath: KeyPath) => void;
  onUnalign?: (targetPath: KeyPath) => void;
  onFindAligned?: (targetKey: string) => void;

  className?: string;
  infoTemplate?: string;
}

export class MatchPanel extends Component<MatchPanelProps, {}> {
  private alignementTree: LazyTreeSelector;

  private searchedPaths = Immutable.Set<Immutable.List<string>>();

  render() {
    const { className, role, state } = this.props;
    const { patterns, forest, selection, expandingToScroll, highlightedPath } = state;

    let highlightedNodes: ReadonlyArray<AlignmentNode> = [];
    if (highlightedPath) {
      const highlightTarget = forest.fromKeyPath(highlightedPath);
      if (highlightTarget) {
        highlightedNodes = forest.getNodePath(highlightTarget);
      }
    }

    const props: LazyTreeSelectorProps<AlignmentNode> = {
      forest,
      isLeaf: this.isLeaf,
      childrenOf: this.childrenOf,
      renderItem: (node) => this.renderTreeNodeRow(node, highlightedNodes),
      requestMore: this.requestMore,
      hideCheckboxes: role === AlignementRole.Target,
      selectionMode:
        this.props.role === AlignementRole.Source
          ? PartialSubtrees<AlignmentNode>()
          : SingleFullSubtree<AlignmentNode>(),
      selection,
      onSelectionChanged: this.props.onSelectionChanged,
      isExpanded,
      onExpandedOrCollapsed: this.onExpandedOrCollapsed,
    };
    return (
      <div className={classnames(styles.component, className)}>
        <SemanticTreeInput
          {...patterns}
          multipleSelection={true}
          onSelectionClick={this.onSearchBadgeClick}
          onSelectionChanged={this.onSearchSelectionChanged}
        />
        <div className={styles.alignmentTreeContainer}>
          {expandingToScroll ? this.renderExpandToScrollMessage() : null}
          <LazyTreeSelector {...props} ref={this.onAlignmentTreeMount} className={styles.alignmentTree} />
        </div>
      </div>
    );
  }

  private renderTreeNodeRow(node: AlignmentNode, highlightedNodes: ReadonlyArray<AlignmentNode>) {
    const decoratorsClass = this.computeDecoratorsClass(node, highlightedNodes);
    return (
      <span className={styles.alignmentNodeRow}>
        {this.renderTreeNode(node, decoratorsClass)}
        {...this.renderIndicators(node)}
        {this.renderUnalignButton(node)}
        {this.renderFindAlignedButton(node)}
        {this.renderInfoButton(node)}
      </span>
    );
  }

  private renderTreeNode(node: AlignmentNode, decoratorsClass: string) {
    const {
      role,
      onDragEnd,
      state: { forest, selection },
    } = this.props;
    const title = (node.base || node.aligned).iri.value;
    const body = (
      <span className={decoratorsClass} title={title}>
        {renderAlignedTerm(node)}
      </span>
    );

    if (role === AlignementRole.Source) {
      const mode = PartialSubtrees<AlignmentNode>();
      const selected = selection.nodes.get(AlignmentNode.keyOf(node));
      if (selected && selected.size > 0) {
        const path = forest.getKeyPath(node);
        const itemSelection = selection.fromKeyPath(path);
        if (itemSelection && mode.isSelectedSubtree(itemSelection)) {
          return (
            <Draggable
              iri={node.base.iri.value}
              onDragStart={() => this.startDraggingSelection()}
              onDragEnd={onDragEnd}
            >
              <span className={styles.draggableWrapper}>
                <span className={styles.draggableHandle} />
                {body}
              </span>
            </Draggable>
          );
        }
      }
    } else if (role === AlignementRole.Target) {
      if (node.base) {
        const path = forest.getKeyPath(node);
        return <Droppable onDrop={(iri) => this.onDropInto(path, iri)}>{body}</Droppable>;
      }
    }

    return body;
  }

  private renderIndicators(node: AlignmentNode): Array<React.ReactElement<any>> {
    const indicators = [];

    if (node.decorateAlignParent) {
      const overlay = <Tooltip id="aligned-descendants">Term has aligned descendants.</Tooltip>;
      indicators.push(
        <OverlayTrigger key="aligned-descendants" placement="top" overlay={overlay}>
          <span className={styles.decorateAlignParent}>&nbsp;[*]</span>
        </OverlayTrigger>
      );
    }

    return indicators;
  }

  private computeDecoratorsClass(item: AlignmentNode, highlightedNodes: ReadonlyArray<AlignmentNode>): string {
    const classes: string[] = [styles.decoratedNodeBody];

    const pathIndex = highlightedNodes.indexOf(item);
    if (pathIndex >= 0) {
      const isTarget = pathIndex === highlightedNodes.length - 1;
      classes.push(isTarget ? styles.decorateHighlightLeaf : styles.decorateHighlightParent);
    }

    if (item.matchedTargetNode || item.decorateAlignChild) {
      classes.push(styles.decorateAlignLeaf);
    }

    return classes.join(' ');
  }

  private onAlignmentTreeMount = (alignementTree: LazyTreeSelector) => {
    this.alignementTree = alignementTree;
  };

  scrollToPath(path: KeyPath) {
    this.alignementTree.scrollToPath(path);
  }

  private renderExpandToScrollMessage() {
    const {
      onCancelExpandingToScroll,
      state: { expandTarget },
    } = this.props;
    return (
      <div className={styles.scrollNotification}>
        Scrolling to item <span className={styles.scrollToName}>{expandTarget.label.value}</span>
        <Spinner className={styles.scrollSpinner} spinnerDelay={0} messageDelay={Infinity} />
        <Button bsSize="xsmall" className={styles.cancelScrollingTo} onClick={onCancelExpandingToScroll}>
          Cancel
        </Button>
      </div>
    );
  }

  private onSearchBadgeClick = (selection: TreeSelection<Node>, target: SelectionNode<Node>) => {
    const path = selection.getKeyPath(target);
    this.props.onExpandAndScrollToPath(path, target);
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
      this.props.onExpandAndScrollToPath(path, selection.fromKeyPath(path));
    }
  };

  private isLeaf = (item: AlignmentNode) => {
    const { model } = this.props.state;
    return item.children ? item.children.length === 0 && !model.hasMoreChildren(item) : undefined;
  };

  private childrenOf = (node: AlignmentNode) => {
    const { model } = this.props.state;
    const { children, loading } = node;
    return { children, loading, hasMoreItems: model.hasMoreChildren(node) };
  };

  private requestMore = (node: AlignmentNode): void => {
    const {
      requestMoreItems,
      state: { forest },
    } = this.props;
    const path = forest.getKeyPath(node);
    requestMoreItems(path);
  };

  private onExpandedOrCollapsed = (item: AlignmentNode, expanded: boolean) => {
    const {
      onExpandOrCollapse,
      state: { forest },
    } = this.props;
    const path = forest.getKeyPath(item);
    onExpandOrCollapse(path, expanded);
  };

  private startDraggingSelection() {
    const { forest, selection } = this.props.state;
    const mode = PartialSubtrees<AlignmentNode>();
    const subtrees = mode.getSelectedSubtrees(selection);
    if (subtrees.length === 0) {
      return;
    }

    const draggedNodes = subtrees.map((selectionRoot) => {
      const selectionPath = selection.getKeyPath(selectionRoot);
      const node = forest.fromKeyPath(selectionPath);
      const excludeFromAlignment = findExcludedChildren(node, selectionRoot, selection);
      const unloadedNode =
        node.base.children && node.base.children.length > 0
          ? Node.set(node.base, { children: undefined, reachedLimit: false })
          : node.base;
      const draggedNode = AlignmentNode.set(AlignmentNode.empty, {
        base: unloadedNode,
        excludeFromAlignment,
      });
      return draggedNode;
    });
    this.props.onDragStart(draggedNodes);
  }

  private onDropInto(path: KeyPath, iri: Rdf.Iri) {
    const { state, draggedNodes, onCancelExpandingToScroll, onAlign } = this.props;
    if (state.expandingToScroll) {
      onCancelExpandingToScroll();
    }

    if (onAlign && draggedNodes && draggedNodes.some((n) => n.base.iri.equals(iri))) {
      onAlign(draggedNodes, path);
    }
  }

  private renderInfoButton(node: AlignmentNode) {
    const overlay = <NodeInfoPopover node={node} infoTemplate={this.props.infoTemplate} />;
    return (
      <OverlayTrigger
        key={AlignmentNode.keyOf(node)}
        trigger="click"
        rootClose={true}
        placement="right"
        overlay={overlay}
      >
        <Button bsSize="xsmall" className={styles.nodeInfoButton} onClick={this.onShowNodeInfoClick}>
          <span className="fa fa-info" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );
  }

  private onShowNodeInfoClick = (e: React.MouseEvent<Button>) => {
    // prevent expand/collapse on button click
    e.stopPropagation();
  };

  private renderUnalignButton(node: AlignmentNode) {
    const {
      onUnalign,
      state: { forest },
    } = this.props;
    if (!onUnalign) {
      return null;
    }
    if (!node.aligned || node.alignKind === AlignKind.MatchChild) {
      return null;
    }
    return (
      <Button
        bsSize="xsmall"
        className={styles.unalignButton}
        onClick={(e) => {
          e.stopPropagation();
          const path = forest.getKeyPath(node);
          onUnalign(path);
        }}
      >
        unalign
      </Button>
    );
  }

  private renderFindAlignedButton(node: AlignmentNode) {
    const { onFindAligned } = this.props;
    if (!(onFindAligned && node.matchedTargetNode)) {
      return null;
    }
    return (
      <Button
        bsSize="xsmall"
        className={styles.findAlignedButton}
        onClick={(e) => {
          e.stopPropagation();
          onFindAligned(Node.keyOf(node.matchedTargetNode));
        }}
      >
        <span className="fa fa-arrow-right" aria-hidden="true"></span>
      </Button>
    );
  }
}

function renderAlignedTerm(node: AlignmentNode) {
  if (node.base && node.aligned) {
    return (
      <span>
        <span className={styles.baseTerm}>{Node.getLabel(node.base)}</span>
        <span className={styles.alignedTerm}> = {Node.getLabel(node.aligned)}</span>
      </span>
    );
  } else if (node.base) {
    return <span className={styles.baseTerm}>{Node.getLabel(node.base)}</span>;
  } else if (node.aligned) {
    return (
      <span className={styles.alignedTerm}>
        {node.alignKind === AlignKind.NarrowerMatch ? '≥ ' : ''}
        {Node.getLabel(node.aligned)}
      </span>
    );
  } else {
    return null;
  }
}

function isExpanded(node: AlignmentNode) {
  return node.expanded;
}

interface NodeInfoPopoverProps {
  node: AlignmentNode;
  infoTemplate: string | undefined;
}

class NodeInfoPopover extends React.Component<NodeInfoPopoverProps, {}> {
  render() {
    const { node, infoTemplate = '<i>No info available</i>', ...delegatedProps } = this.props;
    const targetNode = node.base || node.aligned;
    const nodeLabel = Node.getLabel(targetNode);
    const infoHeader = <ResourceLink resource={targetNode.iri}>{nodeLabel}</ResourceLink>;
    const popoverProps = delegatedProps as any;
    return (
      <Popover
        id="alignment-tool-node-info"
        {...popoverProps}
        className={classnames(styles.nodeInfoPopup, popoverProps.className)}
        title={infoHeader as any}
      >
        <TemplateItem
          template={{
            source: infoTemplate,
            options: {
              iri: targetNode.iri.value,
              label: nodeLabel,
            },
          }}
        />
      </Popover>
    );
  }
}
