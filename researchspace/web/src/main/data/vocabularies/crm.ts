/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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

module crm {
  const NAMESPACE = 'http://www.cidoc-crm.org/cidoc-crm/';
  const iri = (s: string) => Rdf.iri(NAMESPACE + s);

  export const E31_Document = iri('E31_Document');

  export const P3_has_note = iri('P3_has_note');
  export const P45_consists_of = iri('P45_consists_of');
  export const P14_carried_out_by = iri('P14_carried_out_by');
  export const P4_has_time_span = iri('P4_has_time_span');
  export const P70i_is_documented_in = iri('P70i_is_documented_in');
  export const P82a_begin_of_the_begin = iri('P82a_begin_of_the_begin');
  export const P82a_end_of_the_end = iri('P82a_end_of_the_end');
  export const P138i_has_representation = iri('P138i_has_representation');
}

export default crm;
