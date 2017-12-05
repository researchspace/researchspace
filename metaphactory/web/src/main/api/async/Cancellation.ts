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

import * as Kefir from 'kefir';
import * as Immutable from 'immutable';

/**
 * Utility object to propagate Kefir.Observable deactivation (cancellation).
 *
 * @example
 *
 * const cancellation = new Cancellation();
 *
 * const taskA = cancellation.map(query(...))
 *  .onValue(value => { [only called if not cancelled] });
 * const taskB = cancellation.map(query(...));
 *
 * const subCancellation = cancellation.derive();
 * const taskC = subCancellation.map(query(...));
 * // ends taskC observable
 * subCancellation.cancelAll();
 *
 * // ends all mapped observables (taskA, taskB, taskC)
 * cancellation.cancelAll();
 *
 * @author Alexey Morozov
 */
export class Cancellation {
  static readonly cancelled = new Cancellation();

  private isCancelled = false;
  private cancelHandlers: Array<() => void> = [];

  /**
   * Wraps observable as another which produces the same values and errors,
   * unsibscribes from source and ends when .cancelAll() invoked.
   */
  map<T>(observable: Kefir.Observable<T>): Kefir.Property<T> {
    if (this.isCancelled) {
      return Kefir.never<T>().toProperty();
    }
    const {observable: mapped, dispose} = subscribe(observable);
    this.onCancel(dispose);
    return mapped.toProperty();
  }

  /**
   * Creates derived Cancellation which becomes cancelled when parent is cancelled.
   */
  derive(): Cancellation {
    const derived = new Cancellation();
    if (!this.isCancelled) {
      this.onCancel(() => derived.cancelAll());
    }
    return derived;
  }

  /**
   * Convenient method to cancel token and replace it with a newly derived one.
   */
  deriveAndCancel(previous: Cancellation): Cancellation {
    previous.cancelAll();
    return this.derive();
  }

  /**
   * Register handler which is invoked when this Cancellation
   * becomes cancelled or if it was already cancelled.
   */
  onCancel(handler: () => void) {
    if (this.isCancelled) {
      handler();
    } else {
      this.cancelHandlers.push(handler);
    }
  }

  /**
   * Makes this Cancellation cancelled and ends all wrapped observables.
   */
  cancelAll() {
    if (this.isCancelled) { return; }
    this.isCancelled = true;
    for (const onCancel of this.cancelHandlers) {
      onCancel();
    }
    this.cancelHandlers = undefined;
  }

  /**
   * Create Cache with its requests would be cancelled when
   * this Cancellation becomes cancelled.
   */
  cache<Input, Output>(
    update: (input: Input, cancellation: Cancellation) => Kefir.Observable<Output>,
    shouldUpdate?: (input: Input, lastInput: Input) => boolean
  ) {
    return new Cache<Input, Output>(update, this, shouldUpdate);
  }
}

function subscribe<T>(source: Kefir.Observable<T>): {
  observable: Kefir.Stream<T>;
  dispose: () => void;
} {
  if (!source) { throw new Error('source observable must be present'); }

  let disposed = false;
  let subscription: Kefir.Subscription;
  const dispose = () => {
    if (disposed) { return; }
    disposed = true;
    if (subscription) {
      subscription.unsubscribe();
    }
  };

  const observable = Kefir.stream<T>(emitter => {
    if (disposed) {
      emitter.end();
    } else {
      subscription = source.observe({
        value: value => emitter.emit(value),
        error: error => emitter.error(error),
        end: () => emitter.end(),
      });
    }
    return dispose;
  });

  return {observable, dispose};
}

Cancellation.cancelled.cancelAll();

/**
 * One element cache with cancellation for Kefir.Observable.
 *
 * @example
 *
 * const cache = new Cache(text => searchFor(text));
 *
 * cache.compute("foo").onValue(...);
 *
 * // previous request will be cancelled if it isn't finished yet
 * cache.compute("bar").onValue(...);
 *
 * // produces Kefir.never() because "bar" === "bar"
 * cache.compute("bar");
 *
 * // current request will be cancelled, if any
 * cache.cancel();
 */
export class Cache<Input, Output> {
  private hasLastInput = false;
  private lastInput: Input;

  private _cancellation: Cancellation;
  get cancellation() { return this._cancellation; }

  constructor(
    private update: (input: Input, cancellation: Cancellation) => Kefir.Observable<Output>,
    private parentCancellation?: Cancellation,
    private shouldUpdate?: (input: Input, lastInput: Input) => boolean
  ) {
    this._cancellation = this.createCancellation();
    if (!this.shouldUpdate) {
      this.shouldUpdate = (input, last) => !Immutable.is(input, last);
    }
  }

  private createCancellation() {
    return this.parentCancellation
      ? this.parentCancellation.derive() : new Cancellation();
  }

  compute(input: Input, force = false): Kefir.Property<Output> {
    if (!this.hasLastInput || this.shouldUpdate(input, this.lastInput) || force) {
      this._cancellation.cancelAll();
      this._cancellation = this.createCancellation();
      this._cancellation.onCancel(() => {
        this.lastInput = undefined;
        this.hasLastInput = false;
      });

      this.hasLastInput = true;
      this.lastInput = input;
      const observable = this.update(input, this.cancellation);
      return this.cancellation.map(observable);
    } else {
      this.lastInput = input;
      return Kefir.never<Output>().toProperty();
    }
  }

  cancel() {
    this.cancellation.cancelAll();
  }
}
