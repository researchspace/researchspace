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

import { Component, Children, ReactElement, cloneElement } from 'react';

import {
  SetManagementContextTypes, SetManagementContext,
  SetViewContext, SetViewContextTypes, SetItemViewContext, SetItemViewContextTypes,
} from '../SetManagementApi';

/**
 * Removes item from the active set.
 *
 * This action can be used only inside <mp-set-management> component template for set item.
 *
 * @example <mp-set-management-action-remove-set-item></mp-set-management-action-remove-set-item>
 */
export class RemoveSetItemAction extends Component<{}, {}> {
  public static contextTypes =
    {...SetManagementContextTypes, ...SetViewContextTypes, ...SetItemViewContextTypes};
  context: SetManagementContext & SetViewContext & SetItemViewContext;

  private onClick = () =>
    this.context['mp-set-management'].removeSetItem(
      this.context['mp-set-management--set-view'].getCurrentSet(),
      this.context['mp-set-management--set-item-view'].getItem()
    )

  public render() {
    const child = Children.only(this.props.children) as ReactElement<any>;
    const props = {onClick: this.onClick};
    return cloneElement(child, props);
  }
}
export default RemoveSetItemAction;
