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

import { createElement } from 'react';
import { expect } from 'chai';

import { Description, StaticFieldProps, normalizeFieldDefinition } from 'platform/components/forms';

import { shallow } from 'platform-tests/configuredEnzyme';
import { mockLanguagePreferences } from 'platform-tests/mocks';

import { FIELD_DEFINITION } from '../fixturies/FieldDefinition';

mockLanguagePreferences();

const PROPS: StaticFieldProps = {
  for: 'test',
  definition: normalizeFieldDefinition(FIELD_DEFINITION),
  model: undefined,
};

describe('Description', () => {
  const descriptionComponent = shallow(createElement(Description, PROPS));

  describe('render', () => {
    it('as span', () => {
      expect(descriptionComponent.find('span')).to.have.length(1);
    });

    it('with proper classname', () => {
      expect(descriptionComponent.find('.field-description')).to.have.length(1);
    });

    it('with correct inner text', () => {
      expect(descriptionComponent.text()).to.be.equal(FIELD_DEFINITION.description);
    });
  });
});
