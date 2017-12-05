/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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
import {includes} from 'lodash';

import { Rdf, vocabularies } from 'platform/api/rdf';
import { LdpService, LdpServiceContext } from './ldp';

const { VocabPlatform, ldp, rdf, rdfs, sp} = vocabularies;

export type OperationType = SparqlJs.Query['queryType'] | 'UPDATE';

export interface Query {
  label: string;
  value: string;
  type: SparqlJs.SparqlQuery['type'] | '';
  queryType: OperationType | '';
  structure?: string;
}

export class QueryServiceClass extends LdpService {

  public addItem(query: Query): Kefir.Property<Rdf.Iri> {
    const graph = this.createGraph(query);
    const label = query.label;

    return this.options(VocabPlatform.QueryContainer).flatMap(
        // if container already exists, simply add new resource
        v => this.addResource(graph, maybe.Just(label))
      ).flatMapErrors<Rdf.Iri>(
        // otherwise create new container under root resource
        e => this.createContainer().flatMap(containerIri => {
          return this.addResource(graph, maybe.Just(label));
        })
      ).toProperty();
  }

  public updateItem(iri: Rdf.Iri, query: Query): Kefir.Property<{}> {
    const graph = this.createGraph(query);

    return this.update(iri, graph);
  }

  private createGraph(query: Query): Rdf.Graph {
    const {label, value, type, queryType} = query;
    const queryClass = (type === 'update') ? sp.Update : sp.Query;
    const triples = [
      Rdf.triple(
        Rdf.iri(''), rdf.type, queryClass
      ),
      Rdf.triple(
        Rdf.iri(''), rdf.type, this.getType(type, queryType)
      ),
      Rdf.triple(
        Rdf.iri(''), rdfs.label, Rdf.literal(label)
      ),
      Rdf.triple(
        Rdf.iri(''), sp.text, Rdf.literal(value)
      ),
    ];

    if (query.structure) {
      triples.push(
        Rdf.triple(
          Rdf.iri(''), vocabularies.VocabPlatform.searchState, Rdf.literal(query.structure)
        )
      );
    }

    return Rdf.graph(triples);
  }

  private getType(type: string, queryType: string): Rdf.Iri {
      if (type !== 'update') {
        switch (queryType) {
          case 'ASK':
            return sp.Ask;
          case 'SELECT':
            return sp.Select;
          case 'DESCRIBE':
            return sp.Describe;
          case 'CONSTRUCT':
            return sp.Construct;
          default:
            return sp.Select;
        }
      } else {
          return sp.Update;
      }
  }

  private createContainer(): Kefir.Property<Rdf.Iri> {
    return new LdpService(VocabPlatform.RootContainer.value, this.context).addResource(
      Rdf.graph([
        Rdf.triple(
          Rdf.iri(''),
          rdf.type,
          ldp.Container
        ),
        Rdf.triple(
          Rdf.iri(''),
          rdfs.label,
          Rdf.literal('LDP Container for resources of type ' + VocabPlatform.QueryContainer)
        ),
      ]), maybe.Just(VocabPlatform.QueryContainer.value)
    );
  }

  public getQuery(iri: Rdf.Iri): Kefir.Property<Query> {
    return this.get(iri).map(graph => this.parseGraphToQuery(iri, graph));
  }

  private parseGraphToQuery(iri: Rdf.Iri, graph: Rdf.Graph): Query {
    const queryTypes = [sp.Ask, sp.Select, sp.Describe, sp.Construct, sp.Update]
      .map( qt => qt.value);
    const label = graph.triples.find(t => t.s.equals(iri) && t.p.equals(rdfs.label)).o.value;
    const value = graph.triples.find(t => t.s.equals(iri) && t.p.equals(sp.text)).o.value;
    const structure = graph.triples.find(
      t => t.s.equals(iri) && t.p.equals(vocabularies.VocabPlatform.searchState)
    );
    const sTypeIRI = graph.triples.find(
      // there are several types, filter only those which are relevant
      t => t.s.equals(iri) && t.p.equals(rdf.type) && includes(queryTypes, t.o.value)
    ).o.value;

    const queryType = this.extractTypeFromIri(sTypeIRI).toUpperCase() as OperationType;

    return {
      label,
      value,
      type: (queryType === 'UPDATE') ? 'update' : 'query',
      queryType: queryType,
      structure: structure ? structure.o.value : undefined,
    };
  }

  /**
   * Return substring after last '#'
   */
  private extractTypeFromIri(sTypeIRI: string): string {
    return /[^#]*$/.exec(sTypeIRI)[0];
  }
}

export const QueryService = function(context?: LdpServiceContext) {
  return new QueryServiceClass(VocabPlatform.QueryContainer.value, context);
};
