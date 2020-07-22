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

import { Rdf } from 'platform/api/rdf';

module searchProfile {
  export const _NAMESPACE = 'http://www.researchspace.org/resource/system/semantic-search-profile/';
  export const iri = (s: string) => Rdf.iri(_NAMESPACE + s);

  export const Profile = iri('Profile');
  export const ProfileContainer = iri('Profile.Container');

  export const hasDomain = iri('hasDomain');
  export const hasRange = iri('hasRange');

  export const hasRelation = iri('hasRelation');
  export const relation = iri('relation');
  export const hasCategory = iri('hasCategory');
  export const category = iri('category');
  export const order = iri('order');
}

export default searchProfile;
