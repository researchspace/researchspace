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

import { Rdf } from 'platform/api/rdf';

import {
  FieldValue, DataState, AtomicValueInput, AtomicValueInputProps, normalizeFieldDefinition,
} from 'platform/components/forms';

const DATATYPE = Rdf.iri('http://www.w3.org/2001/XMLSchema-datatypes#string');

const definition = normalizeFieldDefinition({
  id: 'test1',
  label: 'labelProp',
  description: 'test description',
  xsdDatatype: DATATYPE,
  minOccurs: 1,
  maxOccurs: 1,
  selectPattern: '',
});

const baseInputProps: AtomicValueInputProps = {
  for: 'test1',
};

export const PROPS: AtomicValueInputProps = {
  ...baseInputProps,
  definition,
  handler: AtomicValueInput.makeAtomicHandler({definition, baseInputProps}),
  value: FieldValue.empty,
  dataState: DataState.Ready,
};
