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

import * as Immutable from 'immutable';
import * as Kefir from 'kefir';
import * as SparqlJs from 'sparqljs';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';

import { CompositeValue, EmptyValue } from '../FieldValues';
import { parseQueryStringAsUpdateOperation } from './PersistenceUtils';
import { TriplestorePersistence, computeModelDiff } from './TriplestorePersistence';

export interface RawSparqlPersistenceConfig {
  type?: 'client-side-sparql';
  repository?: string;
}

export class RawSparqlPersistence implements TriplestorePersistence {
  constructor(private config: RawSparqlPersistenceConfig = {}) {}

  persist(
    initialModel: CompositeValue | EmptyValue,
    currentModel: CompositeValue | EmptyValue,
  ): Kefir.Property<void> {
    const updateQueries = RawSparqlPersistence.createFormUpdateQueries(initialModel, currentModel);
    if (updateQueries.size === 0) {
      return Kefir.constant<void>(undefined);
    }
    updateQueries.forEach(query => {
      console.log(SparqlUtil.serializeQuery(query));
    });
    const {repository = 'default'} = this.config;
    const context: SparqlClient.QueryContext = {repository};
    const updateOperations = Kefir.zip<void>(updateQueries.map(
      query => SparqlClient.executeSparqlUpdate(query, {context})).toArray());
    return updateOperations.map(() => {/* void */}).toProperty();
  }

  static createFormUpdateQueries(
    initialModel: CompositeValue | EmptyValue,
    currentModel: CompositeValue | EmptyValue,
  ): Immutable.List<SparqlJs.Update> {
    const entries = computeModelDiff(initialModel, currentModel);
    return Immutable.List(entries)
      .filter(({definition}) => Boolean(definition.insertPattern && definition.deletePattern))
      .map(({definition, subject, inserted, deleted}) => {
        const deleteQuery = parseQueryStringAsUpdateOperation(definition.deletePattern);
        const insertQuery = parseQueryStringAsUpdateOperation(definition.insertPattern);
        return createFieldUpdateQueries(subject, deleteQuery, insertQuery, inserted, deleted);
      }).filter(update => update.size > 0).flatten().toList();
  }
}

function createFieldUpdateQueries(
  subject: Rdf.Iri,
  deleteQuery: SparqlJs.Update | undefined,
  insertQuery: SparqlJs.Update | undefined,
  inserted: ReadonlyArray<Rdf.Node>,
  deleted: ReadonlyArray<Rdf.Node>,
): Immutable.List<SparqlJs.Update> {
  let queries = Immutable.List<SparqlJs.Update>();

  if (deleted.length === 0 && inserted.length === 0) {
    return queries;
  }

  const paramterize = (query: SparqlJs.Update, value: Rdf.Node) =>
    SparqlClient.setBindings(query, {
      'subject': subject,
      'value': value,
    });

  if (deleteQuery) {
    queries = queries.concat(
      deleted.map(value => paramterize(deleteQuery, value)));
  }
  if (insertQuery) {
    queries = queries.concat(
      inserted.map(value => paramterize(insertQuery, value)));
  }
  return queries;
}
