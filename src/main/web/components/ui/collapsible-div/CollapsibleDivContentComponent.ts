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

import { Component, CSSProperties, createFactory } from 'react';
import * as D from 'react-dom-factories';
import * as classNames from 'classnames';

import './CollapsibleDiv.scss';

export interface Props {
  expanded: boolean;
  className?: string;
  style?: CSSProperties;
}

export class CollapsibleDivContentComponent extends Component<Props, {}> {
  render() {
    const { expanded, className, style } = this.props;
    return expanded
      ? D.div({ className: classNames(className, 'collapsible-div-content'), style }, this.props.children)
      : null;
  }
}

export default CollapsibleDivContentComponent;
