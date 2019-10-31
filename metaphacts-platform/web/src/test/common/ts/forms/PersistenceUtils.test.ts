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
import * as SparqlJs from 'sparqljs';

import {
  parseQueryStringAsUpdateOperation,
} from 'platform/components/forms';

describe('parse insert query string and cast into SparqlJs.Update object', () => {
  it('insertPattern is valid insert query string', function () {
    const value = parseQueryStringAsUpdateOperation(`INSERT {
      <http://testsubject> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://testtype>.
    } WHERE {}`);

    const expectedUpdate: SparqlJs.Update = {
      type: 'update',
      prefixes: {},
      updates: [
        {
          updateType: 'insertdelete',
          insert: [
            {
              type: 'bgp',
              triples: [
                {
                  subject: 'http://testsubject' as SparqlJs.Term,
                  predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' as SparqlJs.Term,
                  object: 'http://testtype' as SparqlJs.Term,
                },
              ],
            },
          ],
          delete: [],
          where: [],
        },
      ],
    };

    expect(value).to.be.deep.equal(expectedUpdate);
  });

  it('insert is not an insert (i.e. not an update operation)', function () {
    expect(() => {
      parseQueryStringAsUpdateOperation(`SELECT * WHERE { $subject a $value. }`);
    }).to.throw('Specified deletePattern or insertPattern is not an update query.');
  });
});
