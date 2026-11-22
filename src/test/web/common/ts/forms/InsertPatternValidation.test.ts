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

import { expect } from 'chai';

import { FieldError, collectDefinitionErrors, normalizeFieldDefinition } from 'platform/components/forms';

const INSERT = 'INSERT { $subject <http://example.com/p> $value } WHERE {}';
const MOVE =
  'DELETE { ?previous <http://example.com/marker> true } ' +
  'INSERT { $subject <http://example.com/marker> true } ' +
  'WHERE { OPTIONAL { $value <http://example.com/has> ?previous . ?previous <http://example.com/marker> true } }';
const DELETE_ONLY = 'DELETE { $subject <http://example.com/p> $value } WHERE { $subject <http://example.com/p> $value }';

function insertPatternErrors(insertPattern: string, allowDeleteInInsertPattern?: boolean): string[] {
  const errors: FieldError[] = [];
  collectDefinitionErrors(normalizeFieldDefinition({ id: 'field', insertPattern, allowDeleteInInsertPattern }), errors);
  return errors.map((error) => error.message);
}

describe('insertPattern validation', () => {
  it('accepts INSERT ... WHERE', () => {
    expect(insertPatternErrors(INSERT)).to.be.empty;
    expect(insertPatternErrors(INSERT, true)).to.be.empty;
  });

  it('rejects DELETE ... INSERT ... WHERE unless the field opts in', () => {
    const errors = insertPatternErrors(MOVE);
    expect(errors).to.have.length(1);
    expect(errors[0]).to.contain('allowDeleteInInsertPattern');
    expect(insertPatternErrors(MOVE, true)).to.be.empty;
  });

  it('ignores a non-boolean opt-in', () => {
    expect(insertPatternErrors(MOVE, 'true' as any)).to.have.length(1);
  });

  it('always rejects a pure DELETE as insertPattern', () => {
    expect(insertPatternErrors(DELETE_ONLY)).to.have.length(1);
    expect(insertPatternErrors(DELETE_ONLY, true)).to.have.length(1);
  });
});
