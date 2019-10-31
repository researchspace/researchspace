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

import { Rdf, vocabularies } from 'platform/api/rdf';

export const VALUE_TYPES = vocabularies.xsd.LIST_TYPES;

export interface Template {
  readonly templateType: Rdf.Iri;
  readonly identifier: string;
  readonly label: string;
  readonly description: string;
  readonly categories: ReadonlyArray<Rdf.Iri>;
  readonly args: ReadonlyArray<Argument>;
}

export interface Argument {
  readonly label: string;
  readonly variable: string;
  readonly comment: string;
  readonly valueType: string;
  readonly defaultValue?: Rdf.Node;
  readonly optional: boolean;
}

export interface Value {
  readonly value: string;
  readonly error?: Error;
}
