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

import * as React from 'react';
import { Component, CSSProperties, ReactChild } from 'react';

import { Ordering } from './Ordering';

import './ReorderableList.scss';

interface Props {
  ordering?: Ordering;
  onOrderChanged?: (ordering: Ordering) => void;
  className?: string;
  style?: CSSProperties;
}

interface State {
  readonly ordering?: Ordering;
  readonly draggingIndex?: number;
}

const CLASS_NAME = 'ReorderableList';

export class ReorderableList extends Component<Props, State> {
  private isDragging = false;
  private lastHoverIndex: number;

  constructor(props: Props) {
    super(props);
    this.state = {
      ordering: (this.props.ordering || Ordering.empty).setSize(
        React.Children.count(this.props.children)),
    };
  }

  render() {
    const {style, children} = this.props;
    const positionToIndex = this.state.ordering.getPositionToIndex();
    const items = React.Children.toArray(children);
    const draggingClass = typeof this.state.draggingIndex === 'number'
      ? `${CLASS_NAME}--dragging` : '';
    const className = `${CLASS_NAME} ${draggingClass} ${this.props.className || ''}`;
    return (
      <div className={className} style={style}>
        {positionToIndex.map((index, position) => this.renderItem(items[index], index))}
      </div>
    );
  }

  renderItem(item: ReactChild, index: number) {
    const {draggingIndex} = this.state;
    const style: CSSProperties = index === draggingIndex
      ? {opacity: 0, pointerEvents: 'none'}
      : undefined;
    const className = `${CLASS_NAME}__item`;
    const draggedClass = index === draggingIndex ? `${className}--dragged` : '';
    return (
      <div key={getChildKey(item)} className={`${className} ${draggedClass}`}
        draggable={true}
        onDrag={e => this.startDragging(index, e)}
        onDragEnd={e => this.onDragEnd()}
        onDragOver={e => e.preventDefault()}
        onDragEnter={e => this.onDragEnterTarget(index, e)}
        onDragLeave={e => this.onDragLeaveTarget(index)}
        onDrop={e => this.onDropAtTarget(index, e)}
        style={style}>
        <div className={`${CLASS_NAME}__item-handle`}></div>
        <div className={`${CLASS_NAME}__item-body`}>
          {item}
        </div>
      </div>
    );
  }

  componentWillReceiveProps(nextProps: Props & React.Props<any>) {
    const ordering = (nextProps.ordering || this.state.ordering).setSize(
      React.Children.count(nextProps.children));
    this.setState({ordering});
  }

  private startDragging(itemIndex: number, e: React.DragEvent<HTMLDivElement>) {
    if (this.isDragging) { return; }
    e.stopPropagation();
    this.isDragging = true;
    this.setState({draggingIndex: itemIndex});
  }

  private onDragEnd() {
    if (!this.isDragging) { return; }
    this.isDragging = false;

    if (this.props.onOrderChanged && this.state.ordering !== this.props.ordering) {
      this.props.onOrderChanged(this.state.ordering);
    }

    this.setState({draggingIndex: undefined});
  }

  private onDropAtTarget(targetIndex: number, e: React.DragEvent<HTMLDivElement>) {
    if (!this.isDragging) { return; }
    e.preventDefault();
    this.lastHoverIndex = undefined;
    this.setState({draggingIndex: undefined});
  }

  private onDragEnterTarget(itemIndex: number, e: React.DragEvent<HTMLDivElement>) {
    if (!this.isDragging) { return; }
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const {draggingIndex} = this.state;
    if (itemIndex !== this.lastHoverIndex && itemIndex !== draggingIndex) {
      this.lastHoverIndex = itemIndex;
      const {ordering} = this.state;
      const newOrdering = ordering.moveItemFromTo(
        ordering.getPosition(draggingIndex),
        ordering.getPosition(itemIndex));
      this.setState({ordering: newOrdering});
    }
  }

  private onDragLeaveTarget(itemIndex: number) {
    if (!this.isDragging) { return; }
    this.lastHoverIndex = undefined;
  }
}

function getChildKey(child: ReactChild): string | number {
  return typeof child === 'object' ? child.key : child;
}

export default ReorderableList;
