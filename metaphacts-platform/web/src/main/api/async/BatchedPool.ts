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
import * as Immutable from 'immutable';

interface FetchResult<Input, Output> {
  inputs: Immutable.Set<Input>;
  batch?: Immutable.Map<Input, Output>;
  error?: any;
}

const DEFAULT_INTERVAL_MS = 20;
const DEFAULT_BATCH_SIZE = 100;

/**
 * Combines multiple async request in a single batch by buffering
 * them using {@Kefir.Stream.bufferWithTimeOrCount}.
 *
 * @author Alexey Morozov
 */
export class BatchedPool<Input, Output> {
  private emitter: Kefir.Emitter<Input>;
  private bufferedStream: Kefir.Stream<FetchResult<Input, Output>>;

  readonly batchSize: number;

  constructor(params: {
    fetch: (inputs: Immutable.Set<Input>) => Kefir.Property<Immutable.Map<Input, Output>>;
    batchSize?: number;
    delayIntervalMs?: number;
  }) {
    const {
      batchSize = DEFAULT_BATCH_SIZE,
      delayIntervalMs = DEFAULT_INTERVAL_MS,
    } = params;

    this.batchSize = batchSize;

    const stream = Kefir.stream<Input>(
      emitter => { this.emitter = emitter; });
    this.bufferedStream = stream
      .bufferWithTimeOrCount(delayIntervalMs, batchSize)
      .filter(inputs => inputs.length > 0)
      .flatMap<FetchResult<Input, Output>>(inputArray => {
        const inputs = Immutable.Set(inputArray);
        return params.fetch(inputs)
          .map(batch => ({inputs, batch}))
          .flatMapErrors<any>(error => Kefir.constant({inputs, error}));
      })
      .onEnd(() => { /* to activate stream */ });
  }

  query(input: Input): Kefir.Property<Output> {
    this.emitter.emit(input);
    return this.bufferedStream
      .filter(result => result.inputs.has(input))
      .flatMap<Output>(result => {
        if (result.batch) {
          return Kefir.constant(result.batch.get(input));
        } else {
          return Kefir.constantError<any>(result.error);
        }
      }).take(1).takeErrors(1).toProperty();
  }
}
