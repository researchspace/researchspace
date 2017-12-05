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
  ReactElement,
  cloneElement,
} from 'react';

import { GlobalEventsContext, GlobalEventsContextTypes } from 'platform/api/events';

interface EventTriggerProps {
  /**
   * Identifier which will be used as event source id.
   */
  id: string;

  /**
   * Type of the event to trigger.
   */
  type: string;

  /**
   * Ids of the components that this event should be send to.
   * When empty event is broadcasted to all listeners.
   */
  targets?: string[];
}

/**
 * Triggers event.
 *
 * @example
 *   <mp-event-target-refresh id='some-element'><div></div></mp-event-target-refresh>
 *
 *   <mp-event-trigger id='dom-refresh' type='Component.Refresh' targets='["some-element"]'>
 *     <button>Refresh</button>
 *   </mp-event-trigger>
 *
 * In the example above Component.Refresh event is sent to the element with id 'some-element'.
 */
export class EventTrigger extends Component<EventTriggerProps, void> {
  public static readonly contextTypes = GlobalEventsContextTypes;
  context: GlobalEventsContext;

  render() {
    const child = Children.only(this.props.children) as ReactElement<any>;
    const props = {onClick: this.onClick};
    return cloneElement(child, props);
  }

  private onClick = () =>
    this.context.GLOBAL_EVENTS.trigger({
      eventType: this.props.type,
      source: this.props.id,
      targets: this.props.targets,
    })
}
export default EventTrigger;
