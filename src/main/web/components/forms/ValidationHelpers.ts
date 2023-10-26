/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
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

import { FieldDefinition } from './FieldDefinition';

/**
 * ASK query that can be used together with input that support drop to check if resource can be accepted by the input.
 */
export function createDropAskQueryForField(field: FieldDefinition): string {
  if (field.constraints.length === 1) {
    return field.constraints[0].validatePattern;
  } else if (!field.range) {
    // if no range is defined then we just use ASK query that always succeeds.
    return 'ASK {}';
  } else if (field.range.length === 1) {
    // if only one range then check if value is of type range or any of it's sub-classes.
    return `
ASK {
?value rdf:type/rdfs:subClassOf* <${field.range[0].value}> .
}
`;
  } else {
    // for many ranges value should have type that is in the list
    const ranges = field.range.map(r => `<${r.value}>`).join(', ');
    return `
ASK {
?value rdf:type/rdfs:subClassOf* ?range .
FILTER( ?range IN (${ranges})) .
}
`;
  }
}
