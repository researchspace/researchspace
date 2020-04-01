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
import { CancellationToken } from 'ontodia';

import { Cancellation as PlatformCancellation } from 'platform/api/async';

export function observableToCancellablePromise<T>(
  observable: Kefir.Observable<T>,
  ct: CancellationToken
): Promise<T> {
  if (ct.aborted) {
    return Promise.reject(makeCancelledError());
  }
  return new Promise<T>((resolve, reject) => {
    let resolved = false;
    let observableSubscription: Kefir.Subscription | undefined;
    let tokenSubscription: (() => void) | undefined;

    const markResolvedAndCleanup = () => {
      if (resolved) { return; }
      resolved = true;
      if (observableSubscription) {
        observableSubscription.unsubscribe();
      }
      if (tokenSubscription) {
        ct.removeEventListener('abort', tokenSubscription);
      }
    };

    observableSubscription = observable.observe({
      value: value => {
        if (resolved) { return; }
        markResolvedAndCleanup();
        if (ct.aborted) {
          reject(makeCancelledError());
          return;
        }
        resolve(value);
      },
      error: error => {
        if (resolved) { return; }
        markResolvedAndCleanup();
        if (ct.aborted) {
          reject(makeCancelledError());
          return;
        }
        reject(error);
      },
      end: () => {
        if (resolved) { return; }
        markResolvedAndCleanup();
        reject(new Error('Observable ended without producing a value or an error'));
      }
    });

    if (!resolved) {
      if (ct.aborted) {
        markResolvedAndCleanup();
      } else {
        tokenSubscription = () => markResolvedAndCleanup();
        ct.addEventListener('abort', tokenSubscription);
      }
    }
  });
}

function makeCancelledError() {
  return new Error('The operation was cancelled');
}

export function deriveCancellationToken(cancellation: PlatformCancellation): CancellationToken {
  return {
    get aborted() {
      return cancellation.aborted;
    },
    addEventListener: (event: 'abort', handler) => {
      cancellation.onCancel(handler);
    },
    removeEventListener: (event: 'abort', handler) => {
      cancellation.offCancel(handler);
    },
  };
}
