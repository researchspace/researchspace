/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as Kefir from 'kefir';

import { Rdf } from 'platform/api/rdf';
import { getFieldDefinitionProp } from 'platform/api/services/ldp-field';

import { ArgumentsFieldDefinition } from './ArgumentsApi';

export function getArgumentsFieldDefinition(iri: Rdf.Iri): Kefir.Property<ArgumentsFieldDefinition> {
  return getFieldDefinitionProp(iri).map((field) => {
    const argumentsField = field as ArgumentsFieldDefinition;
    argumentsField.iri = argumentsField.id;
    argumentsField.id = 'field';
    return argumentsField;
  });
}
