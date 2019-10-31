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

module ldp {
  export const _NAMESPACE = 'http://www.w3.org/ns/ldp#';
  export const iri = (s: string) => Rdf.iri(_NAMESPACE + s);

  export const Ascending = iri('Ascending');
  export const BasicContainer = iri('BasicContainer');
  export const constrainedBy = iri('constrainedBy');
  export const Container = iri('Container');
  export const contains = iri('contains');
  export const Descending = iri('Descending');
  export const DirectContainer = iri('DirectContainer');
  export const hasMemberRelation = iri('hasMemberRelation');
  export const IndirectContainer = iri('IndirectContainer');
  export const insertedContentRelation = iri('insertedContentRelation');
  export const isMemberOfRelation = iri('isMemberOfRelation');
  export const member = iri('member');
  export const membershipResource = iri('membershipResource');
  export const MemberSubject = iri('MemberSubject');
  export const NonRDFSource = iri('NonRDFSource');
  export const Page = iri('Page');
  export const pageSequence = iri('pageSequence');
  export const pageSortCollation = iri('pageSortCollation');
  export const pageSortCriteria = iri('pageSortCriteria');
  export const PageSortCriterion = iri('PageSortCriterion');
  export const pageSortOrder = iri('pageSortOrder');
  export const pageSortPredicate = iri('pageSortPredicate');
  export const PreferContainment = iri('PreferContainment');
  export const PreferEmptyContainer = iri('PreferEmptyContainer');
  export const PreferMembership = iri('PreferMembership');
  export const PreferMinimalContainer = iri('PreferMinimalContainer');
  export const RDFSource = iri('RDFSource');
  export const Resource = iri('Resource');
}

export default ldp;
