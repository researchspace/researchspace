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
import * as React from 'react';
import { Button } from 'react-bootstrap';
import * as _ from 'lodash';

import { Rdf } from 'platform/api/rdf';
import { AutoCompletionInput } from 'platform/components/ui/inputs';

import { FieldDefinition, getPreferredLabel } from '../FieldDefinition';
import { FieldValue, AtomicValue, EmptyValue } from '../FieldValues';
import { NestedModalForm, tryExtractNestedForm } from './NestedModalForm';
import {
  SingleValueInput, AtomicValueInput, AtomicValueInputProps,
} from './SingleValueInput';
import { createDropAskQueryForField } from '../ValidationHelpers';
import { ValidationMessages } from './Decorations';

export interface AutocompleteInputProps extends AtomicValueInputProps {
  template?: string;
  placeholder?: string;
  nestedFormTemplate?: string;
  minimumInput?: number;
}

interface SelectValue {
  value: Rdf.Node;
  label: Rdf.Literal;
}

interface State {
  nestedForm?: React.ReactElement<any>;
  nestedFormOpen?: boolean;
}

const CLASS_NAME = 'autocomplete-text-field';
const MINIMUM_LIMIT = 3;
const DEFAULT_TEMPLATE = `<span title="{{label.value}}">{{label.value}}</span>`;

export class AutocompleteInput extends AtomicValueInput<AutocompleteInputProps, State> {
  private tupleTemplate: string = null;
  private htmlElement = React.createRef<HTMLDivElement>();

  constructor(props: AutocompleteInputProps, context: any) {
    super(props, context);
    this.state = { nestedFormOpen: false };
    this.tupleTemplate = this.tupleTemplate || this.compileTemplate();
  }

  private compileTemplate() {
    return this.props.template ? this.props.template.replace(/\\/g, '') : DEFAULT_TEMPLATE;
  }

  componentDidMount() {
    tryExtractNestedForm(this.props.children, this.appliedTemplateScope, this.props.nestedFormTemplate)
      .then(nestedForm => {
        if (nestedForm != undefined) {
          this.setState({nestedForm});
        }
      });
  }

  render() {
    const showCreateNewButton = !_.isEmpty(this.state.nestedForm);
    return (
      <div className={CLASS_NAME} ref={this.htmlElement}>
        {this.renderSelect(showCreateNewButton)}
        <ValidationMessages errors={FieldValue.getErrors(this.props.value)} />
        {this.state.nestedFormOpen ? (
          <NestedModalForm
            subject={
            FieldValue.isEmpty(this.props.value) ? null : this.props.value.value as Rdf.Iri
            }
            definition={this.props.definition}
            onSubmit={this.onNestedFormSubmit}
            onCancel={() => this.setState({ nestedFormOpen: false })}
            parent={this.htmlElement}
          >
            {this.state.nestedForm}
          </NestedModalForm>
        ) : null}
      </div>
    );
  }

  private onNestedFormSubmit = (value: AtomicValue) => {
    this.setState({ nestedFormOpen: false });
    this.setAndValidate(value);
  };

  private renderSelect(showCreateNewButton: boolean) {
    const definition = this.props.definition;
    const rdfNode = FieldValue.asRdfNode(this.props.value);
    const placeholder =
      typeof this.props.placeholder === 'undefined'
        ? this.createDefaultPlaceholder(definition)
        : this.props.placeholder;
    const value = FieldValue.isAtomic(this.props.value)
      ? {
          value: rdfNode,
          label: Rdf.literal(this.props.value.label || rdfNode.value),
        }
      : undefined;

    return (
      <div className={`${CLASS_NAME}__main-row`}>
        <AutoCompletionInput
          key={definition.id}
          className={`${CLASS_NAME}__select`}
          autofocus={false}
          query={this.props.definition.autosuggestionPattern}
          placeholder={placeholder}
          droppable={{
            // enable droppable for autocomplete input
            query: createDropAskQueryForField(definition),
            styles: {
              enabled: {
                outline: '2px dashed #1D0A6E'
              },
              enabledHover: {
                outline: '4px dashed #1D0A6E'
              },
              disabled: {}
            }
          }}
          value={value}
          templates={{ suggestion: this.tupleTemplate }}
          actions={{
            // TODO due to the typing in AutocompleteInput, this accepts only a Dictionary<Rdf.Node>
            // however, what will be passed in is a SelectValue
            onSelected: this.onChange as (val: any) => void,
          }}
          minimumInput={this.props.minimumInput || MINIMUM_LIMIT}
        />
        {showCreateNewButton ? (
          <Button className={`${CLASS_NAME}__create-button`} onClick={this.toggleNestedForm}>
            {value === undefined ? <span className="fa fa-plus btn-icon-left" /> : null}
            {value === undefined ? <span> Create new</span> : <span>Edit</span>}
          </Button>
        ) : null}
      </div>
    );
  }

  private toggleNestedForm = () => {
    this.setState((state): State => ({ nestedFormOpen: !state.nestedFormOpen }));
  };

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
    this.setState({ nestedFormOpen: false });
    this.setAndValidate(value);
  };

  private createDefaultPlaceholder(definition: FieldDefinition): string {
    const fieldName = (getPreferredLabel(definition.label) || 'entity').toLocaleLowerCase();
    return `Search and select ${fieldName} here...`;
  }

  static makeHandler = AtomicValueInput.makeAtomicHandler;
}

SingleValueInput.assertStatic(AutocompleteInput);

export default AutocompleteInput;
