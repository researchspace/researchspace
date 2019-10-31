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

import * as Basil from 'basil.js';
import * as Immutable from 'immutable';

import { serialize, deserialize } from 'platform/api/json';

const UNSUPPORTED_MSG = 'Local storage is not available. Data will be persisted to memory.';

/**
 * Wrapper around client-side persistence layer using basil.js.
 * Takes care of calling custom serialize and deserialize methods
 * when storing and retrieving data from the persistence layer.
 * Custom (de)serialization methods take in particular
 * care of proper (de)serialization  of immutable structures.
 *
 * Tries to use local storage by default and memory storage otherwise.
 */
class BrowserPersistenceClass {
  private storage: any;
  private readonly anyAdapter: PersistenceAdapter<any>;

  constructor() {
    this.storage = new Basil({
      storages: ['local', 'memory'],
    });

    // if LocalStorage not available - show warning
    if (!this.storage.check('local')) {
      console.warn(UNSUPPORTED_MSG);
    }

    this.anyAdapter = this.createAdapter();
  }

  private createAdapter(): PersistenceAdapter<any> {
    const get = (identifier: string): any => {
      const item = this.getRawItem(identifier);
      return (typeof item === 'object' && item !== null) ? item : {};
    };
    const set = (identifier: string, newState: any) => {
      this.setItem(identifier, newState);
    };
    const update = (identifier: string, partialState: any) => {
      set(identifier, {...get(identifier), ...partialState});
    };
    const remove = (identifier: string) => {
      this.removeItem(identifier);
    };
    return {get, set, update, remove};
  }

  /**
   * Retrieves any entry from the persistence layer as idenfified by the composite key
   * of the supplied namespace and identifier.
   *
   * Calls custom deserialize method before parsing back to JSON object.
   *
   * @param identifier - Identifier of the entry in the persistence layer. Must be unqiue
   *                     within the supplied namespace or globally if no namespace is supplied.
   * @param namespace - Optional namespace to prefix the identifier in the persistence layer.
   *                    If namespace is provided it will be used as composite
   *                    key in the persistence layer together with the identifier.
   * @returns Any object as being persisted and deserialized.
   *                     Object will be wrapped into immutable strucures.
   */
  public getItem(identifier: string, namespace?: string): any {
    return Immutable.fromJS(this.getRawItem(identifier, namespace));
  }

  private getRawItem(identifier: string, namespace?: string): any {
    const value = this.storage.get(identifier, {namespace});
    return deserialize(JSON.parse(value));
  }

  /**
   * Stores any supplied object into the persistence layer (possibly overwritting existing entry)
   * using a composition of the supplied namespace and identifier as key.
   *
   * Calls custom serialize method before object will be stringified.
   *
   * @param identifier - Identifier of the entry in the persistence layer to be set. Must be unqiue
   *                     within the supplied namespace or globally if no namespace is supplied.
   * @param value - any object to be persisted
   * @param namespace - Optional namespace to prefix the identifier in the persistence layer.
   *                    If namespace is provided it will be used as composite
   *                    key in the persistence layer together with the identifier.
   */
  public setItem(identifier: string, value: any, namespace?: string): void {
    this.storage.set(identifier, JSON.stringify(serialize(value)), { namespace });
  }

  /**
   * Removes any existing entry from the persistence layer as idenfified by the composite key
   * of the supplied namespace and identifier.
   *
   * @param identifier - Identifier of the entry in the persistence layer to be deleted.
   *                     Must be unqiue within the supplied namespace or globally
   *                     if no namespace is supplied.
   * @param namespace - Optional namespace to prefix the identifier in the persistence layer.
   *                    If namespace is provided it will be used as composite
   *                    key in the persistence layer together with the identifier.
   */
  public removeItem(identifier: string, namespace?: string): void {
    this.storage.remove(identifier, { namespace });
  }

  adapter<State>(): PersistenceAdapter<State> {
    return this.anyAdapter;
  }
}

// TODO: uncomment type constraint when 'object' would be available
export interface PersistenceAdapter<State /* extends object */> {
  get(identifier: string): State;
  set(identifier: string, newState: State): void;
  update(identifier: string, partialState: State): void;
  remove(identifier: string): void;
}

export const BrowserPersistence = new BrowserPersistenceClass();
