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

import * as Kefir from 'kefir';
import { post } from 'superagent';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as Maybe from 'data.maybe';

import { Rdf } from 'platform/api/rdf';
import { BatchedPool } from 'platform/api/async';
import { SemanticContext } from 'platform/api/components';

export class BaseResourceService {
  constructor(serviceUrl: string) {
    this.serviceUrl = serviceUrl;
  }

  private serviceUrl: string;
  private pools: {[key: string]: BatchedPool<string, string>} = {};
  private getPool(context?: SemanticContext) {
    const repository =
      Maybe.fromNullable(context).chain(
        ctx => Maybe.fromNullable(ctx.semanticContext)
      ).chain(
        sctx => Maybe.fromNullable(sctx.repository)
      ).getOrElse('default');
    if (!_.has(this.pools, repository)) {
      this.pools[repository] =
        new BatchedPool<string, string>({
          fetch: iris => this.fetchResources(iris.toArray(), repository)
        });
    }
    return this.pools[repository];
  }

  getResource(iri: Rdf.Iri, context?: SemanticContext): Kefir.Property<string> {
    return this.getPool(context).query(iri.value);
  }

  getResources(
    iris: ReadonlyArray<Rdf.Iri>, context?: SemanticContext
  ): Kefir.Property<Immutable.Map<Rdf.Iri, string>> {
    if (_.isEmpty(iris) ){
      return Kefir.constant(Immutable.Map())
    }
    return Kefir.combine(
      iris.map(
        iri => this.getResource(iri, context).map(value => [iri, value])
      )
    ).map(
      Immutable.Map
    ).toProperty();
  }

  private fetchResources(resources: string[], repository: string) {
    type Batch = { [resourceIri: string]: string };
    const request = post(this.serviceUrl)
      .send(resources)
      .query({repository: repository})
      .type('application/json')
      .accept('application/json');

    return Kefir.fromNodeCallback<Batch>(
      cb => request.end((err, res) => cb(err, res.body))
    ).map(
      batch => Immutable.Map(batch)
    ).toProperty();
  }
}
