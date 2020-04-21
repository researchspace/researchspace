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

import { Component, createFactory, CSSProperties } from 'react';
import * as D from 'react-dom-factories';

type TriggerType = 'click' | 'hover' | 'focus';

export interface Props {
  className?: string;
  style?: CSSProperties;
  /**
   * Popover placement
   * @default 'right'
   */
  placement?: 'left' | 'top' | 'bottom' | 'right';
  /**
   * Which action or actions trigger Overlay visibility.
   * @default ['click'] due to pop accessibility of 'hover' and 'focus'
   */
  trigger?: TriggerType | TriggerType[];

  /**
   * Whether the overlay should trigger onHide when the user clicks outside the overlay
   * @default true
   */
  rootClose?: boolean;
}

export class PopoverTriggerComponent extends Component<Props, {}> {
  render() {
    const { className, style } = this.props;
    return D.div({ className, style }, this.props.children);
  }
}

export type component = PopoverTriggerComponent;
export const component = PopoverTriggerComponent;
export const factory = createFactory(component);
export default component;
