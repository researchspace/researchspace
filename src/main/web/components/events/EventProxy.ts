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

import { Component } from 'react';
import { isMatch } from 'lodash';

import { Cancellation } from 'platform/api/async';
import { Event, listen, trigger } from 'platform/api/events';

export interface EventProxyConfig {
  /**
   * Used as a source id for re-triggered event
   */
  id: string;

  /**
   * Type of event to listen to. Can't be used together with onEventTypes
   */
  onEventType?: string;

  /**
   * Types of event to listen to. Can't be used together with onEventType.
   */
  onEventTypes?: string[];

  /**
   * Source component that we listen for events.
   * When empty will listen for all events of a given type.
   */
  onEventSource?: string;

  /**
   * Listen only to events sent to the given target.
   */
  onEventTarget?: string;

  /**
   * Proxy only events with payload that includes the following data.
   */
  onEventData?: Record<string, any>

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

  /**
   * Data that will be merged with proxied event data.
   */
  additionalData?: object;
}
export type EventProxyProps = EventProxyConfig;

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
    if (this.props.onEventTypes) {
      this.props.onEventTypes.forEach(
        eventType => {
          this.cancelation
            .map(
              listen({
                eventType,
                source: this.props.onEventSource,
                target: this.props.onEventTarget,
              })
            )
            .onValue(this.onEvent);
        }
      )
    } else {
      this.cancelation
        .map(
          listen({
            eventType: this.props.onEventType,
            source: this.props.onEventSource,
            target: this.props.onEventTarget,
          })
        )
        .onValue(this.onEvent);
    }
  }

  componentWillUnmount() {
    this.cancelation.cancelAll();
  }

  private onEvent = (event: Event<any>) => {
    let data = this.props.data || event.data;
    data = { ...data, ...this.props.additionalData };

    if (this.props.onEventData && !isMatch(event.data, this.props.onEventData)) {
      return;
    }

    trigger({
      eventType: this.props.proxyEventType,
      source: this.props.id,
      targets: this.props.proxyTargets,
      data,
    });
  };

  render() {
    return null;
  }
}
export default EventProxy;
