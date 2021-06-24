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
import * as SparqlJs from 'sparqljs';
import * as request from 'platform/api/http';
import * as Immutable from 'immutable';

import { SparqlUtil } from 'platform/api/sparql';

import { CompositeValue, EmptyValue, FieldValue } from '../FieldValues';
import { RawSparqlPersistence } from './RawSparqlPersistence';
import { TriplestorePersistence } from './TriplestorePersistence';

export interface SparqlPersistenceConfig {
  type?: 'sparql';
  repository?: string;
  targetGraphIri?: string;
  targetInsertGraphIri?: string;
}

export class SparqlPersistence implements TriplestorePersistence {
  constructor(private config: SparqlPersistenceConfig = {}) {}

  persist(initialModel: CompositeValue | EmptyValue, currentModel: CompositeValue | EmptyValue): Kefir.Property<void> {
    const {repository = 'default', targetGraphIri, targetInsertGraphIri} = this.config;
    const updateQueries =
      RawSparqlPersistence.createFormUpdateQueries(
        initialModel, currentModel, targetGraphIri, targetInsertGraphIri
      );

    const stringQueries = Immutable.List<SparqlJs.ConstructQuery>(updateQueries)
      .map(SparqlUtil.serializeQuery)
      .flatten();

    const req = request
      .post('/form-persistence/sparql')
      .type('application/json')
      .query({ repository })
      .send(stringQueries);
    return Kefir.fromNodeCallback<void>((cb) => req.end((err, res) => cb(err, res.body))).toProperty();
  }

  remove(model: CompositeValue): Kefir.Property<void> {
    return this.persist(model, FieldValue.empty);
  }

  dryPersist(
    initialModel: CompositeValue | EmptyValue,
    currentModel: CompositeValue | EmptyValue,
  ) {
    return RawSparqlPersistence.dryRun(initialModel, currentModel, this.config.targetGraphIri, this.config.targetInsertGraphIri);
  }

}
