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
import { Button } from 'react-bootstrap';

import { Rdf } from 'platform/api/rdf';
import { AutoCompletionInput } from 'platform/components/ui/inputs';

import { FieldDefinition, getPreferredLabel } from '../FieldDefinition';
import { FieldValue, AtomicValue, EmptyValue } from '../FieldValues';
import { NestedModalForm, tryExtractNestedForm } from './NestedModalForm';
import { SingleValueInput, AtomicValueInput, AtomicValueInputProps } from './SingleValueInput';
import { ValidationMessages } from './Decorations';

export interface AutocompleteInputProps extends AtomicValueInputProps {
  template?: string;
  placeholder?: string;
}

interface SelectValue {
  value: Rdf.Node;
  label: Rdf.Literal;
}

interface State {
  readonly nestedFormOpen?: boolean;
}

const CLASS_NAME = 'autocomplete-text-field';
const MINIMUM_LIMIT = 3;
const DEFAULT_TEMPLATE = `<span title="{{label.value}}">{{label.value}}</span>`;

export class AutocompleteInput extends AtomicValueInput<AutocompleteInputProps, State> {
  private tupleTemplate: string = null;

  constructor(props: AutocompleteInputProps, context: any) {
    super(props, context);
    this.state = {nestedFormOpen: false};
    this.tupleTemplate = this.tupleTemplate || this.compileTemplate();
  }

  private compileTemplate() {
    return this.props.template ? this.props.template.replace(/\\/g, '') : DEFAULT_TEMPLATE;
  }

  render() {
    const nestedForm = tryExtractNestedForm(this.props.children);
    const showCreateNewButton = Boolean(nestedForm);
    return (
      <div className={CLASS_NAME}>
        {this.renderSelect(showCreateNewButton)}
        <ValidationMessages errors={FieldValue.getErrors(this.props.value)} />
        {this.state.nestedFormOpen ? (
          <NestedModalForm definition={this.props.definition}
            onSubmit={this.onNestedFormSubmit}
            onCancel={() => this.setState({nestedFormOpen: false})}>
            {nestedForm}
          </NestedModalForm>
        ) : null}
      </div>
    );
  }

  private onNestedFormSubmit = (value: AtomicValue) => {
    this.setState({nestedFormOpen: false});
    this.setAndValidate(value);
  }

  private renderSelect(showCreateNewButton: boolean) {
    const definition = this.props.definition;
    const rdfNode = FieldValue.asRdfNode(this.props.value);
    const placeholder = typeof this.props.placeholder === 'undefined'
      ? this.createDefaultPlaceholder(definition) : this.props.placeholder;
    const value = FieldValue.isAtomic(this.props.value) ? {
      value: rdfNode,
      label: Rdf.literal(this.props.value.label || rdfNode.value),
    } : undefined;

    return (
      <div className={`${CLASS_NAME}__main-row`}>
        <AutoCompletionInput
          key={definition.id}
          className={`${CLASS_NAME}__select`}
          autofocus={false}
          query={this.props.definition.autosuggestionPattern}
          placeholder={placeholder}
          value={value}
          templates={{suggestion: this.tupleTemplate}}
          actions={{
            // TODO due to the typing in AutocompleteInput, this accepts only a Dictionary<Rdf.Node>
            // however, what will be passed in is a SelectValue
            onSelected: this.onChange as (val: any) => void,
          }}
          minimumInput={MINIMUM_LIMIT}
        />
        {showCreateNewButton && value === undefined ? (
          <Button
            className={`${CLASS_NAME}__create-button`}
            bsStyle='default'
            onClick={this.toggleNestedForm}>
            <span className='fa fa-plus' />
            {' Create new'}
          </Button>
        ) : null}
      </div>
    );
  }

  private toggleNestedForm = () => {
    this.setState((state): State => ({nestedFormOpen: !state.nestedFormOpen}));
  }

  private onChange = (selected: SelectValue | null): void => {
    let value: AtomicValue | EmptyValue;
    if (selected) {
      value = FieldValue.fromLabeled({
        value: selected.value,
        label: selected.label.value,
      });
    } else {
      value = FieldValue.empty;
    }
    this.setState({nestedFormOpen: false});
    this.setAndValidate(value);
  }

  private createDefaultPlaceholder(definition: FieldDefinition): string {
    const fieldName = (getPreferredLabel(definition.label) || 'entity').toLocaleLowerCase();
    return `Search and select ${fieldName} here...`;
  }

  static makeHandler = AtomicValueInput.makeAtomicHandler;
}

SingleValueInput.assertStatic(AutocompleteInput);

export default AutocompleteInput;
