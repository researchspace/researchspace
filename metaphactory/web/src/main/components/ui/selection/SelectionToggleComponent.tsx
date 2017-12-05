/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

/**
 * @author Philip Polkovnikov
 */

import * as React from 'react';
import { Component } from 'react';
import { GlobalEventsContext, GlobalEventsContextTypes, Event } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';
import { SelectionEvents } from './SelectionEvents';

export interface ToggleDescription {
  value: boolean,
  tag: string
}

interface Props {
  /**
   * Name of checkbox listener
   */
  selection: string,
  /**
   * Extra data to pass to listener, so that it's possible to
   * figure out, which of checkboxes was toggled
   */
  tag: string
}

interface State {
  value: boolean
}

/**
 * Checkbox to mark rows as selected
 */
class SelectionToggleComponent extends Component<Props, State> {
  public static readonly contextTypes = GlobalEventsContextTypes;
  context: GlobalEventsContext;

  private cancellation = new Cancellation();

  constructor(props, context) {
    super(props, context);
    this.state = {
      value: false,
    };
  }

  componentDidMount() {
    this.cancellation.map(
      this.context.GLOBAL_EVENTS.listen({
        eventType: SelectionEvents.Toggle,
        target: this.props.selection,
      })
    ).onValue(this.onSelectionChange);
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  onSelectionChange = (event: Event<any>) => {
    const data = event.data;
    if (data.tag === this.props.tag) {
      this.setState({value: data.value});
    }
  }

  render() {
    return <input
      type='checkbox'
      checked={this.state.value}
      onChange={this.toggleSelection}
    />;
  }

  private toggleSelection = () => {
    const newValue = !this.state.value;
    const description: ToggleDescription = {
      value: newValue,
      tag: this.props.tag,
    };
    this.context.GLOBAL_EVENTS.trigger({
      eventType: SelectionEvents.Toggle,
      source: 'SelectionToggle',
      targets: [this.props.selection],
      data: description,
    });
  }
}

export default SelectionToggleComponent;
