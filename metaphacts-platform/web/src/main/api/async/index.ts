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

import * as Kefir from 'kefir';
import * as request from 'platform/api/http';

export { Cancellation } from './Cancellation';
export { WrappingError } from './WrappingError';
export { BatchedPool } from './BatchedPool';

export function requestAsProperty(
  req: request.SuperAgentRequest
): Kefir.Property<request.Response> {
  return Kefir.stream<request.Response>(emitter => {
    req.then(
      response => {
        emitter.emit(response);
        emitter.end();
      },
      error => {
        emitter.error(error);
        emitter.end();
      },
    );
    return () => req.abort();
  }).toProperty();
}
