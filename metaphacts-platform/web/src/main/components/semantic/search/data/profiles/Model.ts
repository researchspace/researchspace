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

import { OrderedMap, Map } from 'immutable';

import { Rdf } from 'platform/api/rdf';
import { Resource } from '../Common';

export interface Category extends Resource {
  readonly thumbnail?: string
  readonly color?: string;
}
export type Categories = OrderedMap<Rdf.Iri, Category>;
export interface Relation extends Resource {
  readonly hasRange: Category
  readonly hasDomain: Category
  available?: boolean
  hashCode: () => number
  equals: (other: Relation) => boolean
}
export type Relations = OrderedMap<RelationKey.Key, Relation>;

export interface Profile extends Resource {
  readonly categories: Categories
  readonly relations: Relations
}
export type Profiles = Map<Rdf.Iri, Profile>;

export module RelationKey {
  export interface Value {
    iri: Rdf.Iri;
    domain: Rdf.Iri;
    range: Rdf.Iri;
  }

  export class Key {
    constructor(private _value: Value) {}

    get value() {
      return this._value;
    }

    public equals(other: Key) {
      return (
        this.value.iri.equals(other.value.iri) &&
        this.value.domain.equals(other.value.domain) &&
        this.value.range.equals(other.value.range)
      );
    }

    public hashCode() {
      let hash = 0;
      hash = 31 * hash + this.value.iri.hashCode();
      hash = 31 * hash + this.value.domain.hashCode();
      hash = 31 * hash + this.value.range.hashCode();
      return Rdf.smi(hash);
    }
  }

  export function key(value: Value) {
    return new Key(value);
  }
}

export type AvailableDomains = Map<Rdf.Iri, string>;
