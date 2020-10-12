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

import * as _ from 'lodash';
import * as uuid from 'uuid';
import * as Kefir from 'kefir';
import * as Immutable from 'immutable';

import { Rdf } from 'platform/api/rdf';

import { Event, EventFilter, EventType } from './EventsApi';

interface Subscriber {
  eventFilter: EventFilter<any>;
  emitter: Kefir.Emitter<Event<any>>;
}

/**
 * exposed only for testing purpose
 */
export const _subscribers: { [key: string]: Subscriber } = {};

/**
 * Listen to all events that satisfies given 'eventFilter'.
 */
export function listen<Data>(eventFilter: EventFilter<Data>): Kefir.Stream<Event<Data>> {
  return Kefir.stream((emitter) => {
    const key = uuid.v4();
    _subscribers[key] = { eventFilter, emitter };

    // Emits the event if it has the current value
    const currentValue = EventSourceStore.getCurrentValue(eventFilter);
    if (currentValue) {
      emitter.emit(currentValue);
    }

    return () => {
      delete _subscribers[key]
    };
  });
}

/**
 * Trigger event.
 */
export function trigger<Data>(event: Event<Data>) {
  _.forEach(_subscribers, subscriber => {
    // in some browsers subscriber can be undefined because
    // `delete _subscriber[key]` keeps the key and makes value undefined
    if (subscriber) {
      const { eventFilter, emitter } = subscriber;
      if (
        (eventFilter.eventType ? eventFilter.eventType === event.eventType : true) &&
          (eventFilter.source ? eventFilter.source === event.source : true) &&
          (eventFilter.target ? _.includes(event.targets || [], eventFilter.target) : true)
      ) {
        emitter.emit(event);
      }
    }
  });
  EventSourceStore.updateCurrentValue(event);
}

export function registerEventSource(eventSource: EventSource) {
  EventSourceStore.addEventSource(eventSource);
}

export function unregisterEventSource(eventSource: EventSource) {
  EventSourceStore.deleteEventSource(eventSource);
}

interface EventSource {
  source: string;
  eventType: EventType<any>;
  currentValue?: Event<any>;
}
namespace EventSourceStore {
  let sources: Immutable.Map<EventSourceKey, EventSource> = Immutable.Map();

  export function getCurrentValue<Data>(eventFilter: EventFilter<Data>): Event<Data> | undefined {
    const key = eventSourceKey(eventFilter.source, eventFilter.eventType);
    const eventSource = sources.get(key);
    if (eventSource) {
      return eventSource.currentValue;
    }
    return undefined;
  }

  export function updateCurrentValue<Data>(event: Event<Data>) {
    const key = eventSourceKey(event.source, event.eventType);
    const eventSource = sources.get(key);
    if (eventSource) {
      sources = sources.set(key, { ...eventSource, currentValue: event });
    }
  }

  export function addEventSource(eventSource: EventSource) {
    const key = eventSourceKey(eventSource.source, eventSource.eventType);
    if (!sources.has(key)) {
      sources = sources.set(key, eventSource);
    }
  }

  export function deleteEventSource(eventSource: EventSource) {
    const key = eventSourceKey(eventSource.source, eventSource.eventType);
    sources = sources.remove(key);
  }

  function eventSourceKey<Data>(source: string, eventType: EventType<Data>): EventSourceKey {
    return new EventSourceKey(source, eventType);
  }
}

class EventSourceKey {
  constructor(private _source: string, private _eventType: EventType<any>) {}

  get source() {
    return this._source;
  }

  get eventType() {
    return this._eventType;
  }

  public equals(other: EventSourceKey) {
    return this.source === other.source && this.eventType === other.eventType;
  }

  public hashCode() {
    let hash = 0;
    hash = 31 * hash + Rdf.hashString(this.source);
    hash = 31 * hash + Rdf.hashString(this.eventType);
    return Rdf.smi(hash);
  }
}
