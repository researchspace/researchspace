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

package com.metaphacts.vocabulary;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

/**
 * W3C Linked Data Platform (LDP).
 * <p>
 * This ontology provides an informal representation of the concepts and
 * terms as defined in the LDP specification. Consult the LDP
 * specification for normative reference..
 * <p>
 * Namespace ldp.
 * Prefix: {@code <http://www.w3.org/ns/ldp#>}
 *
 * @see <a href="http://www.w3.org/2012/ldp">http://www.w3.org/2012/ldp</a>
 * @see <a href="http://www.w3.org/TR/ldp-ucr/">http://www.w3.org/TR/ldp-ucr/</a>
 * @see <a href="http://www.w3.org/TR/ldp/">http://www.w3.org/TR/ldp/</a>
 * @see <a href="http://www.w3.org/TR/ldp-paging/">http://www.w3.org/TR/ldp-paging/</a>
 * @see <a href="http://www.w3.org/2011/09/LinkedData/">http://www.w3.org/2011/09/LinkedData/</a>
 * 
 * @author ArtemKozlov <ak@metaphacts.com>
 */
public class LDP {

	/** {@code http://www.w3.org/ns/ldp#} **/
	public static final String NAMESPACE = "http://www.w3.org/ns/ldp#";

	/** {@code ldp} **/
	public static final String PREFIX = "ldp";

	/**
	 * Ascending
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#Ascending}.
	 * <p>
	 * Ascending order.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#Ascending">Ascending</a>
	 */
	public static final IRI Ascending;

	/**
	 * BasicContainer
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#BasicContainer}.
	 * <p>
	 * An LDPC that uses a predefined predicate to simply link to its
	 * contained resources.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#BasicContainer">BasicContainer</a>
	 */
	public static final IRI BasicContainer;

	/**
	 * constrainedBy
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#constrainedBy}.
	 * <p>
	 * Links a resource with constraints that the server requires requests
	 * like creation and update to conform to.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#constrainedBy">constrainedBy</a>
	 */
	public static final IRI constrainedBy;

	/**
	 * Container
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#Container}.
	 * <p>
	 * A Linked Data Platform RDF Source (LDP-RS) that also conforms to
	 * additional patterns and conventions for managing membership. Readers
	 * should refer to the specification defining this ontology for the list
	 * of behaviors associated with it.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#Container">Container</a>
	 */
	public static final IRI Container;

	/**
	 * contains
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#contains}.
	 * <p>
	 * Links a container with resources created through the container.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#contains">contains</a>
	 */
	public static final IRI contains;

	/**
	 * Descending
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#Descending}.
	 * <p>
	 * Descending order.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#Descending">Descending</a>
	 */
	public static final IRI Descending;

	/**
	 * DirectContainer
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#DirectContainer}.
	 * <p>
	 * An LDPC that is similar to a LDP-DC but it allows an indirection with
	 * the ability to list as member a resource, such as a URI representing a
	 * real-world object, that is different from the resource that is
	 * created.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#DirectContainer">DirectContainer</a>
	 */
	public static final IRI DirectContainer;

	/**
	 * hasMemberRelation
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#hasMemberRelation}.
	 * <p>
	 * Indicates which predicate is used in membership triples, and that the
	 * membership triple pattern is < membership-constant-URI ,
	 * object-of-hasMemberRelation, member-URI >.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#hasMemberRelation">hasMemberRelation</a>
	 */
	public static final IRI hasMemberRelation;

	/**
	 * IndirectContainer
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#IndirectContainer}.
	 * <p>
	 * An LDPC that has the flexibility of choosing what form the membership
	 * triples take.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#IndirectContainer">IndirectContainer</a>
	 */
	public static final IRI IndirectContainer;

	/**
	 * insertedContentRelation
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#insertedContentRelation}.
	 * <p>
	 * Indicates which triple in a creation request should be used as the
	 * member-URI value in the membership triple added when the creation
	 * request is successful.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#insertedContentRelation">insertedContentRelation</a>
	 */
	public static final IRI insertedContentRelation;

	/**
	 * isMemmberOfRelation
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#isMemberOfRelation}.
	 * <p>
	 * Indicates which predicate is used in membership triples, and that the
	 * membership triple pattern is < member-URI ,
	 * object-of-isMemberOfRelation, membership-constant-URI >.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#isMemberOfRelation">isMemberOfRelation</a>
	 */
	public static final IRI isMemberOfRelation;

	/**
	 * member
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#member}.
	 * <p>
	 * LDP servers should use this predicate as the membership predicate if
	 * there is no obvious predicate from an application vocabulary to use.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#member">member</a>
	 */
	public static final IRI member;

	/**
	 * membershipResource
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#membershipResource}.
	 * <p>
	 * Indicates the membership-constant-URI in a membership triple.
	 * Depending upon the membership triple pattern a container uses, as
	 * indicated by the presence of ldp:hasMemberRelation or
	 * ldp:isMemberOfRelation, the membership-constant-URI might occupy
	 * either the subject or object position in membership triples.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#membershipResource">membershipResource</a>
	 */
	public static final IRI membershipResource;

	/**
	 * MemberSubject
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#MemberSubject}.
	 * <p>
	 * Used to indicate default and typical behavior for
	 * ldp:insertedContentRelation, where the member-URI value in the
	 * membership triple added when a creation request is successful is the
	 * URI assigned to the newly created resource.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#MemberSubject">MemberSubject</a>
	 */
	public static final IRI MemberSubject;

	/**
	 * NonRDFSource
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#NonRDFSource}.
	 * <p>
	 * A Linked Data Platform Resource (LDPR) whose state is NOT represented
	 * as RDF.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#NonRDFSource">NonRDFSource</a>
	 */
	public static final IRI NonRDFSource;

	/**
	 * Page
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#Page}.
	 * <p>
	 * URI signifying that the resource is an in-sequence page resource, as
	 * defined by LDP Paging. Typically used on Link rel='type' response
	 * headers.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#Page">Page</a>
	 */
	public static final IRI Page;

	/**
	 * Page
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#pageSequence}.
	 * <p>
	 * Link to a page sequence resource, as defined by LDP Paging. Typically
	 * used to communicate the sorting criteria used to allocate LDPC members
	 * to pages.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#pageSequence">pageSequence</a>
	 */
	public static final IRI pageSequence;

	/**
	 * pageSortCollation
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#pageSortCollation}.
	 * <p>
	 * The collation used to order the members across pages in a page
	 * sequence when comparing strings.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#pageSortCollation">pageSortCollation</a>
	 */
	public static final IRI pageSortCollation;

	/**
	 * pageSortCriteria
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#pageSortCriteria}.
	 * <p>
	 * Link to the list of sorting criteria used by the server in a
	 * representation. Typically used on Link response headers as an
	 * extension link relation URI in the rel= parameter.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#pageSortCriteria">pageSortCriteria</a>
	 */
	public static final IRI pageSortCriteria;

	/**
	 * PageSortCriterion
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#PageSortCriterion}.
	 * <p>
	 * Element in the list of sorting criteria used by the server to assign
	 * container members to pages.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#PageSortCriterion">PageSortCriterion</a>
	 */
	public static final IRI PageSortCriterion;

	/**
	 * pageSortOrder
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#pageSortOrder}.
	 * <p>
	 * The ascending/descending/etc order used to order the members across
	 * pages in a page sequence.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#pageSortOrder">pageSortOrder</a>
	 */
	public static final IRI pageSortOrder;

	/**
	 * pageSortPredicate
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#pageSortPredicate}.
	 * <p>
	 * Predicate used to specify the order of the members across a page
	 * sequence's in-sequence page resources; it asserts nothing about the
	 * order of members in the representation of a single page.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#pageSortPredicate">pageSortPredicate</a>
	 */
	public static final IRI pageSortPredicate;

	/**
	 * PreferContainment
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#PreferContainment}.
	 * <p>
	 * URI identifying a LDPC's containment triples, for example to allow
	 * clients to express interest in receiving them.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#PreferContainment">PreferContainment</a>
	 */
	public static final IRI PreferContainment;

	/**
	 * PreferEmptyContainer
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#PreferEmptyContainer}.
	 * <p>
	 * Archaic alias for ldp:PreferMinimalContainer
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#PreferEmptyContainer">PreferEmptyContainer</a>
	 */
	public static final IRI PreferEmptyContainer;

	/**
	 * PreferMembership
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#PreferMembership}.
	 * <p>
	 * URI identifying a LDPC's membership triples, for example to allow
	 * clients to express interest in receiving them.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#PreferMembership">PreferMembership</a>
	 */
	public static final IRI PreferMembership;

	/**
	 * PreferMinimalContainer
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#PreferMinimalContainer}.
	 * <p>
	 * URI identifying the subset of a LDPC's triples present in an empty
	 * LDPC, for example to allow clients to express interest in receiving
	 * them. Currently this excludes containment and membership triples, but
	 * in the future other exclusions might be added. This definition is
	 * written to automatically exclude those new classes of triples.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#PreferMinimalContainer">PreferMinimalContainer</a>
	 */
	public static final IRI PreferMinimalContainer;

	/**
	 * RDFSource
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#RDFSource}.
	 * <p>
	 * A Linked Data Platform Resource (LDPR) whose state is represented as
	 * RDF.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#RDFSource">RDFSource</a>
	 */
	public static final IRI RDFSource;

	/**
	 * Resource
	 * <p>
	 * {@code http://www.w3.org/ns/ldp#Resource}.
	 * <p>
	 * A HTTP-addressable resource whose lifecycle is managed by a LDP
	 * server.
	 *
	 * @see <a href="http://www.w3.org/ns/ldp#Resource">Resource</a>
	 */
	public static final IRI Resource;

	static {
		ValueFactory factory = SimpleValueFactory.getInstance();

		Ascending = factory.createIRI(LDP.NAMESPACE, "Ascending");
		BasicContainer = factory.createIRI(LDP.NAMESPACE, "BasicContainer");
		constrainedBy = factory.createIRI(LDP.NAMESPACE, "constrainedBy");
		Container = factory.createIRI(LDP.NAMESPACE, "Container");
		contains = factory.createIRI(LDP.NAMESPACE, "contains");
		Descending = factory.createIRI(LDP.NAMESPACE, "Descending");
		DirectContainer = factory.createIRI(LDP.NAMESPACE, "DirectContainer");
		hasMemberRelation = factory.createIRI(LDP.NAMESPACE, "hasMemberRelation");
		IndirectContainer = factory.createIRI(LDP.NAMESPACE, "IndirectContainer");
		insertedContentRelation = factory.createIRI(LDP.NAMESPACE, "insertedContentRelation");
		isMemberOfRelation = factory.createIRI(LDP.NAMESPACE, "isMemberOfRelation");
		member = factory.createIRI(LDP.NAMESPACE, "member");
		membershipResource = factory.createIRI(LDP.NAMESPACE, "membershipResource");
		MemberSubject = factory.createIRI(LDP.NAMESPACE, "MemberSubject");
		NonRDFSource = factory.createIRI(LDP.NAMESPACE, "NonRDFSource");
		Page = factory.createIRI(LDP.NAMESPACE, "Page");
		pageSequence = factory.createIRI(LDP.NAMESPACE, "pageSequence");
		pageSortCollation = factory.createIRI(LDP.NAMESPACE, "pageSortCollation");
		pageSortCriteria = factory.createIRI(LDP.NAMESPACE, "pageSortCriteria");
		PageSortCriterion = factory.createIRI(LDP.NAMESPACE, "PageSortCriterion");
		pageSortOrder = factory.createIRI(LDP.NAMESPACE, "pageSortOrder");
		pageSortPredicate = factory.createIRI(LDP.NAMESPACE, "pageSortPredicate");
		PreferContainment = factory.createIRI(LDP.NAMESPACE, "PreferContainment");
		PreferEmptyContainer = factory.createIRI(LDP.NAMESPACE, "PreferEmptyContainer");
		PreferMembership = factory.createIRI(LDP.NAMESPACE, "PreferMembership");
		PreferMinimalContainer = factory.createIRI(LDP.NAMESPACE, "PreferMinimalContainer");
		RDFSource = factory.createIRI(LDP.NAMESPACE, "RDFSource");
		Resource = factory.createIRI(LDP.NAMESPACE, "Resource");
	}

	private LDP() {
		//static access only
	}

}