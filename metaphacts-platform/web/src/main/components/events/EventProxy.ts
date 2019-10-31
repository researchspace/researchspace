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

import { Component } from 'react';

import { Cancellation } from 'platform/api/async';
import { Event, listen, trigger } from 'platform/api/events';

interface EventProxyConfig {
  /**
   * Used as a source id for re-triggered event
   */
  id: string;

  /**
   * Type of event to listen to.
   */
  onEventType?: string;

  /**
   * Source component that we listen for events.
   * When empty will listen for all events of a given type.
   */
  onEventSource?: string;

  /**
   * Type of the event that this component triggers when
   * receives event.
   */
  proxyEventType: string;


  /**
   * Ids of targets for triggered event.
   */
  proxyTargets?: string[];
  /**
   * Data that will be sent to all targets instead of the original event's data
   */
  data?: object;
}
type EventProxyProps = EventProxyConfig;

/**
 * Components that listen to specified event, and when it happens triggers some other event.
 *
 * For example one can refresh some area on events from <mp-set-management> component.
 * @example
 *
 * <mp-event-proxy id='some-refresh' on-event-source='set-management-component-id'
 *                   proxy-event-type='Component.Refresh' proxy-targets='["some-element"]'
 * ></mp-event-proxy>
 *
 * So when there is any event from component with id 'set-management-component-id',
 * <mp-event-proxy> will send Component.Refresh event to component with id 'some-element'.
 */
export class EventProxy extends Component<EventProxyProps, void> {

  private cancelation = new Cancellation();

  componentDidMount() {
    this.cancelation.map(
      listen({
        eventType: this.props.onEventType,
        source: this.props.onEventSource,
      })
    ).onValue(this.onEvent);
  }

  componentWillUnmount() {
    this.cancelation.cancelAll();
  }

  private onEvent = (event: Event<any>) => {
    trigger({
      eventType: this.props.proxyEventType,
      source: this.props.id,
      targets: this.props.proxyTargets,
      data: this.props.data || event.data,
    });
  }

  render() {
    return null;
  }
}
export default EventProxy;
