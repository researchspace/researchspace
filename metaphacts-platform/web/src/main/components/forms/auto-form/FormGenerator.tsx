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

import { vocabularies } from 'platform/api/rdf';

import * as Inputs from '../inputs';
import { FormErrors } from '../static';
import { FieldDefinition } from '../FieldDefinition';

const {rdf, xsd} = vocabularies;

export interface GenerateFormFromFieldsParams {
  fields: ReadonlyArray<FieldDefinition>;
  overrides: ReadonlyArray<InputOverride>;
}

export interface InputOverride {
  readonly target: InputOverrideTarget;
  readonly input: FieldInputElement;
}

export interface InputOverrideTarget {
  fieldIri?: string;
  datatype?: string;
}

export type FieldInputElement =
  React.ReactElement<Inputs.SingleValueInputProps | Inputs.MultipleValuesProps>;

export function generateFormFromFields(params: GenerateFormFromFieldsParams): JSX.Element[] {
  const content: JSX.Element[] = [];
  for (const field of params.fields) {
    let lastMatched: FieldInputElement | undefined;
    for (const override of params.overrides) {
      const {fieldIri, datatype} = override.target;
      if (fieldIri && fieldIri === field.iri) {
        lastMatched = override.input;
      } else if (datatype && field.xsdDatatype && field.xsdDatatype.value === datatype) {
        lastMatched = override.input;
      }
    }
    const generatedInput = lastMatched
      ? React.cloneElement(lastMatched, {for: field.iri})
      : generateInputForField(field);
    content.push(generatedInput);
  }
  content.push(<FormErrors />);
  content.push(<button name='submit' className='btn btn-default'>Save</button>);
  content.push(<button name='reset' className='btn btn-default'>Reset</button>);
  return content;
}

function generateInputForField(field: FieldDefinition): JSX.Element {
  if (field.treePatterns) {
    return <Inputs.TreePickerInput for={field.id} />;
  }

  if (field.autosuggestionPattern) {
    return <Inputs.AutocompleteInput for={field.id} />;
  }

  if (field.valueSetPattern) {
    return <Inputs.SelectInput for={field.id} />;
  }

  if (field.xsdDatatype) {
    switch (field.xsdDatatype.value) {
      case xsd.date.value:
      case xsd.time.value:
      case xsd.dateTime.value: {
        return <Inputs.DatePickerInput for={field.id} />;
      }
      case xsd.boolean.value: {
        return <Inputs.CheckboxInput for={field.id} />;
      }
      case xsd._string.value:
      case rdf.langString.value: {
        return <Inputs.PlainTextInput for={field.id} />;
      }
    }
  }

  return <Inputs.PlainTextInput for={field.id} />;
}
