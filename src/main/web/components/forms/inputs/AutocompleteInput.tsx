/**
 * ResearchSpace
 * Copyright (C) 2022-2025, © Kartography Community Interest Company
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
import {getResourceConfigurationEditForm} from './ResourceConfigHelper';

import { FieldDefinition, getPreferredLabel } from '../FieldDefinition';
import { FieldValue, AtomicValue, EmptyValue } from '../FieldValues';
import { NestedModalForm, tryExtractNestedForm } from './NestedModalForm';
import {
  SingleValueInput, AtomicValueInput, AtomicValueInputProps,
} from './SingleValueInput';
import { createDropAskQueryForField } from '../ValidationHelpers';
import { ValidationMessages } from './Decorations';
import Icon from 'platform/components/ui/icon/Icon';
import ResourceLinkContainer from 'platform/api/navigation/components/ResourceLinkContainer';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';

import { DropdownWithFilter } from './dropdown/DropdownWithFilter';
import { RdfLiteral } from 'platform/ontodia/src/ontodia';
import { ConfigHolder } from 'platform/api/services/config-holder';


type nestedFormEl = {
  label?: string,
  nestedForm?: string,
  modalId?: string,
  parentIri?: string,
  passValuesFor?: string[]
}

export interface AutocompleteInputProps extends AtomicValueInputProps {
  template?: string;
  placeholder?: string;
  nestedFormTemplate?: string;
  minimumInput?: number;
  nestedFormTemplates?: nestedFormEl[];
  /**
   * @default false
   * If set to true, the resource can not be edited and the Edit button will not be shown and will not possible to open the resource in a new tab
   */
  readonlyResource?: boolean;
  /**
   * If set to false, the filter input in the dropdown will be hidden
   * @default true
   */
  showDropdownFilter?: boolean;
}

interface SelectValue {
  value: Rdf.Node;
  label: Rdf.Literal;
}

interface State {
  nestedForm?: React.ReactElement<any>;
  nestedFormOpen?: boolean;
  activeForm?: string;
  valueSelectedWithoutEditForm?: boolean;
  nestedFormTemplates?: nestedFormEl[];
  labelFormSelected?: string;
  modalId?: string;
  parentIri?: string;
  passValuesFor?: string[];
  filterValue?: string;
}

const CLASS_NAME = 'autocomplete-text-field';
const MINIMUM_LIMIT = 3;
const DEFAULT_TEMPLATE = `<span title="{{label.value}}">{{label.value}}</span>`;

export class AutocompleteInput extends AtomicValueInput<AutocompleteInputProps, State> {
  private tupleTemplate: string = null;
  private htmlElement = React.createRef<HTMLDivElement>();
  

  constructor(props: AutocompleteInputProps, context: any) {
    super(props, context);
    this.state = { 
      nestedFormOpen: false ,
      nestedFormTemplates: [],
      filterValue: ''
    };
    this.tupleTemplate = this.tupleTemplate || this.compileTemplate();
  }

  private compileTemplate() {
    return this.props.template ? this.props.template.replace(/\\/g, '') : DEFAULT_TEMPLATE;
  }

  componentDidMount() {
    if(!_.isEmpty(this.props.nestedFormTemplates)) {
      this.setState({
        nestedFormTemplates: this.props.nestedFormTemplates
      })
    }

    if (FieldValue.isAtomic(this.props.value)) {
      const rdfNode = FieldValue.asRdfNode(this.props.value);      
      getResourceConfigurationEditForm(Rdf.iri(rdfNode.value),this.context)
          .then(binding=>{
            if (binding.resourceFormIri) {
              if (binding.scheme)
                this.setState({activeForm: `{{> "${binding.resourceFormIri.value}" nested=true editable=true mode="edit" scheme="${binding.scheme.value}"}}`});
              else  
                this.setState({activeForm: `{{> "${binding.resourceFormIri.value}" nested=true editable=true mode="edit"}}`});
            }
            else
                {this.setState({activeForm: undefined, valueSelectedWithoutEditForm: true});}})
          .catch(error => {this.setState({activeForm: undefined, valueSelectedWithoutEditForm: true});});
    } else {
      this.setState({activeForm: undefined, valueSelectedWithoutEditForm: false});
    }
  }

  openSelectedNestedForm = (formTemplate: string, parentIri?: string, passValuesFor?: string[]) => {
    
    tryExtractNestedForm(this.props.children, this.context, formTemplate, Rdf.iri(parentIri), passValuesFor)
      .then(nestedForm => {
        if (nestedForm != undefined) {
         this.setState({nestedForm});
          this.toggleNestedForm()
        }
      });
  }

  private onEditHandler(iri: Rdf.Iri) {  
    if(iri) {      
      // if a resource configuration form is found, open in a modal that form
      if (this.state.activeForm !== undefined) {
          this.openSelectedNestedForm(this.state.activeForm)
      } this.setState({valueSelectedWithoutEditForm: true});
    } else {
      this.setState({activeForm: undefined, valueSelectedWithoutEditForm: false});
    }
  }

  private onDropdownSelectHandler(label: string) {
    const nestedFormTemplateSelected = this.state.nestedFormTemplates.filter((e) => e.label === label)[0].nestedForm
    const modalId = this.state.nestedFormTemplates.filter((e) => e.label === label)[0].modalId
    const parentIri = this.state.nestedFormTemplates.filter((e) => e.label === label)[0].parentIri
    const passValuesFor = this.state.nestedFormTemplates.filter((e) => e.label === label)[0].passValuesFor
    this.setState({
      labelFormSelected: label,
      modalId: modalId,
      parentIri: parentIri,
      passValuesFor: passValuesFor
    })
    this.openSelectedNestedForm(nestedFormTemplateSelected, parentIri, passValuesFor)
  }

  render() {
    const rdfNode = FieldValue.asRdfNode(this.props.value);
    const value = FieldValue.isAtomic(this.props.value)
      ? {
          value: rdfNode,
          label: Rdf.literal(this.props.value.label || rdfNode.value),
        }
      : undefined;
  
    return (
      <div className={CLASS_NAME} ref={this.htmlElement}>
        { 
          this.renderSelect(value)
    
        }
        <ValidationMessages errors={FieldValue.getErrors(this.props.value)} />
        {this.state.nestedFormOpen ? (
          <NestedModalForm
            modalId={this.state.modalId}
            subject={
            FieldValue.isEmpty(this.props.value) ? null : this.props.value.value as Rdf.Iri
            }
            title={value?.label.value ?? this.state.labelFormSelected}
            definition={this.props.definition}
            onSubmit={this.onNestedFormSubmit}      
            onCancel={() => {this.setState({ nestedFormOpen: false });}}
            parent={this.htmlElement}
            parentIri={this.state.parentIri}
            passValuesFor={this.state.passValuesFor}
          >
            {this.state.nestedForm}
          </NestedModalForm>
        ) : null}
      </div>
    );
  }

  private onNestedFormSubmit = (value: AtomicValue) => {    
    if (value) {
      getResourceConfigurationEditForm(Rdf.iri(value.value.value),this.context)
          .then(binding=>{
            if (binding.resourceFormIri) {
              if (binding.scheme)
                this.setState({activeForm: `{{> "${binding.resourceFormIri.value}" nested=true editable=true mode="edit" scheme="${binding.scheme.value}"}}`});
              else  
                this.setState({activeForm: `{{> "${binding.resourceFormIri.value}" nested=true editable=true mode="edit"}}`});
            }
            else
                {this.setState({activeForm: undefined, valueSelectedWithoutEditForm: true});}})
          .catch(error => {this.setState({activeForm: undefined, valueSelectedWithoutEditForm: true});});
    }
    else {
      this.setState({activeForm: undefined, valueSelectedWithoutEditForm: false})
    }    

    this.setState({ nestedFormOpen: false});
    this.setAndValidate(value);
  };

  private renderSelect(value: any) {
    const definition = this.props.definition;
    const placeholder =
      typeof this.props.placeholder === 'undefined'
        ? this.createDefaultPlaceholder(definition)
        : this.props.placeholder;
    
    const current_value = FieldValue.isAtomic(this.props.value)
      ? (this.props.value.value as Rdf.Iri).value: undefined;
    const isFieldValueEmpty = FieldValue.isEmpty(this.props.value)
    
    const showLinkResourceButton = !isFieldValueEmpty && !this.props.readonlyResource
    const showEditButton = !isFieldValueEmpty && !this.props.readonlyResource
    const showCreateNewDropdown = !_.isEmpty(this.state.nestedFormTemplates) && this.state.nestedFormTemplates.length > 1 && !this.state.valueSelectedWithoutEditForm && isFieldValueEmpty
    const showCreateNewButton = !_.isEmpty(this.state.nestedFormTemplates) && this.state.nestedFormTemplates.length === 1 && !this.state.valueSelectedWithoutEditForm && isFieldValueEmpty

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
                outline: '2px dashed var(--color-dark)'
              },
              enabledHover: {
                outline: '4px dashed var(--color-dark)'
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
        { showCreateNewButton && (
          <Button className={`${CLASS_NAME}__create-button btn-textAndIcon`} onClick={() => this.onDropdownSelectHandler(this.state.nestedFormTemplates[0].label)}>
            <Icon iconType='round' iconName='add'/>
          </Button>
        )}
        { showCreateNewDropdown && (
          <DropdownWithFilter
            id="add-form"
            icon="add"
            items={this.state.nestedFormTemplates}
            filterValue={this.state.filterValue || ''}
            onFilterChange={v => this.setState({ filterValue: v })}
            onSelect={item => this.onDropdownSelectHandler(String(item.label))}
            getLabel={item => String(item.label)}
            placeholder="Filter..."
            noResultsText="No results"
            showFilter={this.props.showDropdownFilter}
          />
        )}
        { showEditButton && 
          <Button className={`${CLASS_NAME}__create-button btn-textAndIcon`} title='Edit' onClick={() => {this.onEditHandler(value.value as Rdf.Iri)}}>
            <Icon iconType='rounded' iconName='edit' symbol/>
          </Button>
        }
        {showLinkResourceButton && 
          <ResourceLinkContainer 
            uri={ConfigHolder.getDashboard().value} 
            urlqueryparam-view="resource-editor"
            urlqueryparam-open-as-drag-and-drop="true"
            urlqueryparam-resource={current_value}
          >
            <Button className={`${CLASS_NAME}__open-in-new-tab`} title='Edit in new draggable tab'>
              <Icon iconType='rounded' iconName='read_more' symbol={true} />
            </Button>
        </ResourceLinkContainer>
        }
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
      
      getResourceConfigurationEditForm(Rdf.iri(selected.value.value),this.context)
          .then(binding=>{ 
            if (binding.resourceFormIri) {
              if (binding.scheme)
                this.setState({activeForm: `{{> "${binding.resourceFormIri.value}" nested=true editable=true mode="edit" scheme="${binding.scheme.value}"}}`});
              else  {
                this.setState({activeForm: `{{> "${binding.resourceFormIri.value}" nested=true editable=true mode="edit"}}`});}
            }       
            else
                {this.setState({activeForm: undefined, valueSelectedWithoutEditForm: true});}})
          .catch(error => {this.setState({activeForm: undefined, valueSelectedWithoutEditForm: true});});
    } else {
      value = FieldValue.empty;
      this.setState({activeForm: undefined, valueSelectedWithoutEditForm: false});
    }

    this.setState({ nestedFormOpen: false });
    this.setAndValidate(value);
  };

  private createDefaultPlaceholder(definition: FieldDefinition): string {
    const fieldName = (getPreferredLabel(definition.label) || 'entity').toLocaleLowerCase();
    return `Search and select ${fieldName}`;
  }

  static makeHandler = AtomicValueInput.makeAtomicHandler;
}

SingleValueInput.assertStatic(AutocompleteInput);

export default AutocompleteInput;

