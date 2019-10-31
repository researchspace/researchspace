/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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
import { Component, ReactNode, CSSProperties } from 'react';
import * as classNames from 'classnames';

import { Droppable, DroppableProps } from 'platform/components/dnd';

import * as styles from './DropArea.scss';

export interface DropAreaProps extends DroppableProps {
  dropMessage?: ReactNode;
  dropMessageStyle?: CSSProperties;
  childrenClassName?: string; 
  className?: string;
  style?: CSSProperties;
  alwaysVisible?: boolean;
}

export class DropArea extends Component<DropAreaProps, {}> {
  render() {
    const {children, dropMessage, dropMessageStyle, childrenClassName, className, style, alwaysVisible, ...otherProps} = this.props;
    const classes = classNames(styles.dropArea, className, {[styles.alwaysVisible]: alwaysVisible});
    return (
      <Droppable {...otherProps}>
        <div className={`${classes}`} style={style}>
          <div className={styles.messageWrapper}>
            <div className={styles.dropMessage} style={dropMessageStyle}>
              {dropMessage}
            </div>
          </div>
          <div className={`${styles.children} ${childrenClassName}`}>
            {children}
          </div>
        </div>
      </Droppable>
    );
  }
}
