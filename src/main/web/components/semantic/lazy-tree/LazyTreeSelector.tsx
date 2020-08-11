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
import * as React from 'react';
import { Component, ComponentClass, CSSProperties, ReactElement, SyntheticEvent } from 'react';
import * as Immutable from 'immutable';
import * as classnames from 'classnames';
import { AutoSizer, ColumnSizer, ColumnSizerProps, List, ListProps, ListRowProps } from 'react-virtualized';

import { Spinner } from '../../ui/spinner/Spinner';

import { KeyedForest, Traversable, KeyPath } from './KeyedForest';
import { TreeSelection, SelectionNode } from './TreeSelection';
import { SelectionMode, CheckState } from './SelectionMode';

import * as styles from './LazyTreeSelector.scss';

export interface LazyTreeSelectorProps<T extends Traversable<T> = Traversable<any>> {
  className?: string;
  style?: CSSProperties;

  forest: KeyedForest<T>;
  isLeaf: (item: T) => boolean | undefined;
  childrenOf: (
    item: T
  ) => {
    loading?: boolean;
    hasMoreItems?: boolean;
  };
  requestMore: (item: T) => void;
  renderItem: (item: T) => React.ReactElement<any>;
  renderEmpty?: () => React.ReactElement<any>;
  itemHeight?: number;

  hideCheckboxes?: boolean;
  selectionMode: SelectionMode<T>;
  selection?: TreeSelection<T>;
  onSelectionChanged?: (selectedItems: TreeSelection<T>) => void;

  expandedByDefault?: boolean;
  isExpanded: (item: T) => boolean | undefined;
  onExpandedOrCollapsed: (item: T, expanded: boolean) => void;
  onItemClick?: (item: T) => void;
}

type TreeNode = Traversable<any>;

interface State {
  readonly entries?: ReadonlyArray<NodeEntry>;
  readonly indices?: Immutable.Map<TreeNode, number>;
}

enum EntryType {
  Node = 1,
  Spinner,
  Anchor,
}

type NodeEntry = ItemEntry | SpinnerEntry | AnchorEntry;

interface ItemEntry {
  type: EntryType.Node;
  depth: number;
  item: TreeNode;
  itemSelection: SelectionNode<TreeNode> | undefined;
  defaultSelection: SelectionNode<TreeNode> | undefined;
  expanded: boolean;
}
interface SpinnerEntry {
  type: EntryType.Spinner;
  depth: number;
}
interface AnchorEntry {
  type: EntryType.Anchor;
  depth: number;
  item: TreeNode;
}

const OVERSCAN_ITEM_COUNT = 10;
/**
 * Minimal required distance from rendered overscan items and an anchor to
 * request additional items at the anchor location.
 */
const OVERSCAN_LOAD_ANCHOR = 20;
const MIN_ITEM_HEIGHT = 30;
const PADDING_PER_DEPTH_LEVEL = 20;

// workaround for older React typings
const VirtualizedList = (List as any) as ComponentClass<ListProps>;

export class LazyTreeSelector extends Component<LazyTreeSelectorProps, State> {
  static readonly defaultProps: Partial<LazyTreeSelectorProps> = {
    itemHeight: MIN_ITEM_HEIGHT,
  };

  private list: List;
  private overscanStartIndex: number | undefined;
  private overscanStopIndex: number | undefined;

  constructor(props: LazyTreeSelectorProps, context: any) {
    super(props, context);
    const { entries, indices } = computeEntries(this.props);
    this.state = { entries, indices };
  }

  componentWillReceiveProps(nextProps: LazyTreeSelectorProps) {
    const { entries, indices } = computeEntries(nextProps);
    this.setState({ entries, indices }, () => {
      this.list.forceUpdateGrid();
      this.requestItemsWithVisibleAnchors();
    });
  }

  scrollToPath(path: KeyPath) {
    const item = this.props.forest.fromKeyPath(path);
    if (item && this.list) {
      const rowIndex = this.state.indices.get(item);
      if (typeof rowIndex === 'number') {
        this.list.scrollToRow(rowIndex);
      }
    }
  }

  render() {
    const { className, style, itemHeight, renderEmpty } = this.props;
    const { entries } = this.state;

    return (
      <div className={classnames(styles.component, className)} style={style}>
        <AutoSizer>
          {({ width, height }) => (
            <VirtualizedList
              ref={(list) => (this.list = list as any)}
              className={styles.virtualizedList}
              width={width}
              height={height}
              rowCount={entries.length}
              overscanRowCount={OVERSCAN_ITEM_COUNT}
              rowHeight={Math.max(itemHeight, MIN_ITEM_HEIGHT)}
              noRowsRenderer={renderEmpty}
              rowRenderer={this.renderRow}
              onRowsRendered={this.onRowsRendered}
              // support horizontal scrolling in outer List component by setting overflow
              // style for it and removing width restrictions from inner container
              style={{ overflowX: 'auto', overflowY: 'scroll' }}
              containerStyle={{
                width: undefined,
                maxWidth: undefined,
                minHeight: height,
                overflowX: 'unset',
                overflowY: 'unset',
              }}
            />
          )}
        </AutoSizer>
      </div>
    );
  }

  private renderRow = (rowProps: ListRowProps) => {
    const { index, isScrolling, key, style } = rowProps;
    const entry = this.state.entries[index];
    const renderedEntry = this.renderEntry(entry, index);
    const rowStyle: CSSProperties = {
      ...style,
      paddingLeft: entry.depth * PADDING_PER_DEPTH_LEVEL,
    };
    return (
      <div key={key} style={rowStyle}>
        {renderedEntry}
      </div>
    );
  };

  private renderEntry(entry: NodeEntry, index: number): ReactElement<any> {
    switch (entry.type) {
      case EntryType.Node:
        return this.renderItem(entry);
      case EntryType.Spinner:
      case EntryType.Anchor:
        return <Spinner spinnerDelay={0} className={styles.spinner} />;
    }
  }

  private onRowsRendered = (info: {
    startIndex: number;
    stopIndex: number;
    overscanStartIndex: number;
    overscanStopIndex: number;
  }) => {
    this.overscanStartIndex = info.overscanStartIndex;
    this.overscanStopIndex = info.overscanStopIndex;
    this.requestItemsWithVisibleAnchors();
  };

  private requestItemsWithVisibleAnchors() {
    const hasRenderedRows = typeof this.overscanStartIndex === 'number' && typeof this.overscanStopIndex === 'number';
    if (!hasRenderedRows) {
      return;
    }
    const { entries } = this.state;
    const start = Math.max(0, this.overscanStartIndex - OVERSCAN_ITEM_COUNT);
    const end = Math.min(entries.length, this.overscanStopIndex + OVERSCAN_ITEM_COUNT);
    for (let i = start; i < end; i++) {
      const entry = entries[i];
      if (entry.type === EntryType.Anchor) {
        this.props.requestMore(entry.item);
      }
    }
  }

  private renderItem(entry: ItemEntry): ReactElement<any> {
    const { item, itemSelection, defaultSelection, expanded } = entry;

    const isLeaf = this.props.isLeaf(item) === true;
    const checkState = this.props.selectionMode.renderSelected(
      this.props.forest,
      item,
      this.props.selection,
      itemSelection,
      defaultSelection
    );

    return (
      <div
        className={classnames({
          [styles.item]: true,
          [styles.itemExpanded]: expanded,
          [styles.itemCollapsed]: !expanded,
        })}
      >
        <span
          className={styles.expandToggle}
          style={{ visibility: isLeaf ? 'collapse' : undefined }}
          onClick={
            () => {
              this.toggleExpanded(item, expanded);
              if (this.props.onItemClick) {
                this.props.onItemClick(item);
              }
            }
          }
        ></span>
        {this.props.hideCheckboxes ? null : (
          <input
            type="checkbox"
            checked={checkState !== CheckState.None}
            disabled={checkState === CheckState.FullGreyedOut}
            onChange={(e) => this.onItemCheckedChange(item, itemSelection, defaultSelection, e)}
            ref={(input) => {
              if (input) {
                input.indeterminate = checkState === CheckState.Partial;
              }
            }}
          />
        )}
        <div className={styles.itemContent} onClick={() => this.toggleExpanded(item, expanded)}>
          {this.props.renderItem(item)}
        </div>
      </div>
    );
  }

  private toggleExpanded(item: TreeNode, previouslyExpanded: boolean) {
    const { onExpandedOrCollapsed, childrenOf, requestMore } = this.props;
    onExpandedOrCollapsed(item, !previouslyExpanded);
    // request children when expand an item
    if (!previouslyExpanded) {
      const { loading, hasMoreItems } = childrenOf(item);
      if (!loading && hasMoreItems) {
        requestMore(item);
      }
    }
  }

  private onItemCheckedChange(
    item: TreeNode,
    itemSelection: SelectionNode<TreeNode> | undefined,
    defaultSelection: SelectionNode<TreeNode> | undefined,
    event: SyntheticEvent<HTMLInputElement>
  ) {
    if (!this.props.onSelectionChanged) {
      return;
    }

    const { forest, selectionMode } = this.props;
    const previous = this.props.selection || TreeSelection.empty(forest);
    const next = selectionMode.change(forest, item, previous, itemSelection, defaultSelection);
    if (!next) {
      return;
    }

    this.props.onSelectionChanged(next);
  }
}

function computeEntries(
  props: LazyTreeSelectorProps
): {
  entries: NodeEntry[];
  indices: Immutable.Map<TreeNode, number>;
} {
  const entries: NodeEntry[] = [];
  describeChildren(props, props.forest.root, props.selection ? props.selection.root : undefined, undefined, 0, entries);

  const indices = Immutable.Map<TreeNode, number>().withMutations((mapping) => {
    entries.forEach((entry, index) => {
      if (entry.type === EntryType.Node) {
        mapping.set(entry.item, index);
      }
    });
  });

  return { entries, indices };
}

function describeChildren(
  props: LazyTreeSelectorProps,
  item: TreeNode,
  parentSelection: SelectionNode<TreeNode> | undefined,
  defaultSelection: SelectionNode<TreeNode> | undefined,
  depth: number,
  output: NodeEntry[]
): void {
  if (item.children) {
    const { forest, selection } = props;
    for (const child of item.children as ReadonlyArray<TreeNode>) {
      let itemSelection: SelectionNode<TreeNode> | undefined;
      if (parentSelection) {
        const key = forest.keyOf(child);
        const childIndex = selection.getChildIndex(parentSelection, key);
        itemSelection = typeof childIndex === 'number' ? parentSelection.children[childIndex] : undefined;
      }
      describeItem(props, child, itemSelection, defaultSelection, depth, output);
    }
  }

  const { loading, hasMoreItems } = props.childrenOf(item);
  if (loading) {
    output.push({ type: EntryType.Spinner, depth });
  } else if (hasMoreItems) {
    output.push({ type: EntryType.Anchor, depth, item });
  }
}

function describeItem(
  props: LazyTreeSelectorProps,
  item: TreeNode,
  itemSelection: SelectionNode<any> | undefined,
  defaultSelection: SelectionNode<TreeNode> | undefined,
  depth: number,
  output: NodeEntry[]
) {
  const expanded = isItemExpanded(props, item);
  output.push({
    type: EntryType.Node,
    depth,
    item,
    itemSelection,
    defaultSelection,
    expanded,
  });

  if (expanded) {
    const defaultSelectionForChildren =
      itemSelection && TreeSelection.isTerminal(itemSelection) ? itemSelection : defaultSelection;
    describeChildren(props, item, itemSelection, defaultSelectionForChildren, depth + 1, output);
  }
}

function isItemExpanded(props: LazyTreeSelectorProps, item: TreeNode): boolean {
  let expanded: boolean | undefined = props.isExpanded(item);
  if (expanded === undefined) {
    expanded = props.expandedByDefault;
  }
  return expanded === undefined ? false : expanded;
}
