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

import { Rdf } from 'platform/api/rdf';

module searchProfile {
  export const _NAMESPACE = 'http://www.metaphacts.com/ontologies/platform/semantic-search-profile/';
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
