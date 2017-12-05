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

import { Component, DOM as D, CSSProperties, ReactNode } from 'react';

import './removable-badge.scss';

export interface RemovableBadgeProps {
  className?: string;
  title?: string;
  style?: CSSProperties;
  onClick?: () => void;
  onRemove?: () => void;
  children?: ReactNode;
}

const CLASS_NAME = 'RemovableBadge';

export class RemovableBadge extends Component<RemovableBadgeProps, void> {
  render() {
    return D.div(
      {
        className: `${CLASS_NAME} ${this.props.className || ''}`,
        style: this.props.style,
        title: this.props.title,
      },
      D.button({
        className: `${CLASS_NAME}__content`,
        type: 'button',
        onClick: this.props.onClick,
      }, this.props.children),
      D.button({
        className: `${CLASS_NAME}__remove`,
        type: 'button',
        onClick: this.props.onRemove,
      }, D.span({className: 'fa fa-times'})),
    );
  }
}

export default RemovableBadge;
