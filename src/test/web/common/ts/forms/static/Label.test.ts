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
import { expect } from 'chai';

import { Label, StaticFieldProps, normalizeFieldDefinition } from 'platform/components/forms';

import { shallow } from 'platform-tests/configuredEnzyme';
import { mockConfig } from 'platform-tests/mocks';

import { FIELD_DEFINITION } from '../fixturies/FieldDefinition';

mockConfig();

const PROPS: StaticFieldProps = {
  for: 'test',
  definition: normalizeFieldDefinition(FIELD_DEFINITION),
  model: undefined,
};

describe('Field Static Label Component', () => {
  const labelComponent = shallow(createElement(Label, PROPS));

  describe('render', () => {
    it('as span', () => {
      expect(labelComponent.find('span')).to.have.length(1);
    });

    it('with proper classname', () => {
      expect(labelComponent.find('.field-label')).to.have.length(1);
    });

    it('with correct inner text', () => {
      expect(labelComponent.text()).to.be.equal(FIELD_DEFINITION.label);
    });
  });
});
