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

import * as Rdf from '../core/Rdf';

module xsd {
  /**
   * For XSD namespace considerations see
   * https://www.w3.org/TR/xmlschema-2/#namespaces
   */
  export const _NAMESPACE = 'http://www.w3.org/2001/XMLSchema#';
  export const _DATATYPES_NAMESPACE =
    'http://www.w3.org/2001/XMLSchema-datatypes#';
  export const iri = (s: string) => Rdf.iri(_NAMESPACE + s);

  export const _string = iri('string');
  export const langString = iri('langString');
  export const integer = iri('integer');
  export const double = iri('double');
  export const boolean = iri('boolean');
  export const date = iri('date');
  export const time = iri('time');
  export const dateTime = iri('dateTime');
  export const decimal = iri('decimal');
  export const anyURI = iri('anyURI');
  export const nonNegativeInteger = iri('nonNegativeInteger');

  export const LIST_TYPES = [
    { value: anyURI.value, label: 'xsd:anyURI' },
    { value: integer.value, label: 'xsd:integer' },
    { value: date.value, label: 'xsd:date' },
    { value: dateTime.value, label: 'xsd:dateTime'},
    { value: _string.value, label: 'xsd:string'},
    { value: langString.value, label: 'xsd:langString'},
    { value: boolean.value, label: 'xsd:boolean'},
    { value: double.value, label: 'xsd:double'},
    { value: decimal.value, label: 'xsd:decimal'},
  ];
}

export default xsd;
