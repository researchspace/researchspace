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

module field {
  const NAMESPACE = 'http://www.metaphacts.com/ontology/fields#';
  const iri = (s: string) => Rdf.iri(NAMESPACE + s);

  /**  TYPES **/
  export const Field = iri('Field');

  /**  PROPERTIES **/
  export const insert_pattern = iri('insertPattern');
  export const select_pattern = iri('selectPattern');
  export const delete_pattern = iri('deletePattern');
  export const ask_pattern = iri('askPattern');
  export const category = iri('category');
  export const domain = iri('domain');
  export const xsd_datatype = iri('xsdDatatype');
  export const range = iri('range');
  export const min_occurs = iri('minOccurs');
  export const max_occurs = iri('maxOccurs');
  export const default_value = iri('defaultValue');
  export const valueset_pattern = iri('valueSetPattern');
  export const autosuggestion_pattern = iri('autosuggestionPattern');
  export const tree_patterns = iri('treePatterns');
  export const testsubject = iri('testSubject');
}

export default field;
