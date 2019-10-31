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

import { Cancellation } from 'platform/api/async';
import { trigger } from 'platform/api/events';
import { SetManagementEvents } from 'platform/api/services/ldp-set/SetManagementEvents';

import {
  SetManagementContextTypes, SetManagementContext, SetViewContext, SetViewContextTypes,
} from '../SetManagementApi';
import { SetItem } from '../SetsModel';

export interface Props {
  id: string;
}

/**
 * Fetches set items of a selected set
 *
 * This action can be used only inside <mp-set-management> component templates.
 *
 * @example <mp-set-management-action-fetch-set-items></mp-set-management-action-fetch-set-items>
 */
export class FetchSetItemsAction extends Component<Props, {}> {
  public static contextTypes = {...SetManagementContextTypes, ...SetViewContextTypes};
  context: SetManagementContext & SetViewContext;

  private readonly cancellation = new Cancellation();
  private fetchingItemsCancellation = this.cancellation.derive();

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private onClick = () => {
    const {id: source} = this.props;
    this.fetchingItemsCancellation = this.cancellation.deriveAndCancel(
      this.fetchingItemsCancellation
    );
    const set = this.context['mp-set-management--set-view'].getCurrentSet();
    this.fetchingItemsCancellation.map<ReadonlyArray<SetItem>>(
      this.context['mp-set-management'].fetchSetItems(set)
    ).onValue(items => {
      const iris = items.map(item => item.iri.value);
      trigger({source, eventType: SetManagementEvents.ItemsFetched, data: {iris}});
    });
  }

  public render() {
    const child = Children.only(this.props.children) as ReactElement<any>;
    const props = {onClick: this.onClick};
    return cloneElement(child, props);
  }
}
export default FetchSetItemsAction;
