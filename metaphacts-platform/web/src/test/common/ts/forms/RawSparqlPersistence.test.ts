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

import { expect } from 'chai';
import * as Immutable from 'immutable';

import { Rdf } from 'platform/api/rdf';
import { SparqlUtil } from 'platform/api/sparql';

import {
  FieldDefinition,
  FieldState,
  FieldValue,
  CompositeValue,
  FieldError,
  RawSparqlPersistence,
  normalizeFieldDefinition,
} from 'platform/components/forms';

describe('RawSparqlPersistence', () => {
  const definition = normalizeFieldDefinition({
    id: 'platformLabel',
    label: 'Platform label',
    xsdDatatype: 'xsd:string',
    minOccurs: 0,
    maxOccurs: 3,
    selectPattern: 'prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
    'SELECT ?value WHERE {$subject rdfs:label ?value}',
    insertPattern: 'prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
    'INSERT { $subject rdfs:label $value } WHERE {}',
    deletePattern: 'prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> ' +
    'DELETE { $subject rdfs:label $value} WHERE {}',
  });

  const subject = Rdf.iri('http://www.metaphacts.com/resource/Start');

  const emptyModel: CompositeValue = {
    type: CompositeValue.type,
    subject,
    definitions: Immutable.Map<string, FieldDefinition>([[definition.id, definition]]),
    fields: Immutable.Map<string, FieldState>(),
    errors: FieldError.noErrors,
  };

  const values = Immutable.List<FieldValue>().push(
    FieldValue.fromLabeled({value: Rdf.literal('testValue')})
  );

  it('Return INSERT query if value has been added into form model', function () {
    const expectedQuery = [
      'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
      'INSERT { <http://www.metaphacts.com/resource/Start> ' +
        'rdfs:label "testValue"^^<http://www.w3.org/2001/XMLSchema#string>. }',
      'WHERE {  }',
    ].join('\n');

    const currentModel = CompositeValue.set(emptyModel, {
      fields: emptyModel.fields.set(definition.id, {
        values, errors: FieldError.noErrors,
      }),
    });

    const updateQueries = RawSparqlPersistence.createFormUpdateQueries(emptyModel, currentModel);
    updateQueries.forEach(query => {
      expect(SparqlUtil.serializeQuery(query)).to.equal(expectedQuery);
    });
  });

  it('Return DELETE query if value has been removed from form model', function () {
    const expectedQuery = [
      'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
      'DELETE { <http://www.metaphacts.com/resource/Start> ' +
        'rdfs:label "testValue"^^<http://www.w3.org/2001/XMLSchema#string>. }',
      'WHERE {  }',
    ].join('\n');

    const initialModel = CompositeValue.set(emptyModel, {
      fields: Immutable.Map<string, FieldState>().set(definition.id, {
        values, errors: FieldError.noErrors,
      }),
    });

    const updateQueries = RawSparqlPersistence.createFormUpdateQueries(initialModel, emptyModel);
    updateQueries.forEach(query => {
      expect(SparqlUtil.serializeQuery(query)).to.equal(expectedQuery);
    });
  });

  it('Don\'t return query if form model has not changed', function () {
    const updateQueries = RawSparqlPersistence.createFormUpdateQueries(emptyModel, emptyModel);
    expect(updateQueries.size).to.equal(0);
  });
});
