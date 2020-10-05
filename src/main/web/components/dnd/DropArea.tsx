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
import { Component, ReactNode, CSSProperties } from 'react';
import * as classNames from 'classnames';

import { Droppable, DroppableProps } from 'platform/components/dnd';

import * as styles from './DropArea.scss';

export interface DropAreaProps extends DroppableProps {
  dropMessage?: ReactNode;
  dropMessageStyle?: CSSProperties;
  dropMessageWrapperStyle?: CSSProperties;
  childrenClassName?: string;
  className?: string;
  style?: CSSProperties;
  alwaysVisible?: boolean;
}

export class DropArea extends Component<DropAreaProps, {}> {
  render() {
    const {
      children,
      dropMessageWrapperStyle,
      dropMessage,
      dropMessageStyle,
      childrenClassName,
      className,
      style,
      alwaysVisible,
      ...otherProps
    } = this.props;
    const classes = classNames(styles.dropArea, className, { [styles.alwaysVisible]: alwaysVisible });
    return (
      <Droppable {...otherProps}>
        <div className={`${classes}`} style={style}>
          <div className={styles.messageWrapper} style={dropMessageWrapperStyle}>
            <div className={styles.dropMessage} style={dropMessageStyle}>
              {dropMessage}
            </div>
          </div>
          <div className={`${styles.children} ${childrenClassName}`}>{children}</div>
        </div>
      </Droppable>
    );
  }
}
