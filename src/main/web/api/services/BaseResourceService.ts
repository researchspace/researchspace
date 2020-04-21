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

import * as Kefir from 'kefir';
import { post } from 'platform/api/http';
import * as Immutable from 'immutable';

import { BatchedPool, requestAsProperty } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';
import { QueryContext } from 'platform/api/sparql';

export class BaseResourceService {
  private serviceUrl: string;
  private pools = new Map<string, BatchedPool<string, string>>();

  constructor(serviceUrl: string) {
    this.serviceUrl = serviceUrl;
  }

  private getPool(context?: QueryContext) {
    const repository = getRepositoryFromContext(context);
    if (!this.pools.has(repository)) {
      this.pools.set(
        repository,
        new BatchedPool<string, string>({
          fetch: (iris) => this.fetchResources(iris.toArray(), repository),
        })
      );
    }
    return this.pools.get(repository);
  }

  getResource(iri: Rdf.Iri, context?: QueryContext): Kefir.Property<string> {
    return this.getPool(context).query(iri.value);
  }

  getResources(iris: ReadonlyArray<Rdf.Iri>, context?: QueryContext): Kefir.Property<Immutable.Map<Rdf.Iri, string>> {
    if (iris.length === 0) {
      return Kefir.constant(Immutable.Map());
    }

    const pool = this.getPool(context);
    if (iris.length >= pool.batchSize) {
      const repository = getRepositoryFromContext(context);
      return this.fetchResources(
        iris.map((iri) => iri.value),
        repository
      ).map((labels) =>
        Immutable.Map<Rdf.Iri, string>().withMutations((map) => {
          for (const iri of iris) {
            map.set(iri, labels.get(iri.value));
          }
        })
      );
    }

    return Kefir.combine(
      iris.map((iri) => this.getResource(iri, context).map((value) => [iri, value] as [Rdf.Iri, string]))
    )
      .map(Immutable.Map as <K, V>(pairs: ReadonlyArray<[K, V]>) => Immutable.Map<K, V>)
      .toProperty();
  }

  protected createRequest(resources: string[], repository: string) {
    const request = post(this.serviceUrl)
      .send(resources)
      .query({ repository: repository })
      .type('application/json')
      .accept('application/json');
    return request;
  }

  protected fetchResources(resources: string[], repository: string) {
    const request = this.createRequest(resources, repository);
    return requestAsProperty(request).map((response) => {
      const batch = response.body as { [key: string]: string };
      return Immutable.Map(batch);
    });
  }
}

function getRepositoryFromContext(context: QueryContext | undefined): string {
  if (context) {
    if (context.repository) {
      return context.repository;
    }
  }
  return 'default';
}
