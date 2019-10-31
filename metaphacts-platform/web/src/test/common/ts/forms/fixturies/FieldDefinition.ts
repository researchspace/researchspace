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

import { FieldDefinitionProp } from 'platform/components/forms';

export const FIELD_DEFINITION: FieldDefinitionProp = {
  id: 'test',
  label: 'label value',
  description: 'description value',
  xsdDatatype: 'test',
  minOccurs: 1,
  maxOccurs: 2,
  selectPattern: '',
  constraints: [
    {
      validatePattern: 'ASK { ?s ?p ?o }',
      message: 'test',
    },
    {
      message: 'Value does not pass the SPARQL ASK test.',
      validatePattern: 'ASK { BIND(false as ?b). FILTER(?b=true)}',
    },
  ],
  categories: [],
  valueSetPattern: '',
  autosuggestionPattern: 'SELECT * WHERE { ?s ?p ?o }',
};

export const FIELD_DEFINITION_CARDINATILIY: FieldDefinitionProp = {
  id: 'test',
  maxOccurs: 'unbound',
};
