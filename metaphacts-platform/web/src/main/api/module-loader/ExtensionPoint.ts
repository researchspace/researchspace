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

import { Cancellation } from 'platform/api/async';

export class ExtensionPoint<T> {
  private loaded = false;
  private value: T | undefined;
  private error: any;
  // intialize with no-op loader
  private loader: () => Kefir.Stream<T> = () => Kefir.later(0, undefined);
  private loadingExtension: Kefir.Stream<T>;

  constructor() {}

  isLoading(): boolean {
    return !this.loaded;
  }

  get(): T | undefined {
    if (!this.loaded) {
      throw new Error('Extension must be loaded before calling ExtensionPoint.get()');
    } else if (this.error) {
      throw this.error;
    }
    return this.value;
  }

  load(): Kefir.Stream<T> {
    if (this.value) {
      return Kefir.never();
    } if (this.loadingExtension) {
      return this.loadingExtension;
    } else {
      const {loader} = this;
      this.loadingExtension = loader()
        .flatMap(newValue => {
          if (this.loader === loader) {
            this.loaded = true;
            this.value = newValue;
            return Kefir.constant(newValue);
          } else {
            // load again if loader was changed in the middle of loading
            return this.load();
          }
        })
        .mapErrors(error => {
          this.loaded = true;
          this.error = error;
          console.error(error);
          return error;
        });
      return this.loadingExtension;
    }
  }

  loadAndUpdate(component: { forceUpdate(): void }, cancellation: Cancellation) {
    const updateWhenLoaded = () => component.forceUpdate();
    cancellation.map(this.load()).observe({
      value: updateWhenLoaded,
      error: updateWhenLoaded,
    });
  }

  chainLoader(loader: (previous: T | undefined) => Kefir.Stream<T>) {
    const previousValue = this.value;
    const previousLoader = this.loader;
    this.loader = () => {
      return (
        previousValue ? loader(previousValue) :
        previousLoader().flatMap(loader)
      );
    };
    this.loaded = false;
    this.value = undefined;
    this.error = undefined;
    this.loadingExtension = undefined;
  }
}
