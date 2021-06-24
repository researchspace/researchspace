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

import { Component, CSSProperties } from 'react';
import * as D from 'react-dom-factories';
import * as classNames from 'classnames';

import './CollapsibleDiv.scss';

export interface Props {
  expanded: boolean;
  renderHidden: boolean;
  className?: string;
  style?: CSSProperties;
}

export class CollapsibleDivContentComponent extends Component<Props, {}> {
  render() {
    const { expanded, renderHidden, className, style } = this.props;
    if (expanded) {
      return (
        D.div(
          {
            className: classNames(className, 'collapsible-div-content'),
            style
          }, this.props.children
        )
      );
    } else if (renderHidden) {
      return (
        D.div(
          {
            className: classNames(className, 'collapsible-div-content'),
            style: {...style, display: 'none'}
          }, this.props.children
        )
      );
    } else {
      return null;
    }
  }
}

export default CollapsibleDivContentComponent;
