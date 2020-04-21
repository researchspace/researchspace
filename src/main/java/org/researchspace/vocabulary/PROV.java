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

package org.researchspace.vocabulary;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

/**
 * Namespace PROV. Prefix: {@code <http://www.w3.org/ns/prov#>}
 *
 * @author ArtemKozlov <ak@metaphacts.com>
 */
public class PROV {

    /** {@code http://www.w3.org/ns/prov#} **/
    public static final String NAMESPACE = "http://www.w3.org/ns/prov#";

    /** {@code prov} **/
    public static final String PREFIX = "prov";

    /**
     * actedOnBehalfOf
     * <p>
     * {@code http://www.w3.org/ns/prov#actedOnBehalfOf}.
     * <p>
     * An object property to express the accountability of an agent towards another
     * agent. The subordinate agent acted on behalf of the responsible agent in an
     * actual activity.
     *
     * @see <a href="http://www.w3.org/ns/prov#actedOnBehalfOf">actedOnBehalfOf</a>
     */
    public static final IRI actedOnBehalfOf;

    /**
     * Activity
     * <p>
     * {@code http://www.w3.org/ns/prov#Activity}.
     *
     * @see <a href="http://www.w3.org/ns/prov#Activity">Activity</a>
     */
    public static final IRI Activity;

    /**
     * activity
     * <p>
     * {@code http://www.w3.org/ns/prov#activity}.
     *
     * @see <a href="http://www.w3.org/ns/prov#activity">activity</a>
     */
    public static final IRI activity;

    /**
     * ActivityInfluence
     * <p>
     * {@code http://www.w3.org/ns/prov#ActivityInfluence}.
     * <p>
     * ActivityInfluence provides additional descriptions of an Activity's binary
     * influence upon any other kind of resource. Instances of ActivityInfluence use
     * the prov:activity property to cite the influencing Activity.
     *
     * @see <a href=
     *      "http://www.w3.org/ns/prov#ActivityInfluence">ActivityInfluence</a>
     */
    public static final IRI ActivityInfluence;

    /**
     * agent
     * <p>
     * {@code http://www.w3.org/ns/prov#agent}.
     *
     * @see <a href="http://www.w3.org/ns/prov#agent">agent</a>
     */
    public static final IRI agent;

    /**
     * Agent
     * <p>
     * {@code http://www.w3.org/ns/prov#Agent}.
     *
     * @see <a href="http://www.w3.org/ns/prov#Agent">Agent</a>
     */
    public static final IRI Agent;

    /**
     * AgentInfluence
     * <p>
     * {@code http://www.w3.org/ns/prov#AgentInfluence}.
     * <p>
     * AgentInfluence provides additional descriptions of an Agent's binary
     * influence upon any other kind of resource. Instances of AgentInfluence use
     * the prov:agent property to cite the influencing Agent.
     *
     * @see <a href="http://www.w3.org/ns/prov#AgentInfluence">AgentInfluence</a>
     */
    public static final IRI AgentInfluence;

    /**
     * alternateOf
     * <p>
     * {@code http://www.w3.org/ns/prov#alternateOf}.
     *
     * @see <a href="http://www.w3.org/ns/prov#alternateOf">alternateOf</a>
     */
    public static final IRI alternateOf;

    /**
     * {@code http://www.w3.org/ns/prov#aq}.
     *
     * @see <a href="http://www.w3.org/ns/prov#aq">aq</a>
     */
    public static final IRI aq;

    /**
     * Association
     * <p>
     * {@code http://www.w3.org/ns/prov#Association}.
     * <p>
     * An instance of prov:Association provides additional descriptions about the
     * binary prov:wasAssociatedWith relation from an prov:Activity to some
     * prov:Agent that had some responsiblity for it. For example, :baking
     * prov:wasAssociatedWith :baker; prov:qualifiedAssociation [ a
     * prov:Association; prov:agent :baker; :foo :bar ].
     *
     * @see <a href="http://www.w3.org/ns/prov#Association">Association</a>
     */
    public static final IRI Association;

    /**
     * atLocation
     * <p>
     * {@code http://www.w3.org/ns/prov#atLocation}.
     * <p>
     * The Location of any resource.
     *
     * @see <a href="http://www.w3.org/ns/prov#atLocation">atLocation</a>
     */
    public static final IRI atLocation;

    /**
     * atTime
     * <p>
     * {@code http://www.w3.org/ns/prov#atTime}.
     * <p>
     * The time at which an InstantaneousEvent occurred, in the form of
     * xsd:dateTime.
     *
     * @see <a href="http://www.w3.org/ns/prov#atTime">atTime</a>
     */
    public static final IRI atTime;

    /**
     * Attribution
     * <p>
     * {@code http://www.w3.org/ns/prov#Attribution}.
     * <p>
     * An instance of prov:Attribution provides additional descriptions about the
     * binary prov:wasAttributedTo relation from an prov:Entity to some prov:Agent
     * that had some responsible for it. For example, :cake prov:wasAttributedTo
     * :baker; prov:qualifiedAttribution [ a prov:Attribution; prov:entity :baker;
     * :foo :bar ].
     *
     * @see <a href="http://www.w3.org/ns/prov#Attribution">Attribution</a>
     */
    public static final IRI Attribution;

    /**
     * Bundle
     * <p>
     * {@code http://www.w3.org/ns/prov#Bundle}.
     * <p>
     * Note that there are kinds of bundles (e.g. handwritten letters, audio
     * recordings, etc.) that are not expressed in PROV-O, but can be still be
     * described by PROV-O.
     *
     * @see <a href="http://www.w3.org/ns/prov#Bundle">Bundle</a>
     */
    public static final IRI Bundle;

    /**
     * {@code http://www.w3.org/ns/prov#category}.
     * <p>
     * Classify prov-o terms into three categories, including 'starting-point',
     * 'qualifed', and 'extended'. This classification is used by the prov-o html
     * document to gently introduce prov-o terms to its users.
     *
     * @see <a href="http://www.w3.org/ns/prov#category">category</a>
     */
    public static final IRI category;

    /**
     * Collection
     * <p>
     * {@code http://www.w3.org/ns/prov#Collection}.
     *
     * @see <a href="http://www.w3.org/ns/prov#Collection">Collection</a>
     */
    public static final IRI Collection;

    /**
     * Communication
     * <p>
     * {@code http://www.w3.org/ns/prov#Communication}.
     * <p>
     * An instance of prov:Communication provides additional descriptions about the
     * binary prov:wasInformedBy relation from an informed prov:Activity to the
     * prov:Activity that informed it. For example, :you_jumping_off_bridge
     * prov:wasInformedBy :everyone_else_jumping_off_bridge;
     * prov:qualifiedCommunication [ a prov:Communication; prov:activity
     * :everyone_else_jumping_off_bridge; :foo :bar ].
     *
     * @see <a href="http://www.w3.org/ns/prov#Communication">Communication</a>
     */
    public static final IRI Communication;

    /**
     * {@code http://www.w3.org/ns/prov#component}.
     * <p>
     * Classify prov-o terms into six components according to prov-dm, including
     * 'agents-responsibility', 'alternate', 'annotations', 'collections',
     * 'derivations', and 'entities-activities'. This classification is used so that
     * readers of prov-o specification can find its correspondence with the prov-dm
     * specification.
     *
     * @see <a href="http://www.w3.org/ns/prov#component">component</a>
     */
    public static final IRI component;

    /**
     * {@code http://www.w3.org/ns/prov#constraints}.
     * <p>
     * A reference to the principal section of the PROV-CONSTRAINTS document that
     * describes this concept.
     *
     * @see <a href="http://www.w3.org/ns/prov#constraints">constraints</a>
     */
    public static final IRI constraints;

    /**
     * {@code http://www.w3.org/ns/prov#definition}.
     * <p>
     * A definition quoted from PROV-DM or PROV-CONSTRAINTS that describes the
     * concept expressed with this OWL term.
     *
     * @see <a href="http://www.w3.org/ns/prov#definition">definition</a>
     */
    public static final IRI definition;

    /**
     * Delegation
     * <p>
     * {@code http://www.w3.org/ns/prov#Delegation}.
     * <p>
     * An instance of prov:Delegation provides additional descriptions about the
     * binary prov:actedOnBehalfOf relation from a performing prov:Agent to some
     * prov:Agent for whom it was performed. For example, :mixing
     * prov:wasAssociatedWith :toddler . :toddler prov:actedOnBehalfOf :mother;
     * prov:qualifiedDelegation [ a prov:Delegation; prov:entity :mother; :foo :bar
     * ].
     *
     * @see <a href="http://www.w3.org/ns/prov#Delegation">Delegation</a>
     */
    public static final IRI Delegation;

    /**
     * Derivation
     * <p>
     * {@code http://www.w3.org/ns/prov#Derivation}.
     * <p>
     * An instance of prov:Derivation provides additional descriptions about the
     * binary prov:wasDerivedFrom relation from some derived prov:Entity to another
     * prov:Entity from which it was derived. For example, :chewed_bubble_gum
     * prov:wasDerivedFrom :unwrapped_bubble_gum; prov:qualifiedDerivation [ a
     * prov:Derivation; prov:entity :unwrapped_bubble_gum; :foo :bar ].
     *
     * @see <a href="http://www.w3.org/ns/prov#Derivation">Derivation</a>
     */
    public static final IRI Derivation;

    /**
     * {@code http://www.w3.org/ns/prov#dm}.
     * <p>
     * A reference to the principal section of the PROV-DM document that describes
     * this concept.
     *
     * @see <a href="http://www.w3.org/ns/prov#dm">dm</a>
     */
    public static final IRI dm;

    /**
     * {@code http://www.w3.org/ns/prov#editorialNote}.
     * <p>
     * A note by the OWL development team about how this term expresses the PROV-DM
     * concept, or how it should be used in context of semantic web or linked data.
     *
     * @see <a href="http://www.w3.org/ns/prov#editorialNote">editorialNote</a>
     */
    public static final IRI editorialNote;

    /**
     * {@code http://www.w3.org/ns/prov#editorsDefinition}.
     * <p>
     * When the prov-o term does not have a definition drawn from prov-dm, and the
     * prov-o editor provides one.
     *
     * @see <a href=
     *      "http://www.w3.org/ns/prov#editorsDefinition">editorsDefinition</a>
     */
    public static final IRI editorsDefinition;

    /**
     * EmptyCollection
     * <p>
     * {@code http://www.w3.org/ns/prov#EmptyCollection}.
     *
     * @see <a href="http://www.w3.org/ns/prov#EmptyCollection">EmptyCollection</a>
     */
    public static final IRI EmptyCollection;

    /**
     * End
     * <p>
     * {@code http://www.w3.org/ns/prov#End}.
     * <p>
     * An instance of prov:End provides additional descriptions about the binary
     * prov:wasEndedBy relation from some ended prov:Activity to an prov:Entity that
     * ended it. For example, :ball_game prov:wasEndedBy :buzzer; prov:qualifiedEnd
     * [ a prov:End; prov:entity :buzzer; :foo :bar; prov:atTime
     * '2012-03-09T08:05:08-05:00'^^xsd:dateTime ].
     *
     * @see <a href="http://www.w3.org/ns/prov#End">End</a>
     */
    public static final IRI End;

    /**
     * endedAtTime
     * <p>
     * {@code http://www.w3.org/ns/prov#endedAtTime}.
     * <p>
     * The time at which an activity ended. See also prov:startedAtTime.
     *
     * @see <a href="http://www.w3.org/ns/prov#endedAtTime">endedAtTime</a>
     */
    public static final IRI endedAtTime;

    /**
     * Entity
     * <p>
     * {@code http://www.w3.org/ns/prov#Entity}.
     *
     * @see <a href="http://www.w3.org/ns/prov#Entity">Entity</a>
     */
    public static final IRI Entity;

    /**
     * entity
     * <p>
     * {@code http://www.w3.org/ns/prov#entity}.
     *
     * @see <a href="http://www.w3.org/ns/prov#entity">entity</a>
     */
    public static final IRI entity;

    /**
     * EntityInfluence
     * <p>
     * {@code http://www.w3.org/ns/prov#EntityInfluence}.
     * <p>
     * EntityInfluence provides additional descriptions of an Entity's binary
     * influence upon any other kind of resource. Instances of EntityInfluence use
     * the prov:entity property to cite the influencing Entity.
     *
     * @see <a href="http://www.w3.org/ns/prov#EntityInfluence">EntityInfluence</a>
     */
    public static final IRI EntityInfluence;

    /**
     * generated
     * <p>
     * {@code http://www.w3.org/ns/prov#generated}.
     *
     * @see <a href="http://www.w3.org/ns/prov#generated">generated</a>
     */
    public static final IRI generated;

    /**
     * generatedAtTime
     * <p>
     * {@code http://www.w3.org/ns/prov#generatedAtTime}.
     * <p>
     * The time at which an entity was completely created and is available for use.
     *
     * @see <a href="http://www.w3.org/ns/prov#generatedAtTime">generatedAtTime</a>
     */
    public static final IRI generatedAtTime;

    /**
     * Generation
     * <p>
     * {@code http://www.w3.org/ns/prov#Generation}.
     * <p>
     * An instance of prov:Generation provides additional descriptions about the
     * binary prov:wasGeneratedBy relation from a generated prov:Entity to the
     * prov:Activity that generated it. For example, :cake prov:wasGeneratedBy
     * :baking; prov:qualifiedGeneration [ a prov:Generation; prov:activity :baking;
     * :foo :bar ].
     *
     * @see <a href="http://www.w3.org/ns/prov#Generation">Generation</a>
     */
    public static final IRI Generation;

    /**
     * hadActivity
     * <p>
     * {@code http://www.w3.org/ns/prov#hadActivity}.
     * <p>
     * The _optional_ Activity of an Influence, which used, generated, invalidated,
     * or was the responsibility of some Entity. This property is _not_ used by
     * ActivityInfluence (use prov:activity instead).
     *
     * @see <a href="http://www.w3.org/ns/prov#hadActivity">hadActivity</a>
     */
    public static final IRI hadActivity;

    /**
     * hadGeneration
     * <p>
     * {@code http://www.w3.org/ns/prov#hadGeneration}.
     * <p>
     * The _optional_ Generation involved in an Entity's Derivation.
     *
     * @see <a href="http://www.w3.org/ns/prov#hadGeneration">hadGeneration</a>
     */
    public static final IRI hadGeneration;

    /**
     * hadMember
     * <p>
     * {@code http://www.w3.org/ns/prov#hadMember}.
     *
     * @see <a href="http://www.w3.org/ns/prov#hadMember">hadMember</a>
     */
    public static final IRI hadMember;

    /**
     * hadPlan
     * <p>
     * {@code http://www.w3.org/ns/prov#hadPlan}.
     * <p>
     * The _optional_ Plan adopted by an Agent in Association with some Activity.
     * Plan specifications are out of the scope of this specification.
     *
     * @see <a href="http://www.w3.org/ns/prov#hadPlan">hadPlan</a>
     */
    public static final IRI hadPlan;

    /**
     * hadPrimarySource
     * <p>
     * {@code http://www.w3.org/ns/prov#hadPrimarySource}.
     *
     * @see <a href=
     *      "http://www.w3.org/ns/prov#hadPrimarySource">hadPrimarySource</a>
     */
    public static final IRI hadPrimarySource;

    /**
     * hadRole
     * <p>
     * {@code http://www.w3.org/ns/prov#hadRole}.
     * <p>
     * The _optional_ Role that an Entity assumed in the context of an Activity. For
     * example, :baking prov:used :spoon; prov:qualified [ a prov:Usage; prov:entity
     * :spoon; prov:hadRole roles:mixing_implement ].
     *
     * @see <a href="http://www.w3.org/ns/prov#hadRole">hadRole</a>
     */
    public static final IRI hadRole;

    /**
     * hadUsage
     * <p>
     * {@code http://www.w3.org/ns/prov#hadUsage}.
     * <p>
     * The _optional_ Usage involved in an Entity's Derivation.
     *
     * @see <a href="http://www.w3.org/ns/prov#hadUsage">hadUsage</a>
     */
    public static final IRI hadUsage;

    /**
     * Influence
     * <p>
     * {@code http://www.w3.org/ns/prov#Influence}.
     * <p>
     * An instance of prov:Influence provides additional descriptions about the
     * binary prov:wasInfluencedBy relation from some influenced Activity, Entity,
     * or Agent to the influencing Activity, Entity, or Agent. For example,
     * :stomach_ache prov:wasInfluencedBy :spoon; prov:qualifiedInfluence [ a
     * prov:Influence; prov:entity :spoon; :foo :bar ] . Because prov:Influence is a
     * broad relation, the more specific relations (Communication, Delegation, End,
     * etc.) should be used when applicable.
     *
     * @see <a href="http://www.w3.org/ns/prov#Influence">Influence</a>
     */
    public static final IRI Influence;

    /**
     * influenced
     * <p>
     * {@code http://www.w3.org/ns/prov#influenced}.
     *
     * @see <a href="http://www.w3.org/ns/prov#influenced">influenced</a>
     */
    public static final IRI influenced;

    /**
     * influencer
     * <p>
     * {@code http://www.w3.org/ns/prov#influencer}.
     * <p>
     * Subproperties of prov:influencer are used to cite the object of an
     * unqualified PROV-O triple whose predicate is a subproperty of
     * prov:wasInfluencedBy (e.g. prov:used, prov:wasGeneratedBy). prov:influencer
     * is used much like rdf:object is used.
     *
     * @see <a href="http://www.w3.org/ns/prov#influencer">influencer</a>
     */
    public static final IRI influencer;

    /**
     * InstantaneousEvent
     * <p>
     * {@code http://www.w3.org/ns/prov#InstantaneousEvent}.
     * <p>
     * An instantaneous event, or event for short, happens in the world and marks a
     * change in the world, in its activities and in its entities. The term 'event'
     * is commonly used in process algebra with a similar meaning. Events represent
     * communications or interactions; they are assumed to be atomic and
     * instantaneous.
     *
     * @see <a href=
     *      "http://www.w3.org/ns/prov#InstantaneousEvent">InstantaneousEvent</a>
     */
    public static final IRI InstantaneousEvent;

    /**
     * invalidated
     * <p>
     * {@code http://www.w3.org/ns/prov#invalidated}.
     *
     * @see <a href="http://www.w3.org/ns/prov#invalidated">invalidated</a>
     */
    public static final IRI invalidated;

    /**
     * invalidatedAtTime
     * <p>
     * {@code http://www.w3.org/ns/prov#invalidatedAtTime}.
     * <p>
     * The time at which an entity was invalidated (i.e., no longer usable).
     *
     * @see <a href=
     *      "http://www.w3.org/ns/prov#invalidatedAtTime">invalidatedAtTime</a>
     */
    public static final IRI invalidatedAtTime;

    /**
     * Invalidation
     * <p>
     * {@code http://www.w3.org/ns/prov#Invalidation}.
     * <p>
     * An instance of prov:Invalidation provides additional descriptions about the
     * binary prov:wasInvalidatedBy relation from an invalidated prov:Entity to the
     * prov:Activity that invalidated it. For example, :uncracked_egg
     * prov:wasInvalidatedBy :baking; prov:qualifiedInvalidation [ a
     * prov:Invalidation; prov:activity :baking; :foo :bar ].
     *
     * @see <a href="http://www.w3.org/ns/prov#Invalidation">Invalidation</a>
     */
    public static final IRI Invalidation;

    /**
     * {@code http://www.w3.org/ns/prov#inverse}.
     * <p>
     * PROV-O does not define all property inverses. The directionalities defined in
     * PROV-O should be given preference over those not defined. However, if users
     * wish to name the inverse of a PROV-O property, the local name given by
     * prov:inverse should be used.
     *
     * @see <a href="http://www.w3.org/ns/prov#inverse">inverse</a>
     */
    public static final IRI inverse;

    /**
     * Location
     * <p>
     * {@code http://www.w3.org/ns/prov#Location}.
     *
     * @see <a href="http://www.w3.org/ns/prov#Location">Location</a>
     */
    public static final IRI Location;

    /**
     * {@code http://www.w3.org/ns/prov#n}.
     * <p>
     * A reference to the principal section of the PROV-DM document that describes
     * this concept.
     *
     * @see <a href="http://www.w3.org/ns/prov#n">n</a>
     */
    public static final IRI n;

    /**
     * {@code http://www.w3.org/ns/prov#order}.
     * <p>
     * The position that this OWL term should be listed within documentation. The
     * scope of the documentation (e.g., among all terms, among terms within a
     * prov:category, among properties applying to a particular class, etc.) is
     * unspecified.
     *
     * @see <a href="http://www.w3.org/ns/prov#order">order</a>
     */
    public static final IRI order;

    /**
     * Organization
     * <p>
     * {@code http://www.w3.org/ns/prov#Organization}.
     *
     * @see <a href="http://www.w3.org/ns/prov#Organization">Organization</a>
     */
    public static final IRI Organization;

    /**
     * Person
     * <p>
     * {@code http://www.w3.org/ns/prov#Person}.
     *
     * @see <a href="http://www.w3.org/ns/prov#Person">Person</a>
     */
    public static final IRI Person;

    /**
     * Plan
     * <p>
     * {@code http://www.w3.org/ns/prov#Plan}.
     * <p>
     * There exist no prescriptive requirement on the nature of plans, their
     * representation, the actions or steps they consist of, or their intended
     * goals. Since plans may evolve over time, it may become necessary to track
     * their provenance, so plans themselves are entities. Representing the plan
     * explicitly in the provenance can be useful for various tasks: for example, to
     * validate the execution as represented in the provenance record, to manage
     * expectation failures, or to provide explanations.
     *
     * @see <a href="http://www.w3.org/ns/prov#Plan">Plan</a>
     */
    public static final IRI Plan;

    /**
     * PrimarySource
     * <p>
     * {@code http://www.w3.org/ns/prov#PrimarySource}.
     * <p>
     * An instance of prov:PrimarySource provides additional descriptions about the
     * binary prov:hadPrimarySource relation from some secondary prov:Entity to an
     * earlier, primary prov:Entity. For example, :blog prov:hadPrimarySource
     * :newsArticle; prov:qualifiedPrimarySource [ a prov:PrimarySource; prov:entity
     * :newsArticle; :foo :bar ] .
     *
     * @see <a href="http://www.w3.org/ns/prov#PrimarySource">PrimarySource</a>
     */
    public static final IRI PrimarySource;

    /**
     * qualifiedAssociation
     * <p>
     * {@code http://www.w3.org/ns/prov#qualifiedAssociation}.
     * <p>
     * If this Activity prov:wasAssociatedWith Agent :ag, then it can qualify the
     * Association using prov:qualifiedAssociation [ a prov:Association; prov:agent
     * :ag; :foo :bar ].
     *
     * @see <a href=
     *      "http://www.w3.org/ns/prov#qualifiedAssociation">qualifiedAssociation</a>
     */
    public static final IRI qualifiedAssociation;

    /**
     * qualifiedAttribution
     * <p>
     * {@code http://www.w3.org/ns/prov#qualifiedAttribution}.
     * <p>
     * If this Entity prov:wasAttributedTo Agent :ag, then it can qualify how it was
     * influenced using prov:qualifiedAttribution [ a prov:Attribution; prov:agent
     * :ag; :foo :bar ].
     *
     * @see <a href=
     *      "http://www.w3.org/ns/prov#qualifiedAttribution">qualifiedAttribution</a>
     */
    public static final IRI qualifiedAttribution;

    /**
     * qualifiedCommunication
     * <p>
     * {@code http://www.w3.org/ns/prov#qualifiedCommunication}.
     * <p>
     * If this Activity prov:wasInformedBy Activity :a, then it can qualify how it
     * was influenced using prov:qualifiedCommunication [ a prov:Communication;
     * prov:activity :a; :foo :bar ].
     *
     * @see <a href=
     *      "http://www.w3.org/ns/prov#qualifiedCommunication">qualifiedCommunication</a>
     */
    public static final IRI qualifiedCommunication;

    /**
     * qualifiedDelegation
     * <p>
     * {@code http://www.w3.org/ns/prov#qualifiedDelegation}.
     * <p>
     * If this Agent prov:actedOnBehalfOf Agent :ag, then it can qualify how with
     * prov:qualifiedResponsibility [ a prov:Responsibility; prov:agent :ag; :foo
     * :bar ].
     *
     * @see <a href=
     *      "http://www.w3.org/ns/prov#qualifiedDelegation">qualifiedDelegation</a>
     */
    public static final IRI qualifiedDelegation;

    /**
     * qualifiedDerivation
     * <p>
     * {@code http://www.w3.org/ns/prov#qualifiedDerivation}.
     * <p>
     * If this Entity prov:wasDerivedFrom Entity :e, then it can qualify how it was
     * derived using prov:qualifiedDerivation [ a prov:Derivation; prov:entity :e;
     * :foo :bar ].
     *
     * @see <a href=
     *      "http://www.w3.org/ns/prov#qualifiedDerivation">qualifiedDerivation</a>
     */
    public static final IRI qualifiedDerivation;

    /**
     * qualifiedEnd
     * <p>
     * {@code http://www.w3.org/ns/prov#qualifiedEnd}.
     * <p>
     * If this Activity prov:wasEndedBy Entity :e1, then it can qualify how it was
     * ended using prov:qualifiedEnd [ a prov:End; prov:entity :e1; :foo :bar ].
     *
     * @see <a href="http://www.w3.org/ns/prov#qualifiedEnd">qualifiedEnd</a>
     */
    public static final IRI qualifiedEnd;

    /**
     * {@code http://www.w3.org/ns/prov#qualifiedForm}.
     * <p>
     * This annotation property links a subproperty of prov:wasInfluencedBy with the
     * subclass of prov:Influence and the qualifying property that are used to
     * qualify it. Example annotation: prov:wasGeneratedBy prov:qualifiedForm
     * prov:qualifiedGeneration, prov:Generation . Then this unqualified assertion:
     * :entity1 prov:wasGeneratedBy :activity1 . can be qualified by adding:
     * :entity1 prov:qualifiedGeneration :entity1Gen . :entity1Gen a
     * prov:Generation, prov:Influence; prov:activity :activity1; :customValue 1337
     * . Note how the value of the unqualified influence (prov:wasGeneratedBy
     * :activity1) is mirrored as the value of the prov:activity (or prov:entity, or
     * prov:agent) property on the influence class.
     *
     * @see <a href="http://www.w3.org/ns/prov#qualifiedForm">qualifiedForm</a>
     */
    public static final IRI qualifiedForm;

    /**
     * qualifiedGeneration
     * <p>
     * {@code http://www.w3.org/ns/prov#qualifiedGeneration}.
     * <p>
     * If this Activity prov:generated Entity :e, then it can qualify how it
     * performed the Generation using prov:qualifiedGeneration [ a prov:Generation;
     * prov:entity :e; :foo :bar ].
     *
     * @see <a href=
     *      "http://www.w3.org/ns/prov#qualifiedGeneration">qualifiedGeneration</a>
     */
    public static final IRI qualifiedGeneration;

    /**
     * qualifiedInfluence
     * <p>
     * {@code http://www.w3.org/ns/prov#qualifiedInfluence}.
     * <p>
     * Because prov:qualifiedInfluence is a broad relation, the more specific
     * relations (qualifiedCommunication, qualifiedDelegation, qualifiedEnd, etc.)
     * should be used when applicable.
     *
     * @see <a href=
     *      "http://www.w3.org/ns/prov#qualifiedInfluence">qualifiedInfluence</a>
     */
    public static final IRI qualifiedInfluence;

    /**
     * qualifiedInvalidation
     * <p>
     * {@code http://www.w3.org/ns/prov#qualifiedInvalidation}.
     * <p>
     * If this Entity prov:wasInvalidatedBy Activity :a, then it can qualify how it
     * was invalidated using prov:qualifiedInvalidation [ a prov:Invalidation;
     * prov:activity :a; :foo :bar ].
     *
     * @see <a href=
     *      "http://www.w3.org/ns/prov#qualifiedInvalidation">qualifiedInvalidation</a>
     */
    public static final IRI qualifiedInvalidation;

    /**
     * qualifiedPrimarySource
     * <p>
     * {@code http://www.w3.org/ns/prov#qualifiedPrimarySource}.
     * <p>
     * If this Entity prov:hadPrimarySource Entity :e, then it can qualify how using
     * prov:qualifiedPrimarySource [ a prov:PrimarySource; prov:entity :e; :foo :bar
     * ].
     *
     * @see <a href=
     *      "http://www.w3.org/ns/prov#qualifiedPrimarySource">qualifiedPrimarySource</a>
     */
    public static final IRI qualifiedPrimarySource;

    /**
     * qualifiedQuotation
     * <p>
     * {@code http://www.w3.org/ns/prov#qualifiedQuotation}.
     * <p>
     * If this Entity prov:wasQuotedFrom Entity :e, then it can qualify how using
     * prov:qualifiedQuotation [ a prov:Quotation; prov:entity :e; :foo :bar ].
     *
     * @see <a href=
     *      "http://www.w3.org/ns/prov#qualifiedQuotation">qualifiedQuotation</a>
     */
    public static final IRI qualifiedQuotation;

    /**
     * qualifiedRevision
     * <p>
     * {@code http://www.w3.org/ns/prov#qualifiedRevision}.
     * <p>
     * If this Entity prov:wasRevisionOf Entity :e, then it can qualify how it was
     * revised using prov:qualifiedRevision [ a prov:Revision; prov:entity :e; :foo
     * :bar ].
     *
     * @see <a href=
     *      "http://www.w3.org/ns/prov#qualifiedRevision">qualifiedRevision</a>
     */
    public static final IRI qualifiedRevision;

    /**
     * qualifiedStart
     * <p>
     * {@code http://www.w3.org/ns/prov#qualifiedStart}.
     * <p>
     * If this Activity prov:wasStartedBy Entity :e1, then it can qualify how it was
     * started using prov:qualifiedStart [ a prov:Start; prov:entity :e1; :foo :bar
     * ].
     *
     * @see <a href="http://www.w3.org/ns/prov#qualifiedStart">qualifiedStart</a>
     */
    public static final IRI qualifiedStart;

    /**
     * qualifiedUsage
     * <p>
     * {@code http://www.w3.org/ns/prov#qualifiedUsage}.
     * <p>
     * If this Activity prov:used Entity :e, then it can qualify how it used it
     * using prov:qualifiedUsage [ a prov:Usage; prov:entity :e; :foo :bar ].
     *
     * @see <a href="http://www.w3.org/ns/prov#qualifiedUsage">qualifiedUsage</a>
     */
    public static final IRI qualifiedUsage;

    /**
     * Quotation
     * <p>
     * {@code http://www.w3.org/ns/prov#Quotation}.
     * <p>
     * An instance of prov:Quotation provides additional descriptions about the
     * binary prov:wasQuotedFrom relation from some taken prov:Entity from an
     * earlier, larger prov:Entity. For example, :here_is_looking_at_you_kid
     * prov:wasQuotedFrom :casablanca_script; prov:qualifiedQuotation [ a
     * prov:Quotation; prov:entity :casablanca_script; :foo :bar ].
     *
     * @see <a href="http://www.w3.org/ns/prov#Quotation">Quotation</a>
     */
    public static final IRI Quotation;

    /**
     * Revision
     * <p>
     * {@code http://www.w3.org/ns/prov#Revision}.
     * <p>
     * An instance of prov:Revision provides additional descriptions about the
     * binary prov:wasRevisionOf relation from some newer prov:Entity to an earlier
     * prov:Entity. For example, :draft_2 prov:wasRevisionOf :draft_1;
     * prov:qualifiedRevision [ a prov:Revision; prov:entity :draft_1; :foo :bar ].
     *
     * @see <a href="http://www.w3.org/ns/prov#Revision">Revision</a>
     */
    public static final IRI Revision;

    /**
     * Role
     * <p>
     * {@code http://www.w3.org/ns/prov#Role}.
     *
     * @see <a href="http://www.w3.org/ns/prov#Role">Role</a>
     */
    public static final IRI Role;

    /**
     * {@code http://www.w3.org/ns/prov#sharesDefinitionWith}.
     *
     * @see <a href=
     *      "http://www.w3.org/ns/prov#sharesDefinitionWith">sharesDefinitionWith</a>
     */
    public static final IRI sharesDefinitionWith;

    /**
     * SoftwareAgent
     * <p>
     * {@code http://www.w3.org/ns/prov#SoftwareAgent}.
     *
     * @see <a href="http://www.w3.org/ns/prov#SoftwareAgent">SoftwareAgent</a>
     */
    public static final IRI SoftwareAgent;

    /**
     * specializationOf
     * <p>
     * {@code http://www.w3.org/ns/prov#specializationOf}.
     *
     * @see <a href=
     *      "http://www.w3.org/ns/prov#specializationOf">specializationOf</a>
     */
    public static final IRI specializationOf;

    /**
     * Start
     * <p>
     * {@code http://www.w3.org/ns/prov#Start}.
     * <p>
     * An instance of prov:Start provides additional descriptions about the binary
     * prov:wasStartedBy relation from some started prov:Activity to an prov:Entity
     * that started it. For example, :foot_race prov:wasStartedBy :bang;
     * prov:qualifiedStart [ a prov:Start; prov:entity :bang; :foo :bar; prov:atTime
     * '2012-03-09T08:05:08-05:00'^^xsd:dateTime ] .
     *
     * @see <a href="http://www.w3.org/ns/prov#Start">Start</a>
     */
    public static final IRI Start;

    /**
     * startedAtTime
     * <p>
     * {@code http://www.w3.org/ns/prov#startedAtTime}.
     * <p>
     * The time at which an activity started. See also prov:endedAtTime.
     *
     * @see <a href="http://www.w3.org/ns/prov#startedAtTime">startedAtTime</a>
     */
    public static final IRI startedAtTime;

    /**
     * {@code http://www.w3.org/ns/prov#todo}.
     *
     * @see <a href="http://www.w3.org/ns/prov#todo">todo</a>
     */
    public static final IRI todo;

    /**
     * {@code http://www.w3.org/ns/prov#unqualifiedForm}.
     * <p>
     * Classes and properties used to qualify relationships are annotated with
     * prov:unqualifiedForm to indicate the property used to assert an unqualified
     * provenance relation.
     *
     * @see <a href="http://www.w3.org/ns/prov#unqualifiedForm">unqualifiedForm</a>
     */
    public static final IRI unqualifiedForm;

    /**
     * Usage
     * <p>
     * {@code http://www.w3.org/ns/prov#Usage}.
     * <p>
     * An instance of prov:Usage provides additional descriptions about the binary
     * prov:used relation from some prov:Activity to an prov:Entity that it used.
     * For example, :keynote prov:used :podium; prov:qualifiedUsage [ a prov:Usage;
     * prov:entity :podium; :foo :bar ].
     *
     * @see <a href="http://www.w3.org/ns/prov#Usage">Usage</a>
     */
    public static final IRI Usage;

    /**
     * used
     * <p>
     * {@code http://www.w3.org/ns/prov#used}.
     * <p>
     * A prov:Entity that was used by this prov:Activity. For example, :baking
     * prov:used :spoon, :egg, :oven .
     *
     * @see <a href="http://www.w3.org/ns/prov#used">used</a>
     */
    public static final IRI used;

    /**
     * value
     * <p>
     * {@code http://www.w3.org/ns/prov#value}.
     *
     * @see <a href="http://www.w3.org/ns/prov#value">value</a>
     */
    public static final IRI value;

    /**
     * wasAssociatedWith
     * <p>
     * {@code http://www.w3.org/ns/prov#wasAssociatedWith}.
     * <p>
     * An prov:Agent that had some (unspecified) responsibility for the occurrence
     * of this prov:Activity.
     *
     * @see <a href=
     *      "http://www.w3.org/ns/prov#wasAssociatedWith">wasAssociatedWith</a>
     */
    public static final IRI wasAssociatedWith;

    /**
     * wasAttributedTo
     * <p>
     * {@code http://www.w3.org/ns/prov#wasAttributedTo}.
     * <p>
     * Attribution is the ascribing of an entity to an agent.
     *
     * @see <a href="http://www.w3.org/ns/prov#wasAttributedTo">wasAttributedTo</a>
     */
    public static final IRI wasAttributedTo;

    /**
     * wasDerivedFrom
     * <p>
     * {@code http://www.w3.org/ns/prov#wasDerivedFrom}.
     * <p>
     * The more specific subproperties of prov:wasDerivedFrom (i.e.,
     * prov:wasQuotedFrom, prov:wasRevisionOf, prov:hadPrimarySource) should be used
     * when applicable.
     *
     * @see <a href="http://www.w3.org/ns/prov#wasDerivedFrom">wasDerivedFrom</a>
     */
    public static final IRI wasDerivedFrom;

    /**
     * wasEndedBy
     * <p>
     * {@code http://www.w3.org/ns/prov#wasEndedBy}.
     * <p>
     * End is when an activity is deemed to have ended. An end may refer to an
     * entity, known as trigger, that terminated the activity.
     *
     * @see <a href="http://www.w3.org/ns/prov#wasEndedBy">wasEndedBy</a>
     */
    public static final IRI wasEndedBy;

    /**
     * wasGeneratedBy
     * <p>
     * {@code http://www.w3.org/ns/prov#wasGeneratedBy}.
     *
     * @see <a href="http://www.w3.org/ns/prov#wasGeneratedBy">wasGeneratedBy</a>
     */
    public static final IRI wasGeneratedBy;

    /**
     * wasInfluencedBy
     * <p>
     * {@code http://www.w3.org/ns/prov#wasInfluencedBy}.
     * <p>
     * Because prov:wasInfluencedBy is a broad relation, its more specific
     * subproperties (e.g. prov:wasInformedBy, prov:actedOnBehalfOf,
     * prov:wasEndedBy, etc.) should be used when applicable.
     *
     * @see <a href="http://www.w3.org/ns/prov#wasInfluencedBy">wasInfluencedBy</a>
     */
    public static final IRI wasInfluencedBy;

    /**
     * wasInformedBy
     * <p>
     * {@code http://www.w3.org/ns/prov#wasInformedBy}.
     * <p>
     * An activity a2 is dependent on or informed by another activity a1, by way of
     * some unspecified entity that is generated by a1 and used by a2.
     *
     * @see <a href="http://www.w3.org/ns/prov#wasInformedBy">wasInformedBy</a>
     */
    public static final IRI wasInformedBy;

    /**
     * wasInvalidatedBy
     * <p>
     * {@code http://www.w3.org/ns/prov#wasInvalidatedBy}.
     *
     * @see <a href=
     *      "http://www.w3.org/ns/prov#wasInvalidatedBy">wasInvalidatedBy</a>
     */
    public static final IRI wasInvalidatedBy;

    /**
     * wasQuotedFrom
     * <p>
     * {@code http://www.w3.org/ns/prov#wasQuotedFrom}.
     * <p>
     * An entity is derived from an original entity by copying, or 'quoting', some
     * or all of it.
     *
     * @see <a href="http://www.w3.org/ns/prov#wasQuotedFrom">wasQuotedFrom</a>
     */
    public static final IRI wasQuotedFrom;

    /**
     * wasRevisionOf
     * <p>
     * {@code http://www.w3.org/ns/prov#wasRevisionOf}.
     * <p>
     * A revision is a derivation that revises an entity into a revised version.
     *
     * @see <a href="http://www.w3.org/ns/prov#wasRevisionOf">wasRevisionOf</a>
     */
    public static final IRI wasRevisionOf;

    /**
     * wasStartedBy
     * <p>
     * {@code http://www.w3.org/ns/prov#wasStartedBy}.
     * <p>
     * Start is when an activity is deemed to have started. A start may refer to an
     * entity, known as trigger, that initiated the activity.
     *
     * @see <a href="http://www.w3.org/ns/prov#wasStartedBy">wasStartedBy</a>
     */
    public static final IRI wasStartedBy;

    static {
        ValueFactory factory = SimpleValueFactory.getInstance();

        actedOnBehalfOf = factory.createIRI(PROV.NAMESPACE, "actedOnBehalfOf");
        Activity = factory.createIRI(PROV.NAMESPACE, "Activity");
        activity = factory.createIRI(PROV.NAMESPACE, "activity");
        ActivityInfluence = factory.createIRI(PROV.NAMESPACE, "ActivityInfluence");
        agent = factory.createIRI(PROV.NAMESPACE, "agent");
        Agent = factory.createIRI(PROV.NAMESPACE, "Agent");
        AgentInfluence = factory.createIRI(PROV.NAMESPACE, "AgentInfluence");
        alternateOf = factory.createIRI(PROV.NAMESPACE, "alternateOf");
        aq = factory.createIRI(PROV.NAMESPACE, "aq");
        Association = factory.createIRI(PROV.NAMESPACE, "Association");
        atLocation = factory.createIRI(PROV.NAMESPACE, "atLocation");
        atTime = factory.createIRI(PROV.NAMESPACE, "atTime");
        Attribution = factory.createIRI(PROV.NAMESPACE, "Attribution");
        Bundle = factory.createIRI(PROV.NAMESPACE, "Bundle");
        category = factory.createIRI(PROV.NAMESPACE, "category");
        Collection = factory.createIRI(PROV.NAMESPACE, "Collection");
        Communication = factory.createIRI(PROV.NAMESPACE, "Communication");
        component = factory.createIRI(PROV.NAMESPACE, "component");
        constraints = factory.createIRI(PROV.NAMESPACE, "constraints");
        definition = factory.createIRI(PROV.NAMESPACE, "definition");
        Delegation = factory.createIRI(PROV.NAMESPACE, "Delegation");
        Derivation = factory.createIRI(PROV.NAMESPACE, "Derivation");
        dm = factory.createIRI(PROV.NAMESPACE, "dm");
        editorialNote = factory.createIRI(PROV.NAMESPACE, "editorialNote");
        editorsDefinition = factory.createIRI(PROV.NAMESPACE, "editorsDefinition");
        EmptyCollection = factory.createIRI(PROV.NAMESPACE, "EmptyCollection");
        End = factory.createIRI(PROV.NAMESPACE, "End");
        endedAtTime = factory.createIRI(PROV.NAMESPACE, "endedAtTime");
        Entity = factory.createIRI(PROV.NAMESPACE, "Entity");
        entity = factory.createIRI(PROV.NAMESPACE, "entity");
        EntityInfluence = factory.createIRI(PROV.NAMESPACE, "EntityInfluence");
        generated = factory.createIRI(PROV.NAMESPACE, "generated");
        generatedAtTime = factory.createIRI(PROV.NAMESPACE, "generatedAtTime");
        Generation = factory.createIRI(PROV.NAMESPACE, "Generation");
        hadActivity = factory.createIRI(PROV.NAMESPACE, "hadActivity");
        hadGeneration = factory.createIRI(PROV.NAMESPACE, "hadGeneration");
        hadMember = factory.createIRI(PROV.NAMESPACE, "hadMember");
        hadPlan = factory.createIRI(PROV.NAMESPACE, "hadPlan");
        hadPrimarySource = factory.createIRI(PROV.NAMESPACE, "hadPrimarySource");
        hadRole = factory.createIRI(PROV.NAMESPACE, "hadRole");
        hadUsage = factory.createIRI(PROV.NAMESPACE, "hadUsage");
        Influence = factory.createIRI(PROV.NAMESPACE, "Influence");
        influenced = factory.createIRI(PROV.NAMESPACE, "influenced");
        influencer = factory.createIRI(PROV.NAMESPACE, "influencer");
        InstantaneousEvent = factory.createIRI(PROV.NAMESPACE, "InstantaneousEvent");
        invalidated = factory.createIRI(PROV.NAMESPACE, "invalidated");
        invalidatedAtTime = factory.createIRI(PROV.NAMESPACE, "invalidatedAtTime");
        Invalidation = factory.createIRI(PROV.NAMESPACE, "Invalidation");
        inverse = factory.createIRI(PROV.NAMESPACE, "inverse");
        Location = factory.createIRI(PROV.NAMESPACE, "Location");
        n = factory.createIRI(PROV.NAMESPACE, "n");
        order = factory.createIRI(PROV.NAMESPACE, "order");
        Organization = factory.createIRI(PROV.NAMESPACE, "Organization");
        Person = factory.createIRI(PROV.NAMESPACE, "Person");
        Plan = factory.createIRI(PROV.NAMESPACE, "Plan");
        PrimarySource = factory.createIRI(PROV.NAMESPACE, "PrimarySource");
        qualifiedAssociation = factory.createIRI(PROV.NAMESPACE, "qualifiedAssociation");
        qualifiedAttribution = factory.createIRI(PROV.NAMESPACE, "qualifiedAttribution");
        qualifiedCommunication = factory.createIRI(PROV.NAMESPACE, "qualifiedCommunication");
        qualifiedDelegation = factory.createIRI(PROV.NAMESPACE, "qualifiedDelegation");
        qualifiedDerivation = factory.createIRI(PROV.NAMESPACE, "qualifiedDerivation");
        qualifiedEnd = factory.createIRI(PROV.NAMESPACE, "qualifiedEnd");
        qualifiedForm = factory.createIRI(PROV.NAMESPACE, "qualifiedForm");
        qualifiedGeneration = factory.createIRI(PROV.NAMESPACE, "qualifiedGeneration");
        qualifiedInfluence = factory.createIRI(PROV.NAMESPACE, "qualifiedInfluence");
        qualifiedInvalidation = factory.createIRI(PROV.NAMESPACE, "qualifiedInvalidation");
        qualifiedPrimarySource = factory.createIRI(PROV.NAMESPACE, "qualifiedPrimarySource");
        qualifiedQuotation = factory.createIRI(PROV.NAMESPACE, "qualifiedQuotation");
        qualifiedRevision = factory.createIRI(PROV.NAMESPACE, "qualifiedRevision");
        qualifiedStart = factory.createIRI(PROV.NAMESPACE, "qualifiedStart");
        qualifiedUsage = factory.createIRI(PROV.NAMESPACE, "qualifiedUsage");
        Quotation = factory.createIRI(PROV.NAMESPACE, "Quotation");
        Revision = factory.createIRI(PROV.NAMESPACE, "Revision");
        Role = factory.createIRI(PROV.NAMESPACE, "Role");
        sharesDefinitionWith = factory.createIRI(PROV.NAMESPACE, "sharesDefinitionWith");
        SoftwareAgent = factory.createIRI(PROV.NAMESPACE, "SoftwareAgent");
        specializationOf = factory.createIRI(PROV.NAMESPACE, "specializationOf");
        Start = factory.createIRI(PROV.NAMESPACE, "Start");
        startedAtTime = factory.createIRI(PROV.NAMESPACE, "startedAtTime");
        todo = factory.createIRI(PROV.NAMESPACE, "todo");
        unqualifiedForm = factory.createIRI(PROV.NAMESPACE, "unqualifiedForm");
        Usage = factory.createIRI(PROV.NAMESPACE, "Usage");
        used = factory.createIRI(PROV.NAMESPACE, "used");
        value = factory.createIRI(PROV.NAMESPACE, "value");
        wasAssociatedWith = factory.createIRI(PROV.NAMESPACE, "wasAssociatedWith");
        wasAttributedTo = factory.createIRI(PROV.NAMESPACE, "wasAttributedTo");
        wasDerivedFrom = factory.createIRI(PROV.NAMESPACE, "wasDerivedFrom");
        wasEndedBy = factory.createIRI(PROV.NAMESPACE, "wasEndedBy");
        wasGeneratedBy = factory.createIRI(PROV.NAMESPACE, "wasGeneratedBy");
        wasInfluencedBy = factory.createIRI(PROV.NAMESPACE, "wasInfluencedBy");
        wasInformedBy = factory.createIRI(PROV.NAMESPACE, "wasInformedBy");
        wasInvalidatedBy = factory.createIRI(PROV.NAMESPACE, "wasInvalidatedBy");
        wasQuotedFrom = factory.createIRI(PROV.NAMESPACE, "wasQuotedFrom");
        wasRevisionOf = factory.createIRI(PROV.NAMESPACE, "wasRevisionOf");
        wasStartedBy = factory.createIRI(PROV.NAMESPACE, "wasStartedBy");
    }

    private PROV() {
        // static access only
    }

}