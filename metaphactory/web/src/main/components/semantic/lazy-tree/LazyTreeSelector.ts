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

import { Component, DOM as D, ReactElement, SyntheticEvent } from 'react';
import { Map, List } from 'immutable';
import * as classnames from 'classnames';

import Spinner from '../../ui/spinner/Spinner';

import { KeyedForest, Traversable } from './KeyedForest';
import { TreeSelection } from './TreeSelection';
import { SelectionMode, CheckState } from './SelectionMode';

import * as styles from './LazyTreeSelector.scss';

export interface LazyTreeSelectorProps<T> {
  forest: KeyedForest<T>;
  isLeaf: (item: T) => boolean | undefined;
  childrenOf: (item: T) => {
    children?: List<T>;
    loading?: boolean;
    hasMoreItems?: boolean;
  };
  renderItem: (item: T) => React.ReactElement<any>;
  requestMore: (item: T) => void;

  hideCheckboxes?: boolean;
  selectionMode: SelectionMode<T>;

  selection?: TreeSelection<T>;
  onSelectionChanged?: (selectedItems: TreeSelection<T>) => void;

  expandedByDefault?: boolean;
  isExpanded?: (item: T) => boolean | undefined;
  /**
   * When specified makes expanded a controlled state, which means
   * that the component wouldn't keep separate state for it.
   */
  onExpandedOrCollapsed?: (item: T, expanded: boolean) => void;
}

interface State {
  expandedItems: Map<string, boolean>;
}

export class LazyTreeSelector<T extends Traversable<T>> extends Component<LazyTreeSelectorProps<T>, State> {
  private container: HTMLElement;
  private loadMoreAnchors: Map<HTMLElement, T>;

  constructor(props: LazyTreeSelectorProps<T>) {
    super(props);
    this.state = {
      expandedItems: Map<string, boolean>(),
    };
  }

  render() {
    this.loadMoreAnchors = Map<HTMLElement, T>();
    return D.div({
      ref: container => { this.container = container; },
    }, this.renderChildren(this.props.forest.root));
  }

  componentDidMount() {
    document.addEventListener('scroll', this.checkAnchorsVisibility, true);
    this.checkAnchorsVisibility();
  }

  componentWillUnmount() {
    document.removeEventListener('scroll', this.checkAnchorsVisibility, true);
  }

  componentDidUpdate() {
    this.checkAnchorsVisibility();
  }

  private checkAnchorsVisibility = () => {
    if (!this.container) { return; }
    this.loadMoreAnchors.forEach((path, anchor) => {
      if (isVerticallyScrolledIntoView(anchor, this.container)) {
        this.props.requestMore(path);
      }
    });
  }

  private registerAnchor(anchor: HTMLElement, item: T) {
    if (anchor) {
      this.loadMoreAnchors = this.loadMoreAnchors.set(anchor, item);
      this.checkAnchorsVisibility();
    } else {
      this.loadMoreAnchors = this.loadMoreAnchors.remove(anchor);
    }
  }

  private isItemExpanded(item: T) {
    let expanded: boolean | undefined = undefined;
    if (this.props.isExpanded) {
      expanded = this.props.isExpanded(item);
    }
    if (expanded === undefined && !this.props.onExpandedOrCollapsed) {
      expanded = this.state.expandedItems.get(this.props.forest.keyOf(item));
    }
    if (expanded === undefined) {
      expanded = this.props.expandedByDefault;
    }
    return expanded === undefined ? false : expanded;
  }

  private renderChildren(item: T, defaultSelected = false) {
    let childItems: ReactElement<any>[] = [];

    const {children, loading, hasMoreItems} = this.props.childrenOf(item);
    if (children) {
      const items = children.map(
        (child, index) => this.renderItem(child, defaultSelected)).toArray();
      childItems.push(...items);
    }

    if (loading) {
      childItems.push(Spinner({key: 'spinner', className: styles.spinner}));
    } else if (hasMoreItems) {
      childItems.push(D.button({
        type: 'button',
        key: 'anchor',
        onClick: () => this.props.requestMore(item),
        ref: anchor => this.registerAnchor(anchor, item),
      }, 'Load'));
    }

    return childItems;
  }

  private renderItem(item: T, defaultSelected: boolean): React.ReactElement<any> {
    const selected = TreeSelection.nodesFromKey(
      this.props.selection, this.props.forest.keyOf(item));
    const expanded = this.isItemExpanded(item);

    let childItems: ReactElement<any>[] = undefined;
    if (expanded) {
      childItems = this.renderChildren(
        item, defaultSelected || selected.some(TreeSelection.isTerminal));
    }

    const isLeaf = this.props.isLeaf(item) === true;
    const checkState = this.props.selectionMode.renderSelected(
      this.props.forest, this.props.selection, item, defaultSelected);

    return D.div(
      {
        className: classnames({
          [styles.itemExpanded]: expanded,
          [styles.itemCollapsed]: !expanded,
        }),
        key: this.props.forest.keyOf(item),
      },
      D.span({
        className: styles.expandToggle,
        style: {visibility: isLeaf ? 'collapse' : undefined},
        onClick: () => this.toggleExpanded(item, expanded),
      }),
      this.props.hideCheckboxes ? null : D.input({
        type: 'checkbox',
        checked: checkState !== CheckState.None,
        disabled: checkState === CheckState.FullGreyedOut,
        onChange: e => this.onItemCheckedChange(item, defaultSelected, e),
        ref: input => {
          if (input) {
            input.indeterminate = checkState === CheckState.Partial;
          }
        },
      }),
      D.div({
        style: {display: 'inline-block'},
        onClick: () => this.toggleExpanded(item, expanded),
      }, this.props.renderItem(item)),
      D.div({
        className: styles.children,
        style: {display: isLeaf ? 'none' : undefined},
      }, childItems)
    );
  }

  private toggleExpanded(item: T, previouslyExpanded: boolean) {
    if (this.props.onExpandedOrCollapsed) {
      // controlled expanded state
      this.props.onExpandedOrCollapsed(item, !previouslyExpanded);
    } else {
      // uncontrolled expanded state
      const newExpandedItems = this.state.expandedItems.set(
        this.props.forest.keyOf(item), !previouslyExpanded);
      this.setState({expandedItems: newExpandedItems});
    }

    if (!previouslyExpanded && !this.props.childrenOf(item).children) {
      this.props.requestMore(item);
    }
  }

  private onItemCheckedChange(
    item: T, defaultSelected: boolean, event: SyntheticEvent<HTMLInputElement>
  ) {
    if (!this.props.onSelectionChanged) { return; }

    const {forest, selectionMode} = this.props;
    const previous = this.props.selection || TreeSelection.empty(forest.keyOf);
    const next = selectionMode.change(forest, previous, item, defaultSelected);
    if (!next) { return; }

    this.props.onSelectionChanged(next);
  }
}

/**
 * See: http://stackoverflow.com/a/21627295/5278565
 */
function isVerticallyScrolledIntoView(
  element: HTMLElement, searchUpTo: HTMLElement = document.body
) {
  let {top, height} = element.getBoundingClientRect();
  let parent = element.parentElement;
  do {
    let {top: parentTop, bottom: parentBottom} = parent.getBoundingClientRect();
    if (top > parentBottom) { return false; }
    // Check if the element is out of view due to a container scrolling
    if ((top + height) <= parentTop) { return false; }
    if (parent === searchUpTo) { break; }
    parent = parent.parentElement;
  } while (parent);
  // Check its within the document viewport
  return top >= 0 && top <= document.documentElement.clientHeight;
}
