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

import * as Kefir from 'kefir';

export type EventType<Data> = string & { __dataType?: Data };

export interface Event<Data> {
  readonly eventType: EventType<Data>;
  readonly source: string;
  readonly targets?: ReadonlyArray<string>;
  readonly data?: Data;
}

/**
 * Conjunctive filter used by EventsApi#listen.
 */
export interface EventFilter<Data> {
  /**
   * Listen only to events of specific type.
   */
  eventType?: EventType<Data>;

  /**
   * Listen only to events addressed to specific target.
   */
  target?: string;

  /**
   * Listen only to events triggered by specific source.
   */
  source?: string;
}

export interface EventsApi {
  /**
   * Listen to events that matches provided filter object.
   */
  listen<Data>(eventFilter: EventFilter<Data>): Kefir.Stream<Event<Data>>;

  /**
   * Trigger event.
   */
  trigger<Data>(event: Event<Data>): void;
}
