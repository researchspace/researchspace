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

import { Component, Children } from 'react';
import * as D from 'react-dom-factories';

import { BuiltInEvents, listen } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';

interface EventTargetRefreshConfig {
  /**
   * Unique id of the component that can be used by event emitters as a target.
   */
  id: string;

  /**
   * An (optional) time interval in seconds to refresh the specific target event without
   * explicit triggering through Component.Refresh event.
   */
  refreshInterval?: number;
}
type EventTargetRefreshProps = EventTargetRefreshConfig;

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
 * Alternatively the target-refresh can also be triggered by specifying a time interval:
 *
 *   <mp-event-target-refresh id='some-element' refresh-interval=5>
 *    <div></div>
 *   </mp-event-target-refresh>
 *
 *   <mp-event-trigger id='dom-refresh' type='Component.Refresh' targets='["some-element"]'>
 *     <button>Refresh</button>
 *   </mp-event-trigger>
 *
 */
export class EventTargetRefresh extends Component<EventTargetRefreshProps, EventTargetState> {
  private cancelation = new Cancellation();
  private timer;

  constructor(props, context) {
    super(props, context);
    this.state = {
      refresh: false,
    };
  }

  componentDidMount() {
    this.cancelation
      .map(
        listen({
          eventType: BuiltInEvents.ComponentRefresh,
          target: this.props.id,
        })
      )
      .onValue(this.onRefresh);

    if (this.props.refreshInterval) {
      this.timer = setInterval(() => this.onRefresh(), this.props.refreshInterval * 1000);
    }
  }

  componentWillUnmount() {
    this.cancelation.cancelAll();
    // cleanup the timer
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  render() {
    if (this.state.refresh) {
      return D.div();
    } else {
      return Children.only(this.props.children);
    }
  }

  /**
   * As soon as refresh has been propagated to the render, we want to set it back to false,
   * to re-mount child component.
   * see https://facebook.github.io/react/docs/react-component.html#setstate for more details
   */
  private onRefresh = () => this.setState({ refresh: true }, () => this.setState({ refresh: false }));
}

export default EventTargetRefresh;
