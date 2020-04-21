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

import * as Immutable from 'immutable';

import * as Rdf from '../core/Rdf';

module xsd {
  /**
   * For XSD namespace considerations see
   * https://www.w3.org/TR/xmlschema-2/#namespaces
   */
  export const _NAMESPACE = 'http://www.w3.org/2001/XMLSchema#';
  export const _DATATYPES_NAMESPACE = 'http://www.w3.org/2001/XMLSchema-datatypes#';
  export const iri = (s: string) => Rdf.iri(_NAMESPACE + s);

  export const _string = iri('string');
  export const langString = iri('langString');
  export const integer = iri('integer');
  export const float = iri('float');
  export const double = iri('double');
  export const boolean = iri('boolean');
  export const date = iri('date');
  export const time = iri('time');
  export const dateTime = iri('dateTime');
  export const decimal = iri('decimal');
  export const anyURI = iri('anyURI');
  export const positiveInteger = iri('positiveInteger');
  export const negativeInteger = iri('negativeInteger');
  export const nonPositiveInteger = iri('nonPositiveInteger');
  export const nonNegativeInteger = iri('nonNegativeInteger');

  export const LIST_TYPES = [
    { value: anyURI.value, label: 'xsd:anyURI' },
    { value: integer.value, label: 'xsd:integer' },
    { value: date.value, label: 'xsd:date' },
    { value: dateTime.value, label: 'xsd:dateTime' },
    { value: _string.value, label: 'xsd:string' },
    { value: langString.value, label: 'xsd:langString' },
    { value: boolean.value, label: 'xsd:boolean' },
    { value: double.value, label: 'xsd:double' },
    { value: decimal.value, label: 'xsd:decimal' },
  ];

  export const NUMERIC_TYPES = Immutable.Set<Rdf.Iri>([
    integer,
    positiveInteger,
    negativeInteger,
    nonPositiveInteger,
    nonNegativeInteger,
    float,
    double,
    decimal,
  ]);
}

export default xsd;
