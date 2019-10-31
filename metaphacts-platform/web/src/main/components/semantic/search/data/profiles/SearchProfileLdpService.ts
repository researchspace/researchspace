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

import * as maybe from 'data.maybe';
import * as assign from 'object-assign';
import { OrderedSet, OrderedMap, Set } from 'immutable';
import * as Kefir from 'kefir';

import { Rdf, vocabularies } from 'platform/api/rdf';
import { LdpService } from 'platform/api/services/ldp';

import StructuredSearchVocab from '../Vocabulary';
import { Resource } from '../Common';
import { Profile, Relations, Categories } from './Model';

const { xsd, rdfs, rdf, ldp } = vocabularies;

export interface Profile {
  relations: OrderedSet<Rdf.Iri>;
  categories: OrderedSet<Rdf.Iri>;
  label: string
  description: string
}

export class SearchProfileProfileLdpServiceClass extends LdpService {
  getAvailableProfiles(): Kefir.Property<Set<Resource>> {
    return this.getContainer().map(
      graph => {
        const profilesIris =
            graph.triples.filter(
              triple => triple.p.equals(ldp.contains)
            ).map(
              triple => <Rdf.Iri>triple.o
            ).toSet();

        return profilesIris.map(
          (iri): Resource => {
            return {
              iri: iri,
              label: this.getProfileMetadata(iri, graph).label,
              tuple: {},
            };
          }
        ).toSet();
      }
    );
  }

  getProfile(iri: Rdf.Iri): Kefir.Property<Profile> {
    return this.get(iri).map(
      graph => this.parseGraphToProfile(iri, graph)
    );
  }

  createProfile(name: string, description: string): Kefir.Property<Rdf.Iri> {
    return this.addResource(
      this.createProfileGraph(name, description), maybe.Just(name)
    );
  }

  updateProfile(iri: Rdf.Iri, profile: Profile): Kefir.Property<{}> {
    return this.update(iri, this.profileToGraph(iri, profile));
  }

  private createProfileGraph(name: string, description: string) {
    const iri = Rdf.iri('');
    return Rdf.graph([
      Rdf.triple(iri, rdf.type, StructuredSearchVocab.Profile),
      Rdf.triple(iri, rdfs.label, Rdf.literal(name)),
      Rdf.triple(iri, rdfs.comment, Rdf.literal(description))
    ]);
  }

  private profileToGraph(iri: Rdf.Iri, profile: Profile): Rdf.Graph {
    const base = Rdf.graph([
      Rdf.triple(
        iri, rdf.type, StructuredSearchVocab.Profile
      ),
      Rdf.triple(
        iri, rdfs.label, Rdf.literal(profile.label)
      ),
      Rdf.triple(
        iri, rdfs.comment, Rdf.literal(profile.description)
      ),
    ]).triples;
    const categories = this.categoriesToGraph(iri, profile.categories);
    const relations = this.relationsToGraph(iri, profile.relations);

    return Rdf.graph(
      base.union(categories).union(relations)
    );
  }

  private categoriesToGraph(iri: Rdf.Iri, categories: Categories): Set<Rdf.Triple> {
    return this.collectionToGraph(
      iri, categories,
      StructuredSearchVocab.hasCategory, StructuredSearchVocab.category
    );
  }

  private relationsToGraph(iri: Rdf.Iri, relations: Relations): Set<Rdf.Triple> {
    return this.collectionToGraph(
      iri, relations.mapKeys(key => key.value.iri).toOrderedMap(),
      StructuredSearchVocab.hasRelation, StructuredSearchVocab.relation
    );
  }

  private collectionToGraph(
    iri: Rdf.Iri, collection: OrderedMap<Rdf.Iri, Resource>,
    hasIri: Rdf.Iri, relationIri: Rdf.Iri
  ): Set<Rdf.Triple> {
    return collection.toIndexedSeq().map(
          (category, i) => {
            const holder = Rdf.bnode();
            return Set.of(
              Rdf.triple(
                iri, hasIri, holder
              ),
              Rdf.triple(
                holder, relationIri, category.iri
              ),
              Rdf.triple(
                holder, StructuredSearchVocab.order, Rdf.literal((i).toString(), xsd.integer)
              )
            );
          }
        ).flatten().toSet();
  }

  private parseGraphToProfile(profileIri: Rdf.Iri, graph: Rdf.Graph): Profile {
    return assign(
      {
        categories: this.getCategories(graph),
        relations: this.getRelations(graph),
      },
      this.getProfileMetadata(profileIri, graph)
    );
  }

  private getProfileMetadata(
    profileIri: Rdf.Iri, graph: Rdf.Graph
  ): {label: string, description: string} {
    return {
      label: graph.triples.find(t => t.s.equals(profileIri) && t.p.equals(rdfs.label)).o.value,
      description: graph.triples.find(
        t => t.s.equals(profileIri) && t.p.equals(rdfs.comment)
      ).o.value,
    };
  }

  private getCategories(graph: Rdf.Graph): OrderedSet<Rdf.Iri> {
    const categoryHolders =
        graph.triples.filter(
          t => t.p.equals(StructuredSearchVocab.hasCategory)
        ).map(
          t => t.o
        );

    return OrderedSet<Rdf.Iri>(
      categoryHolders.map(
      categoryNode => {
        const category = graph.triples.find(
          t => t.s.equals(categoryNode) && t.p.equals(StructuredSearchVocab.category)
        ).o;
        const order = graph.triples.find(
          t => t.s.equals(categoryNode) && t.p.equals(StructuredSearchVocab.order)
        ).o;
        return {
          order: order,
          value: category,
        };
      }
    ).sort(
      (c1, c2) => {
        if (c1.order.value < c2.order.value) {
          return -1;
        }
        if (c1.order.value > c2.order.value) {
          return 1;
        }
        return 0;
      }
    ).map(
      c => c.value
    ));
  }

  private getRelations(graph: Rdf.Graph): OrderedSet<Rdf.Iri> {
    const categoryHolder =
        graph.triples.filter(
          t => t.p.equals(StructuredSearchVocab.hasRelation)
        ).map(
          t => t.o
        );

    return OrderedSet<Rdf.Iri>(
      categoryHolder.map(
      categoryNode => {
        const category = graph.triples.find(
          t => t.s.equals(categoryNode) && t.p.equals(StructuredSearchVocab.relation)
        ).o;
        const order = graph.triples.find(
          t => t.s.equals(categoryNode) && t.p.equals(StructuredSearchVocab.order)
        ).o;
        return {
          order: order,
          value: category,
        };
      }
    ).sort(
      (c1, c2) => {
        if (c1.order.value < c2.order.value) {
          return -1;
        }
        if (c1.order.value > c2.order.value) {
          return 1;
        }
        return 0;
      }
    ).map(
      c => c.value
    )
    );
  }
}

export const  SearchProfileLdpService =
    new SearchProfileProfileLdpServiceClass(StructuredSearchVocab.ProfileContainer.value);
export default SearchProfileLdpService;
