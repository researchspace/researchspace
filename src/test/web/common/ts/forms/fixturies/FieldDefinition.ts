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
