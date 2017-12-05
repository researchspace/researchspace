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

import { OrderedMap, Map } from 'immutable';

import { Rdf } from 'platform/api/rdf';
import { Resource } from '../Common';

export interface Category extends Resource {
  readonly thumbnail?: string
}
export type Categories = OrderedMap<Rdf.Iri, Category>;
export interface Relation extends Resource {
  readonly hasRange: Category
  readonly hasDomain: Category
  available?: boolean
  hashCode: () => number
  equals: (other: Relation) => boolean
}
export type Relations = OrderedMap<Rdf.Iri, Relation>;

export interface Profile extends Resource {
  readonly categories: Categories
  readonly relations: Relations
}
export type Profiles = Map<Rdf.Iri, Profile>;
