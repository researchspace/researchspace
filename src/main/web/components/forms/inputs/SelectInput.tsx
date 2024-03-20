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
import * as D from 'react-dom-factories';
import ReactSelect from 'react-select';
import * as Immutable from 'immutable';
import * as React from 'react';
import { Button } from 'react-bootstrap';
import * as _ from 'lodash';
import { DropdownButton, MenuItem } from 'react-bootstrap';

import { Cancellation } from 'platform/api/async/Cancellation';
import { Rdf } from 'platform/api/rdf';

import { TemplateItem } from 'platform/components/ui/template';

import { FieldDefinition, getPreferredLabel } from '../FieldDefinition';
import { FieldValue, AtomicValue, EmptyValue, SparqlBindingValue, ErrorKind, DataState } from '../FieldValues';
import { SingleValueInput, AtomicValueInput, AtomicValueInputProps } from './SingleValueInput';
import { ValidationMessages } from './Decorations';
import { queryValues } from '../QueryValues';
import { NestedModalForm, tryExtractNestedForm } from './NestedModalForm';
import Icon from 'platform/components/ui/icon/Icon';
import ResourceLinkContainer from 'platform/api/navigation/components/ResourceLinkContainer';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';

type formData = {
  label?: string,
  nestedForm?: string  
}

export interface SelectInputProps extends AtomicValueInputProps {
  template?: string;
  placeholder?: string;
  nestedFormTemplate?: string;
  showLinkResourceButton?: boolean;
  formsData?: formData[];
}

interface State {
  valueSet?: Immutable.List<SparqlBindingValue>;
  nestedForm?: React.ReactElement<any>;
  nestedFormOpen?: boolean;
  activeForm?: string;
  nestedFormsData?: formData[];
}

const SELECT_TEXT_CLASS = 'select-text-field';
const OPTION_CLASS = SELECT_TEXT_CLASS + 'option';

const SPARQL_QUERY = SparqlUtil.Sparql`
  SELECT DISTINCT ?config ?resourceRestrictionPattern WHERE {
    {
      ?__resourceIri__ (<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>/(<http://www.w3.org/2000/01/rdf-schema#subClassOf>*)) ?resourceOntologyClass.
      ?config <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.researchspace.org/resource/system/resource_configuration>;
        <http://www.researchspace.org/pattern/system/resource_configuration/resource_ontology_class> ?resourceOntologyClass.
      FILTER(NOT EXISTS { ?config <http://www.researchspace.org/pattern/system/resource_configuration/resource_type> ?resourceP2Type. })
      OPTIONAL { ?config <http://www.researchspace.org/pattern/system/resource_configuration/resource_restriction_sparql_pattern> ?resourceRestrictionPattern . }
    }
    UNION
    {
      ?__resourceIri__ <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ?resourceOntologyClass;
        <http://www.cidoc-crm.org/cidoc-crm/P2_has_type> ?resourceP2Type.
      ?config <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.researchspace.org/resource/system/resource_configuration>;
        <http://www.researchspace.org/pattern/system/resource_configuration/resource_ontology_class> ?resourceOntologyClass;
        <http://www.researchspace.org/pattern/system/resource_configuration/resource_type> ?resourceP2Type .
    OPTIONAL { ?config <http://www.researchspace.org/pattern/system/resource_configuration/resource_restriction_sparql_pattern> ?resourceRestrictionPattern . }
    }
  }
`

export class SelectInput extends AtomicValueInput<SelectInputProps, State> {
  private readonly cancellation = new Cancellation();
  private htmlElement = React.createRef<HTMLDivElement>();

  private isLoading = true;

  constructor(props: SelectInputProps, context: any) {
    super(props, context);
    this.state = {
      valueSet: Immutable.List<SparqlBindingValue>(),
      nestedFormOpen: false,
      nestedFormsData: []
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
          this.setState({ valueSet: Immutable.List(valueSet) });
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
    
    if(!_.isEmpty(this.props.formsData)) {
      this.setState({
        nestedFormsData: this.props.formsData
      })
    }
    
    
    if (!_.isEmpty(this.props.nestedFormTemplate)) {
      const nestedForms = [{
        label: 'default',
        nestedForm: this.props.nestedFormTemplate
      }]
      this.setState({
        nestedFormsData: nestedForms
      })
    }
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private onValueChanged = (value?: SparqlBindingValue) => {
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

  private openSelectedNestedForm(formTemplate: string) {
    tryExtractNestedForm(this.props.children, this.context, formTemplate)
      .then(nestedForm => {
        if (nestedForm != undefined) {
         this.setState({nestedForm});
          this.toggleNestedForm()
        }
      });
  }

  private buildResourceFormIriQuery(queryResultBindings: SparqlClient.Bindings, iri: Rdf.Iri) {
    const UNION_QUERY = []
    _.forEach(queryResultBindings, (b) => {
      UNION_QUERY.push(
        `{ 
          BIND(${iri} AS ?item)
            BIND(<${b.config.value}> AS ?config)
            ${b.resourceRestrictionPattern ? b.resourceRestrictionPattern.value : ''}
            ?config <http://www.researchspace.org/pattern/system/resource_configuration/resource_form> ?resourceFormIRI .
        }`
      )
    });

    return `SELECT ?resourceFormIRI WHERE { ${UNION_QUERY.join('UNION')} }`;
  }

  private findAndOpenNestedForm(queryResultBindings: SparqlClient.Bindings, iri: Rdf.Iri) {
    const RESOURCE_FORM_IRI_QUERY = this.buildResourceFormIriQuery(queryResultBindings, iri)
    SparqlClient.select(RESOURCE_FORM_IRI_QUERY, {context: this.context.semanticContext})
    .onValue((fr) => {
      const resourceFormIri = fr.results.bindings[0].resourceFormIRI.value
      this.openSelectedNestedForm(`{{> "${resourceFormIri}" nested=true editable=true mode="new" }}`)      
      })
    .onError((err) => console.error('Error during resource form query execution ',err));
  }

  private onEditHandler(selectedValue: AtomicValue) {
    if(!FieldValue.isEmpty(selectedValue)) {
      const iri = selectedValue.value as Rdf.Iri
      const query = SparqlClient.setBindings(SPARQL_QUERY, { __resourceIri__: iri});
      SparqlClient.select(query, {context: this.context.semanticContext})
        .onValue((r) => this.findAndOpenNestedForm(r.results.bindings, iri))
        .onError((err) => console.error('Error during query execution ',err));
    }
  }

  private onDropdownSelectHandler(label: string) {
    const nestedFormTemplateSelected = this.state.nestedFormsData.filter((e) => e.label === label)[0].nestedForm
    this.openSelectedNestedForm(nestedFormTemplateSelected);
  }

  render() {
    const definition = this.props.definition;
    const options = this.state.valueSet ? this.state.valueSet.toArray() : new Array<SparqlBindingValue>();

    const inputValue = this.props.value;
    const selectedValue = FieldValue.isAtomic(inputValue) ? inputValue : undefined;

    const showLinkResourceButton = this.props.showLinkResourceButton ?? true;

    const showEditButton = selectedValue !== undefined
    const showCreateNewDropdown = !_.isEmpty(this.state.nestedFormsData) && this.state.nestedFormsData.length > 1 && !showEditButton;
    const showCreateNewButton = !_.isEmpty(this.state.nestedFormsData) && this.state.nestedFormsData.length === 1 && !showEditButton;

    const placeholder =
      typeof this.props.placeholder === 'undefined'
        ? this.createDefaultPlaceholder(definition)
        : this.props.placeholder;

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
        />
        <ValidationMessages errors={FieldValue.getErrors(this.props.value)} />
        { showCreateNewButton && (
          <Button className={`${SELECT_TEXT_CLASS}__create-button btn-textAndIcon`} onClick={() => this.onDropdownSelectHandler(this.state.nestedFormsData[0].label)}>
            <Icon iconType='round' iconName='add_box'/>
            <span>New</span>
          </Button>
        )}
        { showCreateNewDropdown && (
          <DropdownButton title="New" id="add-form" onSelect={(label) => this.onDropdownSelectHandler(label)}>
            {this.state.nestedFormsData.map((e) => {
                return (<MenuItem key={e.label} eventKey={e.label}>{e.label}</MenuItem>)
              }
            )}
          </DropdownButton>
        )}
        { showEditButton && 
          <Button className={`${SELECT_TEXT_CLASS}__create-button btn-textAndIcon`} onClick={() => {this.onEditHandler(selectedValue)}}>
            <Icon iconType='round' iconName='edit'/>
            <span>Edit</span>
          </Button>
        }
        {showLinkResourceButton && !FieldValue.isEmpty(this.props.value) && 
            <ResourceLinkContainer 
              uri="http://www.researchspace.org/resource/ThinkingFrames" 
              urlqueryparam-view="entity-editor"
              urlqueryparam-resource={(this.props.value.value as Rdf.Iri).value}
            >
              <Button className={`${SELECT_TEXT_CLASS}__open-in-new-tab`} title='Open in new tab'>
                <Icon iconType='round' iconName='open_in_new' />
              </Button>
          </ResourceLinkContainer>
        }
          
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
    )
  }

  private onNestedFormSubmit = (value: AtomicValue) => {
    this.setState({ nestedFormOpen: false });
    this.setAndValidate(value);
    this.initValueSet();
  };

  private createDefaultPlaceholder(definition: FieldDefinition): string {
    const fieldName = (getPreferredLabel(definition.label) || 'entity').toLocaleLowerCase();
    return `Select ${fieldName} here...`;
  }

  static makeHandler = AtomicValueInput.makeAtomicHandler;
}

SingleValueInput.assertStatic(SelectInput);

export default SelectInput;
