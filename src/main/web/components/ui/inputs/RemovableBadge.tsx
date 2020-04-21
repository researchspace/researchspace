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
import { Component, CSSProperties, ReactNode } from 'react';
import * as D from 'react-dom-factories';

import './removable-badge.scss';

export interface RemovableBadgeProps {
  className?: string;
  title?: string;
  style?: CSSProperties;
  disableClick?: boolean;
  disableRemove?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  children?: ReactNode;
}

const CLASS_NAME = 'RemovableBadge';

export class RemovableBadge extends Component<RemovableBadgeProps, {}> {
  render() {
    return D.div(
      {
        className: `${CLASS_NAME} ${this.props.className || ''}`,
        style: this.props.style,
        title: this.props.title,
      },
      D.button(
        {
          className: `${CLASS_NAME}__content`,
          type: 'button',
          disabled: this.props.disableClick,
          onClick: this.props.onClick,
        },
        this.props.children
      ),
      D.button(
        {
          className: `${CLASS_NAME}__remove`,
          type: 'button',
          disabled: this.props.disableRemove,
          onClick: this.props.onRemove,
        },
        D.span({ className: 'fa fa-times' })
      )
    );
  }
}

export default RemovableBadge;
