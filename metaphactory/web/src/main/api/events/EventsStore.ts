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

import * as _ from 'lodash';
import * as uuid from 'uuid';
import * as Kefir from 'kefir';

import { Event, EventFilter } from './EventsApi';

interface Subscriber {
  eventFilter: EventFilter<any>;
  emitter: Kefir.Emitter<Event<any>>;
}

/**
 * exposed only for testing purpose
 */
export const _subscribers: {[key: string]: Subscriber} = {};

/**
 * Listen to all events that satisfies given 'eventFilter'.
 */
export function listen<Data>(eventFilter: EventFilter<Data>): Kefir.Stream<Event<Data>> {
  return Kefir.stream(emitter => {
    const key = uuid.v4();
    _subscribers[key] = {eventFilter, emitter};
    return () => delete _subscribers[key];
  });
}

/**
 * Trigger event.
 */
export function trigger<Data>(event: Event<Data>) {
  _.forEach(
    _subscribers, ({eventFilter, emitter}) => {
      if (
          (eventFilter.eventType ? eventFilter.eventType === event.eventType : true) &&
          (eventFilter.source ? eventFilter.source === event.source : true) &&
          (eventFilter.target ? _.includes(event.targets || [], eventFilter.target) : true)
      ) {
        emitter.emit(event);
      }
    }
  );
}
