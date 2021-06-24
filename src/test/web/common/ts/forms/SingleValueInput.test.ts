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

import { Rdf, XsdDataTypeValidation, vocabularies } from 'platform/api/rdf';
import { validateType, FieldValue } from 'platform/components/forms';

import { mockConfig } from 'platform-tests/mocks';

import { DATATYPES_FIXTURIES } from './fixturies/Datatypes';

mockConfig();

describe('SingleValueInput Component', () => {
  it('correctly validates form values', () => {
    for (const fixture of DATATYPES_FIXTURIES) {
      const datatype = XsdDataTypeValidation.parseXsdDatatype(fixture.datatype).iri;
      const isIri = datatype.equals(vocabularies.xsd.anyURI);

      for (const validValue of fixture.values.valid) {
        const rdfValue = isIri ? Rdf.iri(validValue as string) : Rdf.literal(validValue, datatype);
        const result = validateType({ value: rdfValue }, datatype);
        expect(FieldValue.getErrors(result).size).to.be.equal(
          0,
          `${rdfValue} should be valid value of type <${XsdDataTypeValidation.datatypeToString(datatype)}>, ` +
            `but there was errors: ` +
            FieldValue.getErrors(result)
              .map((e) => `"${e.message}"`)
              .join('\n')
        );
      }

      for (const invalidValue of fixture.values.invalid) {
        const rdfValue = isIri ? Rdf.iri(invalidValue as string) : Rdf.literal(invalidValue, datatype);
        const result = validateType({ value: rdfValue }, datatype);
        expect(FieldValue.getErrors(result).size).to.be.equal(
          1,
          `Validation "${rdfValue} is <${XsdDataTypeValidation.datatypeToString(datatype)}>" should produce ` +
            `the following error: "${fixture.invalidMessage}" but there was none.`
        );
        expect(FieldValue.getErrors(result).first().message).to.be.equal(
          fixture.invalidMessage,
          `Invalid error message when validating "${rdfValue} is <${XsdDataTypeValidation.datatypeToString(datatype)}>"`
        );
      }
    }
  });
});
