/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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
import * as D from 'react-dom-factories';
import * as classNames from 'classnames';
import * as assign from 'object-assign';

export interface FloatingElementProps extends React.Props<FloatingElementComponent> {
  position: {
    start: {
      x: number
      y: number
    }
    end: {
      x: number
      y: number
    }
  }
  style?: {}
  className?: string
}

export class FloatingElementComponent extends React.Component<FloatingElementProps, {}> {
  constructor(props: FloatingElementProps) {
    super(props);
  }

  render() {
    return D.div(
      assign({}, this.props, {
        style: assign({}, this.props.style, {
          top: this.props.position.start.y,
          left: this.props.position.start.x,
          width: this.props.position.end.x - this.props.position.start.x,
        }),
        className: classNames(this.props.className, 'floating-element'),
      }), this.props.children
    );
  }
}

export const FloatingElement = React.createFactory(FloatingElementComponent);
export default FloatingElement;
