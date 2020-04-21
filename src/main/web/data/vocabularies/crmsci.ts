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

module crmsci {
  const NAMESPACE = 'http://www.ics.forth.gr/isl/CRMsci/';
  const iri = (s: string) => Rdf.iri(NAMESPACE + s);

  export const S4_Observation = iri('S4_Observation');
  export const S19_Encounter_Event = iri('S19_Encounter_Event');

  export const O8_observed = iri('O8_observed');
  export const O19_has_found_object = iri('O19_has_found_object');
  export const O21_has_found_at = iri('O21_has_found_at');
}

export default crmsci;
