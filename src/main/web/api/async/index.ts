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
import * as request from 'platform/api/http';

export { Cancellation } from './Cancellation';
export { WrappingError } from './WrappingError';
export { BatchedPool } from './BatchedPool';

export function requestAsProperty(req: request.SuperAgentRequest): Kefir.Property<request.Response> {
  return Kefir.stream<request.Response>((emitter) => {
    req.then(
      (response) => {
        emitter.emit(response);
        emitter.end();
      },
      (error) => {
        emitter.error(error);
        emitter.end();
      }
    );
    return () => req.abort();
  }).toProperty();
}
