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

import * as React from 'react';

import * as Forms from 'platform/components/forms';

import {
  FieldConfigurationContext, assertFieldConfigurationItem,
} from './FieldConfigurationCommon';

/**
 * Overrides default inputs for given field or datatype when generating a semantic form
 */
export interface FieldInputOverrideConfig {
  /**
   * Field for which input have to be overridden. Only for-field or for-datatype can be specified.
   */
  forField?: string;

  /**
   * Datatype for input override. Only for-field or for-datatype can be specified.
   */
  forDatatype?: string;

  /**
   * Input instance for override. Should be exactly one component. for-field property will be
   * provided automatically when semantic-form is generated, all other properties will be preserved.
   */
  children: object;
}

export interface FieldInputOverrideProps extends FieldInputOverrideConfig {
  children: Forms.FieldInputElement;
}

export class FieldInputOverride extends React.Component<FieldInputOverrideProps> {
  static async configure(
    props: FieldInputOverrideProps,
    context: FieldConfigurationContext
  ): Promise<void> {
    const {forField, forDatatype, children} = props;
    if (forField && forDatatype) {
      throw new Error(
        `Cannot set both "for-field" and "for-datatype" for <ontodia-field-input-override>`
      );
    }
    if (!(forField || forDatatype)) {
      throw new Error(
        `Either "for-field" or "for-datatype" is required for <ontodia-field-input-override>`
      );
    }
    context.collectedInputOverrides.push({
      target: {
        fieldIri: forField,
        datatype: forDatatype,
      },
      input: React.Children.only(children),
    });
  }
}

assertFieldConfigurationItem(FieldInputOverride);

export default FieldInputOverride;
