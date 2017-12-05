/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

import { FieldValue } from '../FieldValues';
import { AtomicValueInput, AtomicValueInputProps } from './SingleValueInput';
import { ValidationMessages } from './Decorations';

export interface HiddenInputProps extends AtomicValueInputProps {}

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
export class HiddenInput extends AtomicValueInput<HiddenInputProps, void> {
  static defaultProps: HiddenInputProps = {
    renderHeader: false,
  };

  render() {
    return createElement(ValidationMessages, {errors: FieldValue.getErrors(this.props.value)});
  }
}

export default HiddenInput;
