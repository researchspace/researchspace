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

import { Component, Children, ReactElement, cloneElement, MouseEvent } from 'react';

import { trigger } from 'platform/api/events';

interface EventTriggerConfig {
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
  /**
   * Data that will be sent to all targets
   */
  data?: any;

  /**
   * Array of actions to trigger event.
   *
   * Can be "hover", "click", "mounted".
   *
   * @default ["click"]
   */
  on?: string[];
}
type EventTriggerProps = EventTriggerConfig;

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

  static defaultProps = {
    on: ["click"],
  };

  componentDidMount() {
    if (this.props.on.some(o => o === 'mounted')) {
      this.triggerEvent();
    }
  }

  render() {
    if (this.props.children) {
      const child = Children.only(this.props.children) as ReactElement<any>;
      const props = this.props.on.reduce(
        (res, action) => {
          if (action == 'click') {
            res['onClick'] = this.onEvent;
          } else if (action === 'hover') {
            res['onMouseEnter'] = this.onEvent;
          }
          return res;
        }, {}
      )
      return cloneElement(child, props);
    } else {
      return null;
    }
  }

  private onEvent = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    this.triggerEvent();
  };

  private triggerEvent() {
    trigger({
      eventType: this.props.type,
      source: this.props.id,
      targets: this.props.targets,
      data: this.props.data,
    });
  }
}
export default EventTrigger;
