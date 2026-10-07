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

import { createElement } from 'react';
import * as D from 'react-dom-factories';
import ReactSelect from 'react-select';
import * as Immutable from 'immutable';
import * as React from 'react';
import { Button } from 'react-bootstrap';
import * as _ from 'lodash';

import { Cancellation } from 'platform/api/async/Cancellation';
import { Rdf } from 'platform/api/rdf';

import { TemplateItem } from 'platform/components/ui/template';

import { DropdownWithFilter } from './dropdown/DropdownWithFilter';
import { FieldDefinition, getPreferredLabel } from '../FieldDefinition';
import { FieldValue, AtomicValue, EmptyValue, SparqlBindingValue, ErrorKind, DataState } from '../FieldValues';
import { SingleValueInput, AtomicValueInput, AtomicValueInputProps } from './SingleValueInput';
import { ValidationMessages } from './Decorations';
import { queryValues } from '../QueryValues';
import { NestedModalForm, tryExtractNestedForm } from './NestedModalForm';
import Icon from 'platform/components/ui/icon/Icon';
import ResourceLinkContainer from 'platform/api/navigation/components/ResourceLinkContainer';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import {getResourceConfigurationEditForm} from './ResourceConfigHelper';
import { ConfigHolder } from 'platform/api/services/config-holder';

type nestedFormEl = {
  label?: string,
  nestedForm?: string,
  modalId?: string,
  parentIri?: string,
  passValuesFor?: string[]
}

export interface SelectInputProps extends AtomicValueInputProps {
  template?: string;
  
  placeholder?: string;
  
  /**
   * List of form templates used to create a new instance
   * Each form element needs to have a form template and a label
   *
   * If there is only 1 element, then a "New" button will be displayed
   * Otherwise, in case of more than 1 element, the "New" will be rendered as dropdown
   * 
   * @example this will render a dropdown with two labels, Actor and Group
   * 
   *  <semantic-form-select-input
   *     for='object_current_owner'
   *     for='object_current_owner'
   *     nested-form-templates='[
   *         {
   *             "label": "Actor",
   *             "nestedForm": "{{{{raw}}}}{{> \"http://www.researchspace.org/resource/system/forms/Actor\" nested=true editable=true mode=\"new\" }}{{{{/raw}}}}"
   *         },
   *         {
   *             "label": "Group",
   *             "nestedForm": "{{{{raw}}}}{{> \"http://www.researchspace.org/resource/system/forms/Group\" nested=true editable=true mode=\"new\" }}{{{{/raw}}}}"
   *         }
   *     ]'>
   *   </semantic-form-select-input>
   * 
   * * @example this will render a "New" button
   * 
   *  <semantic-form-select-input
   *     for='object_current_owner'
   *     for='object_current_owner'
   *     nested-form-templates='[
   *         {
   *             "label": "Group",
   *             "nestedForm": "{{{{raw}}}}{{> \"http://www.researchspace.org/resource/system/forms/Group\" nested=true editable=true mode=\"new\" }}{{{{/raw}}}}"
   *         }
   *     ]'>
   *   </semantic-form-select-input>
   *
   */
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

  /**
   * If set to true, re-initiates the value set each time the dropdown is opened
   * @default false
   */
  updateListOnOpen?: boolean;

}

interface State {
  valueSet?: Immutable.List<SparqlBindingValue>;
  nestedForm?: React.ReactElement<any>;
  nestedFormOpen?: boolean;
  activeForm?: string;
  nestedFormTemplates?: nestedFormEl[];
  labelFormSelected?: string;
  valueSelectedWithoutEditForm?: boolean;
  modalId?: string,
  parentIri?: string,
  passValuesFor?: string[]
  filterValue?: string;
}

const SELECT_TEXT_CLASS = 'select-text-field';
const OPTION_CLASS = SELECT_TEXT_CLASS + 'option';

export class SelectInput extends AtomicValueInput<SelectInputProps, State> {
  private readonly cancellation = new Cancellation();
  private htmlElement = React.createRef<HTMLDivElement>();

  private isLoading = true;

  constructor(props: SelectInputProps, context: any) {
    super(props, context);
    this.state = {
      valueSet: Immutable.List<SparqlBindingValue>(),
      nestedFormOpen: false,
      nestedFormTemplates: [],
      filterValue: ''
    };
  }

  dataState(): DataState {
    if (this.isLoading) {
      return DataState.Loading;
    }
    return DataState.Ready;
  }

  private initValueSet() {
    const { definition } = this.props;
    if (definition.valueSetPattern) {
      this.cancellation.map(queryValues(definition.valueSetPattern)).observe({
        value: (valueSet) => {
          this.isLoading = false;
          this.setState({ valueSet: Immutable.List(valueSet)});
          this.props.updateValue((v) => v);
        },
        error: (error) => {
          console.error(error);
          this.isLoading = false;
          this.props.updateValue((v) => {
            const nonEmpty = FieldValue.isEmpty(v) ? FieldValue.fromLabeled({ value: Rdf.iri('') }) : v;
            const errors = FieldValue.getErrors(nonEmpty).push({
              kind: ErrorKind.Loading,
              message: `Failed to load value set`,
            });
            return FieldValue.setErrors(nonEmpty, errors);
          });
        },
      });
    } else {
      this.isLoading = false;
    }
  }

  componentDidMount() {
    this.initValueSet()
    
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
                this.setState({activeForm: `{{> "${binding.resourceFormIri.value}" nested=true editable=true mode="edit" subject="${rdfNode.value}" scheme="${binding.scheme.value}"}}`});
              else  
                this.setState({activeForm: `{{> "${binding.resourceFormIri.value}" nested=true editable=true mode="edit" subject="${rdfNode.value}"}}`});
            }
            else
                {this.setState({activeForm: undefined, valueSelectedWithoutEditForm: true});}})
          .catch(error => {this.setState({activeForm: undefined, valueSelectedWithoutEditForm: true});});
    } else {
      this.setState({activeForm: undefined, valueSelectedWithoutEditForm: false});
    }

  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private onValueChanged = (value?: SparqlBindingValue) => {
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
    this.setState({ nestedFormOpen: false });
    this.setAndValidate(this.parseValue(value));
  };

  private toggleNestedForm = () => {
    this.setState((state): State => ({ nestedFormOpen: !state.nestedFormOpen }));
  };

  private parseValue(value: SparqlBindingValue): AtomicValue | EmptyValue {
    // this is for testing purpose only i.e. checking whether callback is called
    if (!value) {
      return FieldValue.empty;
    }

    const findCorresponding = this.state.valueSet.find((v) => v.value.equals(value.value));
    if (!findCorresponding) {
      return FieldValue.empty;
    }

    getResourceConfigurationEditForm(Rdf.iri(findCorresponding.value.value),this.context)
        .then(binding=>{
            if (binding.resourceFormIri) {
              if (binding.scheme)
                this.setState({activeForm: `{{> "${binding.resourceFormIri.value}" nested=true editable=true mode="edit" scheme="${binding.scheme.value}"}}`});
              else  
                this.setState({activeForm: `{{> "${binding.resourceFormIri.value}" nested=true editable=true mode="edit"}}`});
            }
          else {
            this.setState({activeForm: undefined, valueSelectedWithoutEditForm: true}); 
          }
        })
        .catch(error => {this.setState({activeForm: undefined, valueSelectedWithoutEditForm: true});} );
        
    // turn into field value for standard validation calls
    const corresponding: Partial<AtomicValue> = {
      value: findCorresponding.value,
      label: findCorresponding.label,
    };
    return AtomicValue.set(this.props.value, corresponding);
  }

  private optionRenderer = (option: SparqlBindingValue) => {
    if (this.props.template !== undefined) {
      return createElement(TemplateItem, {
        template: {
          source: this.props.template,
          options: option.binding,
        },
      });
    } else {
      // default option template
      return D.span({ id: option.label, className: OPTION_CLASS }, option.label || option.value.value);
    }
  };

  private valueRenderer = (v: AtomicValue | undefined) => {
    // that is if user adds a new input which get's empty as initial field value
    if (!v) {
      return;
    }
    
    const valueSet = this.state.valueSet;
    if (valueSet) {
      // try to find the selected value in the pre-computed valueSet
      const bindingValue = valueSet.find((setValue) => setValue.value.equals(v.value));
      // if existing, then use optionRenderer to exploit the template and additional bindings
      if (bindingValue) {
        return this.optionRenderer(bindingValue);
      }
    }

    // fallback rendering i.e. if recovering from state or saved value
    // but value is not any longer in dynamically (on every initialization) computed set
    return D.span({ id: v.label, className: OPTION_CLASS }, v.label || v.value.value);
  };

  private openSelectedNestedForm(formTemplate: string, parentIri?: string, passValuesFor?: string[]) {
    tryExtractNestedForm(this.props.children, this.context, formTemplate, Rdf.iri(parentIri), passValuesFor)
      .then(nestedForm => {
        if (nestedForm != undefined) {
         this.setState({nestedForm});
          this.toggleNestedForm()
        }
      });
  }

  private onEditHandler(selectedValue: AtomicValue) {
    if(!FieldValue.isEmpty(selectedValue)) {
      const iri = selectedValue.value as Rdf.Iri
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
      modalId,
      parentIri,
      passValuesFor
    })
    this.openSelectedNestedForm(nestedFormTemplateSelected, parentIri, passValuesFor)
  }

  render() {
    const definition = this.props.definition;
    const options = this.state.valueSet ? this.state.valueSet.toArray() : new Array<SparqlBindingValue>();

    const inputValue = this.props.value;
    const selectedValue = FieldValue.isAtomic(inputValue) ? inputValue : undefined;

    const showLinkResourceButton = !this.props.readonlyResource

    const showEditButton = selectedValue !== undefined && !this.props.readonlyResource // this.state.activeForm !== undefined && !this.props.readonlyResource;
    const showCreateNewDropdown = !_.isEmpty(this.state.nestedFormTemplates) && this.state.nestedFormTemplates.length > 1 && !this.state.valueSelectedWithoutEditForm && !selectedValue;
    const showCreateNewButton = !_.isEmpty(this.state.nestedFormTemplates) && this.state.nestedFormTemplates.length === 1 && !this.state.valueSelectedWithoutEditForm && !selectedValue;

    const placeholder =
      typeof this.props.placeholder === 'undefined'
        ? this.createDefaultPlaceholder(definition)
        : this.props.placeholder;

    const dashboard = ConfigHolder.getDashboard()?ConfigHolder.getDashboard().value:"http://www.researchspace.org/resource/ThinkingFrames";

    return (
      <div className={SELECT_TEXT_CLASS} ref={this.htmlElement}>
        <ReactSelect 
          name={definition.id}
          placeholder={placeholder}
          onChange={this.onValueChanged}
          disabled={!this.canEdit()}
          options={options}
          value={selectedValue}
          optionRenderer={this.optionRenderer}
          valueRenderer={this.valueRenderer}
          onOpen={() => {this.props.updateListOnOpen && this.initValueSet()}}
        />
        <ValidationMessages errors={FieldValue.getErrors(this.props.value)} />
        { showCreateNewButton && (
          <Button className={`${SELECT_TEXT_CLASS}__create-button btn-textAndIcon`} onClick={() => this.onDropdownSelectHandler(this.state.nestedFormTemplates[0].label)}>
            <Icon iconType='round' iconName='add'/>
          </Button>
        )}
        { showCreateNewDropdown && (
          <DropdownWithFilter
            id="add-form"
            title=""
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
          <Button className={`${SELECT_TEXT_CLASS}__create-button btn-textAndIcon`} title='Edit' onClick={() => {this.onEditHandler(selectedValue)}}>
            <Icon iconType='rounded' iconName='edit' symbol/>
          </Button>
        }
        {showLinkResourceButton && !FieldValue.isEmpty(this.props.value) && 
            <ResourceLinkContainer 
              uri={dashboard} 
              urlqueryparam-view="resource-editor"
              urlqueryparam-open-as-drag-and-drop="true"
              urlqueryparam-resource={(this.props.value.value as Rdf.Iri).value}
            >
              <Button className={`${SELECT_TEXT_CLASS}__open-in-new-tab`} title='Edit in new draggable tab'>
                <Icon iconType='rounded' iconName='read_more' symbol={true} />
              </Button>
          </ResourceLinkContainer>
        }
          
        {this.state.nestedFormOpen ? (
          <NestedModalForm
            modalId={this.state.modalId}
            subject={
            FieldValue.isEmpty(this.props.value) ? null : this.props.value.value as Rdf.Iri
            }
            title={selectedValue?.label ?? this.state.labelFormSelected}
            definition={this.props.definition}
            onSubmit={this.onNestedFormSubmit}
            onCancel={() => this.setState({ nestedFormOpen: false })}
            parent={this.htmlElement}
            parentIri={this.state.parentIri}
            passValuesFor={this.state.passValuesFor}
          >
            {this.state.nestedForm}
          </NestedModalForm>
        ) : null}
      </div>
    )
  }

  private onNestedFormSubmit = (value: AtomicValue) => {
    if (value) {     
      getResourceConfigurationEditForm(Rdf.iri(value.value.value),this.context).
        then(binding=>{
            if (binding.resourceFormIri) {
              if (binding.scheme)
                this.setState({activeForm: `{{> "${binding.resourceFormIri.value}" nested=true editable=true mode="edit" scheme="${binding.scheme.value}"}}`});
              else  
                this.setState({activeForm: `{{> "${binding.resourceFormIri.value}" nested=true editable=true mode="edit"}}`});
        }});
    } else {
      this.setState({activeForm: undefined, valueSelectedWithoutEditForm: false});
    }
    this.setState({ nestedFormOpen: false});
    this.setAndValidate(value);
    this.initValueSet();
  };

  private createDefaultPlaceholder(definition: FieldDefinition): string {
    const fieldName = (getPreferredLabel(definition.label) || 'entity').toLocaleLowerCase();
    return `Select ${fieldName}`;
  }

  static makeHandler = AtomicValueInput.makeAtomicHandler;
}

SingleValueInput.assertStatic(SelectInput);

export default SelectInput;
