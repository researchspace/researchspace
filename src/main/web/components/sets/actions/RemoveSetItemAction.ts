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

import { Component, Children, ReactElement, cloneElement } from 'react';

import {
  SetManagementContextTypes,
  SetManagementContext,
  SetViewContext,
  SetViewContextTypes,
  SetItemViewContext,
  SetItemViewContextTypes,
} from '../SetManagementApi';

/**
 * Removes item from the active set.
 *
 * This action can be used only inside <mp-set-management> component template for set item.
 *
 * @example <mp-set-management-action-remove-set-item></mp-set-management-action-remove-set-item>
 */
export class RemoveSetItemAction extends Component<{}, {}> {
  public static contextTypes = { ...SetManagementContextTypes, ...SetViewContextTypes, ...SetItemViewContextTypes };
  context: SetManagementContext & SetViewContext & SetItemViewContext;

  private onClick = () =>
    this.context['mp-set-management'].removeSetItem(
      this.context['mp-set-management--set-view'].getCurrentSet(),
      this.context['mp-set-management--set-item-view'].getItem()
    );

  public render() {
    const child = Children.only(this.props.children) as ReactElement<any>;
    const props = { onClick: this.onClick };
    return cloneElement(child, props);
  }
}
export default RemoveSetItemAction;
