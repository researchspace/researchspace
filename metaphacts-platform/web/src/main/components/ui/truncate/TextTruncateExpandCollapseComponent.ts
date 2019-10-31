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

import { Component, createFactory, ReactElement, Children, cloneElement } from 'react';

export interface Props {
  onClick?: () => void;
}

export interface State {}

export class TextTruncateExpandCollapseComponent extends Component<Props, {}> {

  render() {
    const child = Children.only(this.props.children) as ReactElement<any>;

    return cloneElement(child, {onClick: this.props.onClick});
  }
}

export type component = TextTruncateExpandCollapseComponent;
export const component = TextTruncateExpandCollapseComponent;
export const factory = createFactory(component);
export default component;
