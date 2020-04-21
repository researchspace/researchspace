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

import { Component, createFactory, ReactElement, Children, cloneElement } from 'react';
import * as assign from 'object-assign';

export interface Props {
  onClick?: () => void;
}

export class SplitPaneToggleOnComponent extends Component<Props, {}> {
  render() {
    const child = Children.only(this.props.children) as ReactElement<any>;
    const style = assign({}, { cursor: 'pointer' }, child.props.style);

    return cloneElement(child, { onClick: this.props.onClick, style: style });
  }
}

export type component = SplitPaneToggleOnComponent;
export const component = SplitPaneToggleOnComponent;
export const factory = createFactory(component);
export default component;
