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
import * as request from 'superagent';
import * as Immutable from 'immutable';
import * as Maybe from 'data.maybe';
import * as _ from 'lodash';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';

const ENDPOINT = '/rest/repositories';

export function getRepositoryStatus(): Kefir.Property<Immutable.Map<string, boolean>> {
  const req = request.get(ENDPOINT)
    .type('application/json')
    .accept('application/json');
  return Kefir.fromNodeCallback(
    (cb) => req.end((err, res) => cb(err, res.body))
  ).map(status => Immutable.Map(status)).toProperty();
}

const repositories = getRepositoryStatus().map(rs => rs.keySeq().toArray());
export function guessResourceRepository(resource: Rdf.Iri): Kefir.Property<Data.Maybe<string>> {
  return repositories.flatMap(
    rs => Kefir.combine(
      rs.map(r => executeGuessQuery(r, resource).map(resp => ([r, resp] as [string, boolean])))
    )
  ).map(
    responses =>
      Maybe.fromNullable(
        _.find(responses, ([_, resp]) => resp)
      ).map(([repo, _]) => repo)
  ).toProperty();
}

const GUESS_QUERY = SparqlUtil.Sparql`ASK { ?__value__ a ?type }`;
function executeGuessQuery(repository: string, resource: Rdf.Iri): Kefir.Property<boolean> {
  return SparqlClient.ask(
    SparqlClient.setBindings(GUESS_QUERY, {'__value__': resource}),
    {context: {repository: repository}}
  );
}
