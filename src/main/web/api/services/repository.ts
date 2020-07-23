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
import * as request from 'platform/api/http';
import * as Immutable from 'immutable';
import * as Maybe from 'data.maybe';
import * as _ from 'lodash';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { requestAsProperty } from 'platform/api/async';

const ENDPOINT = '/rest/repositories';

function composeErrorMessage(err): string {
  return err.message + '. ' + err.response.text;
}

export const SparqlRepositoryType = 'researchspace:SPARQLRepository';
export const NeptuneRepositoryType = 'researchspace:NeptuneSPARQLRepository';
export const Rdf4jRepositoryType = 'openrdf:SailRepository';
export const EphedraRepositoryType = 'researchspace:FederationSailRepository';
export type RepositoryType =
  | typeof SparqlRepositoryType
  | typeof NeptuneRepositoryType
  | typeof Rdf4jRepositoryType
  | typeof EphedraRepositoryType;

export interface RepositoryInfo {
  id: string;
  description: string;
  type: RepositoryType;
}

export function getRepositoryConfig(id: string): Kefir.Property<string> {
  const req = request.get(`${ENDPOINT}/config/${id}`).accept('text/turtle');
  return fromRequest(req, (err, res) => res.text);
}

export function deleteRepositoryConfig(id: string): Kefir.Property<string> {
  const req = request.delete(`${ENDPOINT}/config/${id}`);
  return fromRequest(req, (err, res) => res.text);
}

export function getRepositoryInfo(id: string): Kefir.Property<RepositoryInfo> {
  const req = request.get(`${ENDPOINT}/info/${id}`).accept('application/json');
  return fromRequest(req, (err, res) => res.body);
}

export function validateDefault(): Kefir.Property<boolean> {
  const req = request.get(`${ENDPOINT}/validatedefault`).accept('application/json');
  return fromRequest(req, (err, res) => (err ? false : res.body.valid));
}

export function getRepositoryConfigTemplate(id: string): Kefir.Property<string> {
  const req = request.get(`${ENDPOINT}/templates/${id}`).accept('text/turtle');
  return fromRequest(req, (err, res) => res.text);
}

export function updateOrAddRepositoryConfig(id: string, turtle: string, validate = false): Kefir.Property<string> {
  const req = request.post(`${ENDPOINT}/config/${id}`).send(turtle).query({ validate }).type('text/turtle');
  return fromRequest(req, (err, res) => res.text);
}

export function getRepositoryConfigTemplates(): Kefir.Property<string[]> {
  const req = request.get(`${ENDPOINT}/templates`).type('application/json').accept('application/json');
  return fromRequest(req, (err, res) => res.body);
}

export function getRepositoryStatus(): Kefir.Property<Immutable.Map<string, boolean>> {
  const req = request.get(ENDPOINT).type('application/json').accept('application/json');
  return fromRequest(req, (err, res) => res.body).map((status) => Immutable.Map(status));
}

let repositories: Kefir.Property<Array<string>>;
export function guessResourceRepository(resource: Rdf.Iri): Kefir.Property<Data.Maybe<string>> {
  return repositories
    .flatMap((rs) =>
      Kefir.combine(rs.map((r) => executeGuessQuery(r, resource).map((resp) => [r, resp] as [string, boolean])))
    )
    .map((responses) => Maybe.fromNullable(_.find(responses, ([_, resp]) => resp)).map(([repo, _]) => repo))
    .toProperty();
}

const GUESS_QUERY = SparqlUtil.Sparql`ASK { ?__value__ a ?type }`;
function executeGuessQuery(repository: string, resource: Rdf.Iri): Kefir.Property<boolean> {
  return SparqlClient.ask(SparqlClient.setBindings(GUESS_QUERY, { __value__: resource }), {
    context: { repository: repository },
  });
}

function fromRequest<T>(
  request: request.SuperAgentRequest,
  getValue: (err: any, res: request.Response) => T
): Kefir.Property<T> {
  return Kefir.fromNodeCallback<T>((cb) =>
    request.end((err, res) => {
      cb(err ? composeErrorMessage(err) : null, getValue(err, res));
    })
  ).toProperty();
}

class DefaultRepositoryInfoClass {
  private isValid: boolean;

  public init = () => {
    repositories = getRepositoryStatus().map((rs) => rs.keySeq().toArray());
    return validateDefault().onValue((v) => (this.isValid = v));
  };

  public isValidDefault = () => {
    return this.isValid;
  };
}

export const DefaultRepositoryInfo = new DefaultRepositoryInfoClass();
