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

import { createElement } from 'react';
import * as D from 'react-dom-factories';
import { expect } from 'chai';
import * as sinon from 'sinon';

import { __unsafe__setCurrentResource } from 'platform/api/navigation';
import { Rdf, vocabularies } from 'platform/api/rdf';
import { FieldValue, PlainTextInput, FieldDefinitionProp } from 'platform/components/forms';

import { mockConfig } from 'platform-tests/mocks';

import { AsyncForm } from './fixturies/AsyncForm';
import { FIELD_DEFINITION } from './fixturies/FieldDefinition';

mockConfig();
__unsafe__setCurrentResource(Rdf.iri('test'));

const ADD_BUTTON_SELECTOR = '.cardinality-support__add-value';
const REMOVE_BUTTON_SELECTOR = '.cardinality-support__remove-value';

const children = [
  createElement(PlainTextInput, { for: FIELD_DEFINITION.id }),
  D.button({ name: 'reset' }),
  D.button({ name: 'submit' }),
];

describe('SemanticForm', () => {
  const server = sinon.fakeServer.create();
  server.respondWith('GET', '/rest/data/rdf/namespace/getRegisteredPrefixes', [
    200,
    { 'Content-Type': 'application/json' },
    '{ }',
  ]);

  it('loads and renders fields', () => {
    const fields = [FIELD_DEFINITION];
    return new AsyncForm(fields, children).mount().then((basicForm) => {
      const form = basicForm.wrapper;
      expect(form.find('SemanticForm'), 'should have text field').to.have.length(1);
      expect(form.find('[name="submit"]', 'should have submit button')).to.have.length(1);
      expect(form.find('[name="reset"]'), 'should have reset button').to.have.length(1);
    });
  });

  it('have correct state after input change', () => {
    const fieldsWithString: FieldDefinitionProp[] = [
      {
        ...FIELD_DEFINITION,
        xsdDatatype: vocabularies.xsd._string,
      },
    ];
    return new AsyncForm(fieldsWithString, children)
      .mount()
      .then((basicForm) => {
        return basicForm.performChangeAndWaitUpdate(() => {
          const form = basicForm.wrapper;
          form.find('input').simulate('change', { target: { value: 'testValue' } });
        });
      })
      .then((basicForm) => {
        const fieldStates = basicForm.model ? basicForm.model.fields.toArray() : [];
        expect(fieldStates.length).to.be.greaterThan(0, 'should have model with field state after change');

        const fieldValues = fieldStates[0].values;
        expect(fieldValues.size).to.be.equal(1, 'should have exactly one value after change');
        const formRdfValue = FieldValue.asRdfNode(fieldValues.first());

        expect(formRdfValue.value).to.equal('testValue', 'should have field with correct value after change');
        expect(formRdfValue.isLiteral(), 'should have field of type literal after change').to.be.true;
        expect((formRdfValue as Rdf.Literal).datatype.value).to.equal(
          vocabularies.xsd._string.value,
          'should have field of data type xsd:string after change'
        );
      });
  });

  it('should support maxOccur', () => {
    const fields = [FIELD_DEFINITION];
    return new AsyncForm(fields, children)
      .mount()
      .then((basicForm) => {
        const form = basicForm.wrapper;

        const addButton = form.find(ADD_BUTTON_SELECTOR);
        expect(addButton, 'should have one add button').to.have.length(1);

        return basicForm.performChangeAndWaitUpdate(() => addButton.simulate('click'));
      })
      .then((basicForm) => {
        const form = basicForm.wrapper;
        expect(
          form.find('PlainTextInput').length,
          'should be able to add value when does not exceed maxOccur'
        ).to.be.eql(2);

        const addButton = form.find(ADD_BUTTON_SELECTOR);
        expect(addButton).to.have.length(0, "can't add field when its exceed maxOccur");
      });
  });

  it('should support minOccur', () => {
    const fieldsWithOptional: FieldDefinitionProp[] = [
      {
        ...FIELD_DEFINITION,
        minOccurs: 0,
      },
    ];
    return new AsyncForm(fieldsWithOptional, children)
      .mount()
      .then((basicForm) => {
        const form = basicForm.wrapper;
        const removeButton = form.find(REMOVE_BUTTON_SELECTOR).first();
        return basicForm.performChangeAndWaitUpdate(() => removeButton.simulate('click'));
      })
      .then((basicForm) => {
        const form = basicForm.wrapper;
        expect(form.find('PlainTextInput').length, 'can remove field when does not fall behind minOccur').to.be.eql(0);
        const removeButton = form.find(REMOVE_BUTTON_SELECTOR);
        expect(removeButton.length, "can't remove field when its exceed minOccur").to.be.eql(0);
      });
  });
});
