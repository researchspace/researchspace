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

import { Component, Children, ReactElement, cloneElement, CSSProperties } from 'react';
import { findDOMNode } from 'react-dom';
import * as classNames from 'classnames';
import * as _ from 'lodash';

import { DRAG_AND_DROP_FORMAT, DRAG_AND_DROP_FORMAT_IE } from './DragAndDropApi';

export interface DraggableProps {
  /**
   * Resource identifier
   */
  iri: string;
  /**
   * Styles that are added to the component, if it dragged.
   */
  dragStyles?: CSSProperties;
  /**
   * Callback which fires when component becomes dragged.
   */
  onDragStart?: (iri?: string) => void;
  /**
   * Callback which fires when component stops being dragged.
   */
  onDragEnd?: () => void;
}

interface State {
  isDragged: boolean;
}

/**
 * This component takes inner html and makes it automatically draggable.
 * Child element could be any HTML-element (not text node).
 *
 * @example
 * <mp-draggable iri="http://collection.britishmuseum.org/id/object/PDB7385">
 *     <div>Content</div>
 * </mp-draggable>
 */
export class Draggable extends Component<DraggableProps, State> {
  private source: Element;

  constructor(props: DraggableProps) {
    super(props);
    this.state = {
      isDragged: false,
    };
  }

  componentWillMount() {
    const { children } = this.props;

    if (typeof children === 'string') {
      throw Error(`The child element couldn't be a text node`);
    }

    if (!children) {
      throw Error(`The child element doesn't exists`);
    }
  }

  private setHandlers = (source: any) => {
    if (source) {
      this.source = findDOMNode(source) as Element;

      this.source.addEventListener('dragstart', this.onDragStart);
      this.source.addEventListener('dragend', this.onDragEnd);
    } else if (this.source) {
      this.source.removeEventListener('dragstart', this.onDragStart);
      this.source.removeEventListener('dragend', this.onDragEnd);
    }
  };

  private onDragStart = (e) => {
    try {
      e.dataTransfer.setData(DRAG_AND_DROP_FORMAT, this.props.iri);
    } catch (ex) {
      // IE fix
    }
    // One can drop into draft-js contenteditable only if some known to browser mime-type is set
    e.dataTransfer.setData(DRAG_AND_DROP_FORMAT_IE, this.props.iri);

    this.setState({ isDragged: true });
    if (this.props.onDragStart) {
      this.props.onDragStart(this.props.iri);
    }

    const mpDragStart = new CustomEvent('mp-dragstart', { detail: { iri: this.props.iri } });
    window.dispatchEvent(mpDragStart);
  };

  private onDragEnd = (e) => {
    this.setState({ isDragged: false });
    if (this.props.onDragEnd) {
      this.props.onDragEnd();
    }

    const mpDragEnd = new CustomEvent('mp-dragend');
    window.dispatchEvent(mpDragEnd);
  };

  public render() {
    const child = Children.only(this.props.children) as ReactElement<any>;
    const { dragStyles } = this.props;
    const { isDragged } = this.state;

    const style = {};
    _.extend(style, child.props.style || {});
    _.extend(style, isDragged && dragStyles ? dragStyles : {});

    const className = classNames(child.props.className, {
      'mp-draggable-dragged': isDragged,
    });

    return cloneElement(child, {
      ref: this.setHandlers,
      className: className,
      style: style,
      draggable: true,
      onMouseDown: (e) => e.stopPropagation(),
    });
  }
}

export default Draggable;
