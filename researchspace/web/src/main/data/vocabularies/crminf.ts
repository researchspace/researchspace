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

module crminf {
  const NAMESPACE = 'http://www.ics.forth.gr/isl/CRMinf/';
  const iri = (s: string) => Rdf.iri(NAMESPACE + s);

  export const I1_Argumentation = iri('I1_Argumentation');
  export const I2_Belief = iri('I2_Belief');
  export const I4_Proposition_Set = iri('I4_Proposition_Set');
  export const I5_Inference_Making = iri('I5_Inference_Making');
  export const I7_Belief_Adoption = iri('I7_Belief_Adoption');
  export const I3_Inference_Logic = iri('I3_Inference_Logic');

  export const J1_used_as_premise = iri('J1_used_as_premise');
  export const J2_concluded_that = iri('J2_concluded_that');
  export const J3_applies = iri('J3_applies');
  export const J4_that = iri('J4_that');
  export const J5_holds_to_be = iri('J5_holds_to_be');
  export const J6_adopted = iri('J6_adopted');
}

export default crminf;
