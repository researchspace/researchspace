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

import { Rdf } from 'platform/api/rdf';

module crmdig {
  const NAMESPACE = 'http://www.ics.forth.gr/isl/CRMdig/';
  const iri = (s: string) => Rdf.iri(NAMESPACE + s);

  export const D9_Data_Object = iri('D9_Data_Object');
  export const D1_Digital_Object = iri('D1_Digital_Object');
  export const D3_Formal_Derivation = iri('D3_Formal_Derivation');
  export const D29_Annotation_Object = iri('D29_Annotation_Object');
  export const D30_Annotation_Event = iri('D30_Annotation_Event');
  export const D35_Area = iri('D35_Area');

  export const L21_used_as_derivation_source = iri('L21_used_as_derivation_source');
  export const L22_created_derivative = iri('L22_created_derivative');
  export const L13_used_parameters = iri('L13_used_parameters');
  export const L43_annotates = iri('L43_annotates');
  export const L48i_was_annotation_created_by = iri('L48i_was_annotation_created_by');
}

export default crmdig;
