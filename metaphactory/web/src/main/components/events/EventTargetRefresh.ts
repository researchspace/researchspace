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

import {
  Component,
  Children,
  DOM,
} from 'react';

import { GlobalEventsContext, GlobalEventsContextTypes, BuiltInEvents } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';

interface EventTargetRefreshProps {
  /**
   * Unique id of the component that can be used by event emitters as a target.
   */
  id: string;
}

interface EventTargetState {
  refresh: boolean;
}

/**
 * Refresh child when receiving Component.Refresh event.
 *
 * There are many ways in which one can trigger refresh on this component.
 * For example one can manually trigger the event wit <mp-event-trigger-component>:
 *
 *   <mp-event-target-refresh id='some-element'><div></div></mp-event-target-refresh>
 *
 *   <mp-event-trigger id='dom-refresh' type='Component.Refresh' targets='["some-element"]'>
 *     <button>Refresh</button>
 *   </mp-event-trigger>
 *
 * In this example as soon as Refresh button is clicked content of corresponding
 * <mp-event-target-refresh> component will be re-mounted.
 *
 */
export class EventTargetRefresh extends Component<EventTargetRefreshProps, EventTargetState> {
  public static readonly contextTypes = GlobalEventsContextTypes;
  context: GlobalEventsContext;

  private cancelation = new Cancellation();

  constructor(props, context) {
    super(props, context);
    this.state = {
      refresh: false,
    };
  }

  componentDidMount() {
    this.cancelation.map(
      this.context.GLOBAL_EVENTS.listen({
        eventType: BuiltInEvents.ComponentRefresh,
        target: this.props.id,
      })
    ).onValue(this.onRefresh);
  }

  componentWillUnmount() {
    this.cancelation.cancelAll();
  }

  render() {
    if (this.state.refresh) {
      return DOM.div();
    } else {
      return Children.only(this.props.children);
    }
  }

  /**
   * As soon as refresh has been propagated to the render, we want to set it back to false,
   * to re-mount child component.
   * see https://facebook.github.io/react/docs/react-component.html#setstate for more details
   */
  private onRefresh = () => this.setState({refresh: true}, () => this.setState({refresh: false}));
}

export default EventTargetRefresh;
