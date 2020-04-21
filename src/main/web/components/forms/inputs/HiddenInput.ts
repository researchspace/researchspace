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
import * as Immutable from 'immutable';

import { FieldValue, FieldError } from '../FieldValues';
import { MultipleValuesInput, MultipleValuesProps } from './MultipleValuesInput';
import { ValidationMessages } from './Decorations';

export interface HiddenInputProps extends MultipleValuesProps {}

/**
 * Represents a hidden field, which will not be visible to the user and which
 * will be automatically saved as soon as the form is saved.
 *
 * @example
 * <semantic-form-hidden-input for='...' default-value='https://www.wikidata.org/wiki/Q2337004'>
 * </semantic-form-hidden-input>
 *
 * <semantic-form-hidden-input for='...' default-values='["Emmett Brown", "Marty McFly"]'>
 * </semantic-form-hidden-input>
 */
export class HiddenInput extends MultipleValuesInput<HiddenInputProps, {}> {
  static defaultProps: Partial<HiddenInputProps> = {
    renderHeader: false,
  };

  render() {
    const errors = Immutable.List<FieldError>().withMutations((list) => {
      this.props.values.forEach((value) => {
        FieldValue.getErrors(value).forEach((error) => {
          list.push(error);
        });
      });
    });
    return createElement(ValidationMessages, { errors });
  }
}

export default HiddenInput;
