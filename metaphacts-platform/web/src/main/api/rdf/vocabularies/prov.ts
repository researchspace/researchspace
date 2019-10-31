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

module prov {
  export const _NAMESPACE = 'http://www.w3.org/ns/prov#';
  export const iri = (s: string) => Rdf.iri(_NAMESPACE + s);

  export const actedOnBehalfOf = iri('actedOnBehalfOf');
  export const Activity = iri('Activity');
  export const activity = iri('activity');
  export const ActivityInfluence = iri('ActivityInfluence');
  export const agent = iri('agent');
  export const Agent = iri('Agent');
  export const AgentInfluence = iri('AgentInfluence');
  export const alternateOf = iri('alternateOf');
  export const aq = iri('aq');
  export const Association = iri('Association');
  export const atLocation = iri('atLocation');
  export const atTime = iri('atTime');
  export const Attribution = iri('Attribution');
  export const Bundle = iri('Bundle');
  export const category = iri('category');
  export const Collection = iri('Collection');
  export const Communication = iri('Communication');
  export const component = iri('component');
  export const constraints = iri('constraints');
  export const definition = iri('definition');
  export const Delegation = iri('Delegation');
  export const Derivation = iri('Derivation');
  export const dm = iri('dm');
  export const editorialNote = iri('editorialNote');
  export const editorsDefinition = iri('editorsDefinition');
  export const EmptyCollection = iri('EmptyCollection');
  export const End = iri('End');
  export const endedAtTime = iri('endedAtTime');
  export const Entity = iri('Entity');
  export const entity = iri('entity');
  export const EntityInfluence = iri('EntityInfluence');
  export const generated = iri('generated');
  export const generatedAtTime = iri('generatedAtTime');
  export const Generation = iri('Generation');
  export const hadActivity = iri('hadActivity');
  export const hadGeneration = iri('hadGeneration');
  export const hadMember = iri('hadMember');
  export const hadPlan = iri('hadPlan');
  export const hadPrimarySource = iri('hadPrimarySource');
  export const hadRole = iri('hadRole');
  export const hadUsage = iri('hadUsage');
  export const Influence = iri('Influence');
  export const influenced = iri('influenced');
  export const influencer = iri('influencer');
  export const InstantaneousEvent = iri('InstantaneousEvent');
  export const invalidated = iri('invalidated');
  export const invalidatedAtTime = iri('invalidatedAtTime');
  export const Invalidation = iri('Invalidation');
  export const inverse = iri('inverse');
  export const Location = iri('Location');
  export const n = iri('n');
  export const order = iri('order');
  export const Organization = iri('Organization');
  export const Person = iri('Person');
  export const Plan = iri('Plan');
  export const PrimarySource = iri('PrimarySource');
  export const qualifiedAssociation = iri('qualifiedAssociation');
  export const qualifiedAttribution = iri('qualifiedAttribution');
  export const qualifiedCommunication = iri('qualifiedCommunication');
  export const qualifiedDelegation = iri('qualifiedDelegation');
  export const qualifiedDerivation = iri('qualifiedDerivation');
  export const qualifiedEnd = iri('qualifiedEnd');
  export const qualifiedForm = iri('qualifiedForm');
  export const qualifiedGeneration = iri('qualifiedGeneration');
  export const qualifiedInfluence = iri('qualifiedInfluence');
  export const qualifiedInvalidation = iri('qualifiedInvalidation');
  export const qualifiedPrimarySource = iri('qualifiedPrimarySource');
  export const qualifiedQuotation = iri('qualifiedQuotation');
  export const qualifiedRevision = iri('qualifiedRevision');
  export const qualifiedStart = iri('qualifiedStart');
  export const qualifiedUsage = iri('qualifiedUsage');
  export const Quotation = iri('Quotation');
  export const Revision = iri('Revision');
  export const Role = iri('Role');
  export const sharesDefinitionWith = iri('sharesDefinitionWith');
  export const SoftwareAgent = iri('SoftwareAgent');
  export const specializationOf = iri('specializationOf');
  export const Start = iri('Start');
  export const startedAtTime = iri('startedAtTime');
  export const todo = iri('todo');
  export const unqualifiedForm = iri('unqualifiedForm');
  export const Usage = iri('Usage');
  export const used = iri('used');
  export const value = iri('value');
  export const wasAssociatedWith = iri('wasAssociatedWith');
  export const wasAttributedTo = iri('wasAttributedTo');
  export const wasDerivedFrom = iri('wasDerivedFrom');
  export const wasEndedBy = iri('wasEndedBy');
  export const wasGeneratedBy = iri('wasGeneratedBy');
  export const wasInfluencedBy = iri('wasInfluencedBy');
  export const wasInformedBy = iri('wasInformedBy');
  export const wasInvalidatedBy = iri('wasInvalidatedBy');
  export const wasQuotedFrom = iri('wasQuotedFrom');
  export const wasRevisionOf = iri('wasRevisionOf');
  export const wasStartedBy = iri('wasStartedBy');
}

export default prov;
