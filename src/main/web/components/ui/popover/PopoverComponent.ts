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

import { Component, createFactory, Children, ReactElement, cloneElement, SyntheticEvent } from 'react';
import * as ReactBootstrap from 'react-bootstrap';
import * as _ from 'lodash';

import { componentHasType } from 'platform/components/utils';

import { PopoverContentComponent } from './PopoverContentComponent';
import { PopoverTriggerComponent } from './PopoverTriggerComponent';

const OverlayTrigger = createFactory(ReactBootstrap.OverlayTrigger);
const Popover = createFactory(ReactBootstrap.Popover);

export interface Props {
  /**
   * Popover title.
   * If empty/undefined, not title will be visible in the popover.
   */
  title: string;

  /**
   * CSS class for popover root element.
   */
  className?: string;
}

/**
 * @example
 * <mp-popover title="my popover">
 *     <mp-popover-trigger placement="left" trigger='["click","hover","focus"]' root-close='false'>
 *         <i class="fa fa-question-circle" aria-hidden="true"></i>
 *     </mp-popover-trigger>
 *     <mp-popover-content>Content</mp-popover-content>
 * </mp-popover>
 */
export class PopoverComponentClass extends Component<Props, {}> {
  render() {
    const { title, className } = this.props;

    const children = Children.toArray(this.props.children);
    const triggerComponent = _.find(children, (child) => componentHasType(child, PopoverTriggerComponent));
    const contentComponent = _.find(children, (child) => componentHasType(child, PopoverContentComponent));

    const triggerChildren = (Children.only(triggerComponent) as ReactElement<any>).props.children;
    const contentChildren = (Children.only(contentComponent) as ReactElement<any>).props.children;

    const popover = Popover({ id: 'mp-popover', title, className }, contentChildren);
    const trigger = (Children.only(triggerComponent) as ReactElement<any>).props.trigger;
    const placement = (Children.only(triggerComponent) as ReactElement<any>).props.placement;
    const rootClose = (Children.only(triggerComponent) as ReactElement<any>).props.rootClose;
    return OverlayTrigger(
      {
        overlay: popover,
        trigger: trigger || ['click'],
        placement: placement,
        rootClose: rootClose || true,
      },
      cloneElement(
        triggerChildren, {onClick: (event: SyntheticEvent) => event.stopPropagation()}
      )
    );
  }
}

export type component = PopoverComponentClass;
export const component = PopoverComponentClass;
export const factory = createFactory(component);
export default component;
