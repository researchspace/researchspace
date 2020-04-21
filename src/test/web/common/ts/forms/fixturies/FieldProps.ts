/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { Rdf } from 'platform/api/rdf';

import {
  FieldValue,
  DataState,
  AtomicValueInput,
  AtomicValueInputProps,
  normalizeFieldDefinition,
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
  handler: AtomicValueInput.makeAtomicHandler({ definition, baseInputProps }),
  value: FieldValue.empty,
  dataState: DataState.Ready,
};
