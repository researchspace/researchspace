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

import { Component, CSSProperties, createFactory } from 'react';
import * as D from 'react-dom-factories';
import * as classNames from 'classnames';

import './CollapsibleDiv.scss';

export interface Props {
  className?: string;
  style?: CSSProperties;
  expanded?: boolean;
  onClick?: () => void;
  expandedClass?: string;
  collapsedClass?: string;
}

export class CollapsibleDivTriggerComponent extends Component<Props, {}> {
  render() {
    const {className, style, onClick, expanded, expandedClass, collapsedClass} = this.props;
    const CLASSNAME = 'collapsible-panel-trigger';
    const expandedCssClass = expandedClass ? expandedClass : CLASSNAME + '__expanded';
    const collapsedCssClass = collapsedClass ? collapsedClass : CLASSNAME + '__collapsed';
    return D.div({
      className: classNames(
          CLASSNAME,
          expanded ? expandedCssClass : collapsedCssClass
      ),
      style,
      onClick,
    }, this.props.children);
  }
}

export default CollapsibleDivTriggerComponent;
